import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createOrder } from "@/lib/agent/tools";
import { logAction } from "@/lib/audit";
import { scoreOpportunity, parseCartFilters } from "@/lib/agent/opportunityScoring";

async function pickCustomerForSegment(segment: string) {
  const seg = segment.toLowerCase();
  if (seg.includes("high-value")) {
    const c = await db.customer.findFirst({ where: { segment: "high-value" }, orderBy: { totalSpendInr: "desc" } });
    if (c) return c;
  }
  if (seg.includes("repeat")) {
    const c = await db.customer.findFirst({ where: { segment: "repeat" } });
    if (c) return c;
  }
  const any = await db.customer.findFirst({ orderBy: { totalSpendInr: "desc" } });
  return any!;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { action } = await req.json();
  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const opportunity = await db.aiOpportunity.findUnique({ where: { id } });
  if (!opportunity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (opportunity.status !== "PENDING") {
    return NextResponse.json({ error: "Opportunity already resolved" }, { status: 409 });
  }

  if (action === "reject") {
    const updated = await db.aiOpportunity.update({
      where: { id },
      data: { status: "REJECTED", resolvedAt: new Date() },
    });
    await logAction({
      actor: "MERCHANT",
      action: "reject_opportunity",
      toolCategory: "WRITE",
      entityType: "AiOpportunity",
      entityId: id,
      reason: opportunity.title,
      outcome: "SUCCESS",
    });
    return NextResponse.json({ opportunity: updated });
  }

  // approve: execute a real, policy-gated order that realizes this opportunity.
  let orderItems: { productId: string; quantity: number; unitPriceInr: number; isAiCrossSell?: boolean }[] = [];
  let customerId: string;

  if (opportunity.type === "CART_RECOVERY") {
    // Respect this specific opportunity's filter (e.g. ">₹3,000" or "last 7
    // days") rather than grabbing any abandoned cart — different
    // cart-recovery opportunities target different cohorts.
    const filters = parseCartFilters(opportunity.segment);
    const since = filters.withinDays ? new Date(Date.now() - filters.withinDays * 86400000) : undefined;
    const candidateCarts = await db.cart.findMany({
      where: { status: "ABANDONED", customerId: { not: null }, ...(since ? { createdAt: { gte: since } } : {}) },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
    const cart = candidateCarts.find((c) => {
      if (filters.minValueInr === undefined) return true;
      const value = c.items.reduce((s, i) => s + i.product.priceInr * i.quantity, 0);
      return value > filters.minValueInr!;
    });
    if (!cart || !cart.customerId) {
      return NextResponse.json({ error: "No abandoned cart matches this opportunity's segment right now" }, { status: 409 });
    }
    customerId = cart.customerId;
    orderItems = cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPriceInr: i.product.priceInr }));
    await db.cart.update({ where: { id: cart.id }, data: { status: "RECOVERED" } });
  } else {
    const customer = await pickCustomerForSegment(opportunity.segment);
    customerId = customer.id;
    const ids = [opportunity.productId, opportunity.relatedProductId].filter(Boolean) as string[];
    const products = ids.length ? await db.product.findMany({ where: { id: { in: ids } } }) : [];
    if (products.length === 0) {
      return NextResponse.json({ error: "Opportunity has no linked product to execute" }, { status: 409 });
    }
    orderItems = products.map((p) => ({ productId: p.id, quantity: 1, unitPriceInr: p.priceInr, isAiCrossSell: p.id === opportunity.relatedProductId }));
  }

  const result = await createOrder({
    customerId,
    items: orderItems,
    discountPct: opportunity.suggestedOfferPct ?? 0,
    channel: "web",
    aiAttributed: true,
    aiOpportunityId: id,
    idempotencyKey: `opportunity:${id}`,
  });

  if (!result.ok) {
    return NextResponse.json({ blocked: true, blockedReason: result.blockedReason, policyChecks: result.policyChecks }, { status: 200 });
  }

  const updated = await db.aiOpportunity.update({
    where: { id },
    data: { status: "APPROVED", resolvedAt: new Date() },
  });

  // Log the impact as it was scored right before execution, not whatever
  // stale number was last written to the row.
  const scoreAtApproval = await scoreOpportunity(db, opportunity);
  await logAction({
    actor: "MERCHANT",
    action: "approve_opportunity",
    toolCategory: "WRITE",
    entityType: "AiOpportunity",
    entityId: id,
    amountInr: result.data?.totalInr,
    expectedImpactInr: scoreAtApproval.expectedRevenueInr,
    reason: opportunity.title,
    outcome: "SUCCESS",
  });

  return NextResponse.json({ opportunity: updated, orderId: result.data?.orderId, totalInr: result.data?.totalInr });
}
