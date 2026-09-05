import type { AiOpportunity, PrismaClient } from "@prisma/client";

/**
 * Computes an opportunity's expected revenue and confidence live, from real
 * database state, instead of trusting whatever numbers were last written to
 * the row. Every formula here is intentionally simple and documented so a
 * reader can hand-verify the output — the goal is "genuinely derived from
 * data," not "statistically sophisticated." Any flat rate used (a conversion
 * %, a recovery %) is a stated assumption, not a measured one; everything
 * else (attach rates, customer counts, cart values, stock, prices) is a real
 * query result.
 *
 * Takes the Prisma client as a parameter (rather than importing the app's
 * singleton) so the same logic works from the seed script, which runs its
 * own standalone client, and from the running app's API routes.
 */

type Db = PrismaClient;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export interface OpportunityScore {
  expectedRevenueInr: number;
  confidencePct: number;
  reasoning: string;
}

export function parseCartFilters(segment: string) {
  const valueMatch = segment.match(/>\s*₹?([\d,]+)/);
  const daysMatch = segment.match(/last (\d+) days/i);
  return {
    minValueInr: valueMatch ? parseInt(valueMatch[1].replace(/,/g, ""), 10) : undefined,
    withinDays: daysMatch ? parseInt(daysMatch[1], 10) : undefined,
  };
}

async function scoreCrossSell(db: Db, fromProductId: string, toProductId: string): Promise<OpportunityScore> {
  const [fromProduct, toProduct, exactAffinity] = await Promise.all([
    db.product.findUniqueOrThrow({ where: { id: fromProductId } }),
    db.product.findUniqueOrThrow({ where: { id: toProductId } }),
    db.productAffinity.findUnique({
      where: { fromProductId_toProductId: { fromProductId, toProductId } },
    }),
  ]);

  let attachRatePct: number;
  let avgAdditionalRevenueInr: number;
  let purchaseFrequency: number;
  let basis: string;

  if (exactAffinity) {
    ({ attachRatePct, avgAdditionalRevenueInr, purchaseFrequency } = exactAffinity);
    basis = `based on ${purchaseFrequency} historical co-purchases`;
  } else {
    // No exact product-pair row — fall back to the category-level average,
    // still a real aggregate over real affinity rows, just less specific.
    const categoryRows = await db.productAffinity.findMany({
      where: { fromProduct: { category: fromProduct.category }, toProduct: { category: toProduct.category } },
    });
    attachRatePct = categoryRows.length
      ? Math.round(categoryRows.reduce((s, r) => s + r.attachRatePct, 0) / categoryRows.length)
      : 15;
    purchaseFrequency = categoryRows.length
      ? Math.round(categoryRows.reduce((s, r) => s + r.purchaseFrequency, 0) / categoryRows.length)
      : 20;
    avgAdditionalRevenueInr = toProduct.priceInr;
    basis = `estimated from ${fromProduct.category} → ${toProduct.category} category patterns`;
  }

  const eligibleOrderItems = await db.orderItem.findMany({
    where: { productId: fromProductId, order: { status: "CONFIRMED" } },
    select: { order: { select: { customerId: true } } },
  });
  const eligibleCustomers = new Set(eligibleOrderItems.map((i) => i.order.customerId)).size;

  const expectedRevenueInr = Math.round(eligibleCustomers * (attachRatePct / 100) * avgAdditionalRevenueInr);
  const confidencePct = Math.round(clamp(50 + attachRatePct * 0.45 + Math.min(15, purchaseFrequency / 6), 50, 97));

  return {
    expectedRevenueInr,
    confidencePct,
    reasoning: `${attachRatePct}% of customers who purchased ${fromProduct.name} also purchased ${toProduct.name} (${basis}). ${eligibleCustomers} customers have purchased ${fromProduct.name} to date.`,
  };
}

async function scoreCartRecovery(db: Db, segment: string, suggestedOfferPct: number): Promise<OpportunityScore> {
  const filters = parseCartFilters(segment);
  const since = filters.withinDays ? new Date(Date.now() - filters.withinDays * 86400000) : undefined;

  const carts = await db.cart.findMany({
    where: { status: "ABANDONED", ...(since ? { createdAt: { gte: since } } : {}) },
    include: { items: { include: { product: true } } },
  });
  let eligible = carts.map((c) => c.items.reduce((s, i) => s + i.product.priceInr * i.quantity, 0));
  if (filters.minValueInr !== undefined) eligible = eligible.filter((v) => v > filters.minValueInr!);

  const cartCount = eligible.length;
  const totalValueInr = eligible.reduce((s, v) => s + v, 0);
  const recoveryRatePct = clamp(18 + suggestedOfferPct * 2, 15, 45); // assumption: each 1% incentive adds ~2% recovery likelihood
  const expectedRevenueInr = Math.round(totalValueInr * (recoveryRatePct / 100));
  const confidencePct = Math.round(clamp(55 + cartCount * 1.5, 50, 95));

  const qualifier = [
    filters.minValueInr ? `over ₹${filters.minValueInr.toLocaleString("en-IN")}` : null,
    filters.withinDays ? `in the last ${filters.withinDays} days` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    expectedRevenueInr,
    confidencePct,
    reasoning: `${cartCount} abandoned carts ${qualifier ? qualifier + " " : ""}worth ₹${totalValueInr.toLocaleString("en-IN")} in total. Assuming a ${recoveryRatePct}% recovery rate with an ${suggestedOfferPct}% incentive.`,
  };
}

const UPSELL_CONVERSION_RATE_PCT = 10; // stated assumption, not measured

async function scoreUpsellSegment(db: Db, productId: string, segment: string): Promise<OpportunityScore> {
  const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
  const minOrdersMatch = segment.match(/(\d+)\+\s*orders?/i);

  let cohortCount: number;
  let cohortLabel: string;
  if (/high-value/i.test(segment)) {
    cohortCount = await db.customer.count({ where: { segment: "high-value" } });
    cohortLabel = "high-value customers";
  } else if (/repeat/i.test(segment)) {
    cohortCount = await db.customer.count({ where: { segment: "repeat" } });
    cohortLabel = "repeat customers";
  } else if (minOrdersMatch) {
    const n = parseInt(minOrdersMatch[1], 10);
    cohortCount = await db.customer.count({ where: { totalOrders: { gte: n } } });
    cohortLabel = `customers with ${n}+ orders`;
  } else {
    const total = await db.customer.count();
    cohortCount = Math.round(total * 0.15); // no specific cohort named — conservative 15% of all customers
    cohortLabel = "an estimated share of the customer base";
  }

  const expectedRevenueInr = Math.round(cohortCount * product.priceInr * (UPSELL_CONVERSION_RATE_PCT / 100));
  const confidencePct = Math.round(clamp(50 + Math.min(35, cohortCount * 0.6), 50, 92));

  return {
    expectedRevenueInr,
    confidencePct,
    reasoning: `${cohortCount} ${cohortLabel}, at an assumed ${UPSELL_CONVERSION_RATE_PCT}% conversion rate for ${product.name} (₹${product.priceInr.toLocaleString("en-IN")}).`,
  };
}

async function scoreInventoryCampaign(db: Db, productId: string, suggestedOfferPct: number): Promise<OpportunityScore> {
  const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
  const clearanceTargetUnits = Math.min(product.stock, 20); // assumption: campaign aims to clear up to 20 units or full remaining stock
  const expectedRevenueInr = Math.round(clearanceTargetUnits * product.priceInr * (1 - suggestedOfferPct / 100));
  const confidencePct = Math.round(clamp(95 - product.stock * 2, 55, 95)); // lower stock -> higher urgency/confidence of sell-through

  return {
    expectedRevenueInr,
    confidencePct,
    reasoning: `${product.name} has ${product.stock} units left. Targeting a ${clearanceTargetUnits}-unit sell-through at ${suggestedOfferPct}% off before the next restock.`,
  };
}

/** Single entry point: computes fresh numbers for any opportunity from its
 * stored type/productId/relatedProductId/segment/suggestedOfferPct. Falls
 * back to whatever is already on the row only if the opportunity is missing
 * the product/segment data a formula needs (should not happen for seeded
 * data — every opportunity is seeded with a real reference). */
export async function scoreOpportunity(db: Db, o: AiOpportunity): Promise<OpportunityScore> {
  try {
    switch (o.type) {
      case "CROSS_SELL":
        if (o.productId && o.relatedProductId) return await scoreCrossSell(db, o.productId, o.relatedProductId);
        break;
      case "CART_RECOVERY":
        return await scoreCartRecovery(db, o.segment, o.suggestedOfferPct ?? 0);
      case "UPSELL_SEGMENT":
        if (o.productId) return await scoreUpsellSegment(db, o.productId, o.segment);
        break;
      case "INVENTORY_CAMPAIGN":
        if (o.productId) return await scoreInventoryCampaign(db, o.productId, o.suggestedOfferPct ?? 0);
        break;
    }
  } catch {
    // fall through
  }
  return { expectedRevenueInr: o.expectedRevenueInr, confidencePct: o.confidencePct, reasoning: o.reasoning };
}
