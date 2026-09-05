import type { PrismaClient, Product } from "@prisma/client";
import { PRODUCTS, FIRST_NAMES, LAST_NAMES, CAMPAIGN_TEMPLATES } from "./seedData";
import { scoreOpportunity } from "./agent/opportunityScoring";

// Deterministic PRNG (mulberry32) so the demo dataset is identical every run.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Resets and re-seeds the full demo dataset: merchant/policy, 50 products,
 * affinities, 100 customers, 500 orders, abandoned carts, campaigns, AI
 * opportunities, and audit history. Deterministic — same data every run.
 * Shared by the CLI seed script (prisma/seed.ts) and the Settings "Reset
 * Demo Data" button (/api/demo/reset). */
export async function runSeed(db: PrismaClient) {
  const rng = mulberry32(42);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
  const int = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
  const daysAgo = (n: number, hour = int(8, 21)) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(hour, int(0, 59), int(0, 59), 0);
    return d;
  };

  console.log("Resetting existing data...");
  await db.aiAction.deleteMany();
  await db.buyerSession.deleteMany();
  await db.payment.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.cartItem.deleteMany();
  await db.cart.deleteMany();
  await db.aiOpportunity.deleteMany();
  await db.campaign.deleteMany();
  await db.productAffinity.deleteMany();
  await db.customer.deleteMany();
  await db.product.deleteMany();
  await db.policyConfig.deleteMany();
  await db.merchant.deleteMany();

  console.log("Creating merchant + policy...");
  const merchant = await db.merchant.create({
    data: { name: "StrideX Sports", policy: { create: {} } },
  });

  console.log("Creating products...");
  const products: Product[] = [];
  for (const p of PRODUCTS) {
    products.push(await db.product.create({ data: p }));
  }
  const byCategory = (cat: string) => products.filter((p) => p.category === cat);
  const byId = (sku: string) => products.find((p) => p.sku === sku)!;

  console.log("Creating product affinities...");
  const affinityRules: { from: string[]; to: string[]; base: number }[] = [
    { from: byCategory("Running Shoes").map((p) => p.id), to: byCategory("Sports Socks").map((p) => p.id), base: 38 },
    { from: byCategory("Running Shoes").map((p) => p.id), to: byCategory("Water Bottles").map((p) => p.id), base: 26 },
    { from: byCategory("Running Shoes").map((p) => p.id), to: byCategory("Running Shorts").map((p) => p.id), base: 18 },
    { from: byCategory("Running Shoes").map((p) => p.id), to: byCategory("Insoles").map((p) => p.id), base: 22 },
    { from: byCategory("Running Shoes").map((p) => p.id), to: byCategory("Recovery").map((p) => p.id), base: 14 },
    { from: byCategory("Training Shoes").map((p) => p.id), to: byCategory("Sports Socks").map((p) => p.id), base: 30 },
    { from: byCategory("Training Shoes").map((p) => p.id), to: byCategory("Gym Bags").map((p) => p.id), base: 20 },
    { from: byCategory("Training Shoes").map((p) => p.id), to: byCategory("Water Bottles").map((p) => p.id), base: 24 },
    { from: byCategory("Fitness Watches").map((p) => p.id), to: byCategory("Recovery").map((p) => p.id), base: 16 },
    { from: byCategory("Sports T-Shirts").map((p) => p.id), to: byCategory("Running Shorts").map((p) => p.id), base: 19 },
  ];

  for (const rule of affinityRules) {
    for (const fromId of rule.from) {
      const targets = rule.to.slice(0, int(2, 3));
      for (const toId of targets) {
        const target = products.find((p) => p.id === toId)!;
        const rate = Math.min(85, Math.max(8, rule.base + int(-8, 8)));
        await db.productAffinity.create({
          data: {
            fromProductId: fromId,
            toProductId: toId,
            attachRatePct: rate,
            avgAdditionalRevenueInr: target.priceInr,
            purchaseFrequency: int(20, 130),
          },
        });
      }
    }
  }

  // Flagship, hand-tuned affinity that anchors the AI Revenue Brief demo:
  // "72% of ProRun X1 buyers also buy Performance Socks within 7 days."
  const proRunX1 = byId("RS-001");
  const perfSocks = byId("SO-001");
  await db.productAffinity.upsert({
    where: { fromProductId_toProductId: { fromProductId: proRunX1.id, toProductId: perfSocks.id } },
    update: { attachRatePct: 72, avgAdditionalRevenueInr: perfSocks.priceInr, purchaseFrequency: 96 },
    create: {
      fromProductId: proRunX1.id,
      toProductId: perfSocks.id,
      attachRatePct: 72,
      avgAdditionalRevenueInr: perfSocks.priceInr,
      purchaseFrequency: 96,
    },
  });

  console.log("Creating customers...");
  const segments: { name: string; count: number }[] = [
    { name: "high-value", count: 15 },
    { name: "repeat", count: 35 },
    { name: "new", count: 50 },
  ];
  const customers = [];
  let ci = 0;
  for (const seg of segments) {
    for (let i = 0; i < seg.count; i++) {
      const first = FIRST_NAMES[ci % FIRST_NAMES.length];
      const last = LAST_NAMES[(ci * 7) % LAST_NAMES.length];
      ci++;
      customers.push(
        await db.customer.create({
          data: {
            name: `${first} ${last}`,
            email: `${first.toLowerCase()}.${last.toLowerCase()}${ci}@example.com`,
            phone: `9${int(100000000, 999999999)}`,
            segment: seg.name,
          },
        })
      );
    }
  }

  const weightedProduct = () => {
    // Bias toward shoes + apparel, like a real sports storefront.
    const r = rng();
    if (r < 0.35) return pick(byCategory("Running Shoes"));
    if (r < 0.5) return pick(byCategory("Training Shoes"));
    if (r < 0.62) return pick(byCategory("Sports T-Shirts"));
    if (r < 0.72) return pick(byCategory("Sports Socks"));
    if (r < 0.8) return pick(byCategory("Running Shorts"));
    if (r < 0.87) return pick(byCategory("Fitness Watches"));
    if (r < 0.93) return pick(byCategory("Water Bottles"));
    if (r < 0.97) return pick(byCategory("Gym Bags"));
    return pick([...byCategory("Insoles"), ...byCategory("Recovery")]);
  };

  console.log("Creating 500 orders...");
  const TOTAL_ORDERS = 500;
  const AI_ATTRIBUTED_TARGET = 143;
  let aiAttributedCount = 0;
  const customerOrderCounts = new Map<string, { orders: number; spend: number }>();

  for (let i = 0; i < TOTAL_ORDERS; i++) {
    // Higher-segment customers place more of the recent order volume.
    const segRoll = rng();
    const segment = segRoll < 0.35 ? "high-value" : segRoll < 0.75 ? "repeat" : "new";
    const pool = customers.filter((c) => c.segment === segment);
    const customer = pick(pool.length ? pool : customers);

    const primary = weightedProduct();
    const items: { productId: string; quantity: number; unitPriceInr: number; isAiCrossSell: boolean }[] = [
      { productId: primary.id, quantity: 1, unitPriceInr: primary.priceInr, isAiCrossSell: false },
    ];

    const affinity = await db.productAffinity.findFirst({
      where: { fromProductId: primary.id },
      orderBy: { attachRatePct: "desc" },
      include: { toProduct: true },
    });
    const shouldAttach = affinity && rng() * 100 < affinity.attachRatePct;
    const isAiOrder = i < AI_ATTRIBUTED_TARGET && rng() < 0.85;
    if (shouldAttach && affinity) {
      items.push({
        productId: affinity.toProductId,
        quantity: 1,
        unitPriceInr: affinity.toProduct.priceInr,
        isAiCrossSell: isAiOrder,
      });
    }

    const subtotalInr = items.reduce((s, it) => s + it.unitPriceInr * it.quantity, 0);
    const discountPct = isAiOrder && rng() < 0.4 ? pick([5, 8, 10]) : 0;
    const discountInr = Math.round((subtotalInr * discountPct) / 100);
    const totalInr = subtotalInr - discountInr;
    const created = daysAgo(int(0, 119));
    const status = rng() < 0.04 ? "CANCELLED" : "CONFIRMED";
    const channel = isAiOrder && rng() < 0.5 ? "ai_commerce" : "web";
    if (isAiOrder) aiAttributedCount++;

    const order = await db.order.create({
      data: {
        idempotencyKey: `seed-order-${i}`,
        customerId: customer.id,
        subtotalInr,
        discountInr,
        totalInr,
        status,
        aiAttributed: isAiOrder,
        channel,
        createdAt: created,
        items: { create: items },
      },
    });

    if (status === "CONFIRMED") {
      const failFirst = rng() < 0.05;
      if (failFirst) {
        await db.payment.create({
          data: {
            idempotencyKey: `${order.id}:attempt:1`,
            orderId: order.id,
            amountInr: totalInr,
            status: "PAYMENT_FAILED",
            attemptNumber: 1,
            mode: "SIMULATED",
            failureReason: "Test payment was declined by the issuing bank (simulated).",
            createdAt: created,
          },
        });
        await db.payment.create({
          data: {
            idempotencyKey: `${order.id}:attempt:2`,
            orderId: order.id,
            amountInr: totalInr,
            status: "PAID",
            attemptNumber: 2,
            mode: "SIMULATED",
            razorpayPaymentId: `sim_pay_seed_${i}`,
            createdAt: created,
          },
        });
      } else {
        await db.payment.create({
          data: {
            idempotencyKey: `${order.id}:attempt:1`,
            orderId: order.id,
            amountInr: totalInr,
            status: "PAID",
            attemptNumber: 1,
            mode: "SIMULATED",
            razorpayPaymentId: `sim_pay_seed_${i}`,
            createdAt: created,
          },
        });
      }
    }

    const agg = customerOrderCounts.get(customer.id) ?? { orders: 0, spend: 0 };
    if (status === "CONFIRMED") {
      agg.orders += 1;
      agg.spend += totalInr;
    }
    customerOrderCounts.set(customer.id, agg);
  }

  console.log(`AI-attributed orders created: ${aiAttributedCount}`);

  console.log("Updating customer aggregates...");
  for (const [customerId, agg] of customerOrderCounts.entries()) {
    await db.customer.update({
      where: { id: customerId },
      data: { totalOrders: agg.orders, totalSpendInr: agg.spend },
    });
  }

  console.log("Creating 20 abandoned carts...");
  for (let i = 0; i < 20; i++) {
    const customer = pick(customers);
    const p1 = weightedProduct();
    const cart = await db.cart.create({
      data: {
        customerId: customer.id,
        status: "ABANDONED",
        source: rng() < 0.2 ? "ai_commerce" : "web",
        createdAt: daysAgo(int(1, 13)),
        items: { create: [{ productId: p1.id, quantity: 1 }] },
      },
    });
    if (rng() < 0.4) {
      const p2 = weightedProduct();
      await db.cartItem.create({ data: { cartId: cart.id, productId: p2.id, quantity: 1 } });
    }
  }

  console.log("Creating campaigns...");
  for (const c of CAMPAIGN_TEMPLATES) {
    await db.campaign.create({ data: c });
  }

  console.log("Creating AI opportunities...");
  const fwGps = byId("FW-002");

  // Every opportunity below carries a real product/segment reference — no
  // bare flavor numbers. expectedRevenueInr, confidencePct, and reasoning are
  // all computed by scoreOpportunity() from live data right after creation,
  // using the exact same formulas the running app recomputes on every fetch
  // (see src/lib/agent/opportunityScoring.ts). Changing suggestedOfferPct
  // here is the only "editorial" lever — everything else is derived.
  const opportunityDefs: {
    type: string;
    title: string;
    segment: string;
    productId: string | null;
    relatedProductId: string | null;
    suggestedOfferPct: number;
    preResolved?: boolean;
  }[] = [
    // --- headline opportunities (shown on Overview) ---
    {
      type: "CROSS_SELL",
      title: "Cross-sell Performance Socks with ProRun X1",
      segment: "Customers purchasing StrideX ProRun X1",
      productId: proRunX1.id,
      relatedProductId: perfSocks.id,
      suggestedOfferPct: 10,
    },
    {
      type: "CART_RECOVERY",
      title: "Recover abandoned carts with a limited incentive",
      segment: "Abandoned carts (last 14 days)",
      productId: null,
      relatedProductId: null,
      suggestedOfferPct: 8,
    },
    {
      type: "UPSELL_SEGMENT",
      title: "Upsell high-value customers to StrideX Pulse GPS",
      segment: "high-value customers",
      productId: fwGps.id,
      relatedProductId: null,
      suggestedOfferPct: 0,
    },
    {
      type: "INVENTORY_CAMPAIGN",
      title: "Low-stock campaign optimization — Trail running shoes",
      segment: "Trail running interest segment",
      productId: byId("RS-003").id,
      relatedProductId: null,
      suggestedOfferPct: 5,
    },
    // --- additional opportunities (Grow Revenue page) ---
    { type: "CROSS_SELL", title: "Cross-sell Insoles with AirLite purchases", segment: "AirLite purchasers", productId: byId("RS-004").id, relatedProductId: byId("IN-001").id, suggestedOfferPct: 8, preResolved: true },
    { type: "CROSS_SELL", title: "Cross-sell Water Bottle with CrossTrain Pro", segment: "CrossTrain Pro purchasers", productId: byId("TS-001").id, relatedProductId: byId("WB-002").id, suggestedOfferPct: 8, preResolved: true },
    { type: "UPSELL_SEGMENT", title: "Promote CoolMax Tee to high-value customers", segment: "high-value customers", productId: byId("TSH-002").id, relatedProductId: null, suggestedOfferPct: 0, preResolved: true },
    { type: "CROSS_SELL", title: "Cross-sell Gym Bag with FlexGrip purchases", segment: "FlexGrip purchasers", productId: byId("TS-002").id, relatedProductId: byId("GB-001").id, suggestedOfferPct: 6 },
    { type: "CART_RECOVERY", title: "Re-engage carts abandoned in the last 7 days", segment: "Abandoned carts (last 7 days)", productId: null, relatedProductId: null, suggestedOfferPct: 6 },
    { type: "INVENTORY_CAMPAIGN", title: "Low-stock alert — StrideX Weekender 50L", segment: "Travel-tagged customers", productId: byId("GB-005").id, relatedProductId: null, suggestedOfferPct: 5 },
    { type: "UPSELL_SEGMENT", title: "Recommend Compression Sleeves to repeat customers", segment: "repeat customers", productId: byId("RC-003").id, relatedProductId: null, suggestedOfferPct: 0 },
    { type: "CROSS_SELL", title: "Cross-sell Recovery Gel Insoles with NightRunner", segment: "NightRunner purchasers", productId: byId("RS-005").id, relatedProductId: byId("IN-003").id, suggestedOfferPct: 8 },
    { type: "INVENTORY_CAMPAIGN", title: "Surplus clearance — StrideX Band Fit", segment: "Budget-conscious segment", productId: byId("FW-004").id, relatedProductId: null, suggestedOfferPct: 10 },
    { type: "UPSELL_SEGMENT", title: "Offer Massage Gun Mini to high-frequency runners", segment: "5+ orders in 90 days", productId: byId("RC-002").id, relatedProductId: null, suggestedOfferPct: 0 },
    { type: "CROSS_SELL", title: "Cross-sell Running Shorts with DriFit Tee", segment: "DriFit Tee purchasers", productId: byId("TSH-001").id, relatedProductId: byId("SH-001").id, suggestedOfferPct: 6 },
    { type: "CART_RECOVERY", title: "Recover high-value abandoned carts (>₹3,000)", segment: "Abandoned carts >₹3,000", productId: null, relatedProductId: null, suggestedOfferPct: 10 },
    { type: "UPSELL_SEGMENT", title: "Recommend Arch Support Insoles to repeat buyers", segment: "repeat customers", productId: byId("IN-002").id, relatedProductId: null, suggestedOfferPct: 0 },
  ];

  for (const def of opportunityDefs) {
    const product = def.productId ? products.find((p) => p.id === def.productId) : null;
    const created = await db.aiOpportunity.create({
      data: {
        type: def.type,
        title: def.title,
        segment: def.segment,
        reasoning: "",
        productId: def.productId,
        relatedProductId: def.relatedProductId,
        currentPriceInr: product?.priceInr ?? null,
        suggestedOfferPct: def.suggestedOfferPct,
        expectedRevenueInr: 0,
        confidencePct: 50,
        status: def.preResolved ? pick(["APPROVED", "REJECTED"]) : "PENDING",
        resolvedAt: def.preResolved ? daysAgo(int(1, 5)) : null,
      },
    });
    const score = await scoreOpportunity(db, created);
    await db.aiOpportunity.update({
      where: { id: created.id },
      data: {
        expectedRevenueInr: score.expectedRevenueInr,
        confidencePct: score.confidencePct,
        reasoning: score.reasoning,
      },
    });
  }

  console.log("Creating AI action audit history...");
  const readActions = ["search_products", "get_product", "check_inventory", "get_customer", "get_order_history", "get_product_affinities"];
  for (let d = 13; d >= 1; d--) {
    const countToday = int(15, 35);
    for (let i = 0; i < countToday; i++) {
      await db.aiAction.create({
        data: {
          actor: "AI",
          action: pick(readActions),
          toolCategory: "READ",
          timestamp: daysAgo(d),
          outcome: "SUCCESS",
        },
      });
    }
  }

  const todayActionSpecs: { toolCategory: "WRITE" | "MONEY"; outcome: "SUCCESS" | "FAILED" | "BLOCKED"; approvalStatus: string; policyResult: string; action: string; amountInr?: number; reason?: string }[] = [];
  // Only ~3 of these are tagged "create_order" (the action the daily-spend
  // cap actually sums) and kept small, so a live demo session still has
  // headroom under the ₹25,000 cap. The rest populate WRITE/MONEY activity
  // for the Trust Center counts without competing for that budget.
  for (let i = 0; i < 39; i++) {
    const isSpendCounted = i % 13 === 0; // 3 of 39
    todayActionSpecs.push({
      toolCategory: i % 3 === 0 ? "MONEY" : "WRITE",
      outcome: "SUCCESS",
      approvalStatus: "APPROVED",
      policyResult: "PASSED",
      action: isSpendCounted ? "create_order" : pick(["apply_discount", "create_cart", "initiate_payment"]),
      amountInr: isSpendCounted ? int(500, 1500) : int(400, 6000),
    });
  }
  for (let i = 0; i < 4; i++) {
    todayActionSpecs.push({
      toolCategory: "MONEY",
      outcome: "BLOCKED",
      approvalStatus: "REJECTED",
      policyResult: "BLOCKED",
      action: "create_order",
      amountInr: int(11000, 17000),
      reason: "Transaction exceeds merchant's AI spending policy.",
    });
  }
  todayActionSpecs.push({
    toolCategory: "MONEY",
    outcome: "BLOCKED",
    approvalStatus: "REJECTED",
    policyResult: "BLOCKED",
    action: "create_order",
    amountInr: byId("FW-003").priceInr,
    reason: "Transaction exceeds merchant's AI spending policy (limit ₹10,000).",
  });
  for (let i = 0; i < 3; i++) {
    todayActionSpecs.push({
      toolCategory: "MONEY",
      outcome: "SUCCESS",
      approvalStatus: "PENDING",
      policyResult: "PASSED",
      action: "request_payment_approval",
      amountInr: int(2000, 9000),
    });
  }
  todayActionSpecs.push({
    toolCategory: "MONEY",
    outcome: "FAILED",
    approvalStatus: "APPROVED",
    policyResult: "PASSED",
    action: "initiate_payment",
    amountInr: int(2000, 6000),
    reason: "Test payment was declined by the issuing bank (simulated).",
  });

  for (const spec of todayActionSpecs) {
    await db.aiAction.create({
      data: {
        actor: "AI",
        action: spec.action,
        toolCategory: spec.toolCategory,
        timestamp: daysAgo(0),
        amountInr: spec.amountInr,
        reason: spec.reason,
        policyResult: spec.policyResult,
        approvalRequired: true,
        approvalStatus: spec.approvalStatus,
        outcome: spec.outcome,
      },
    });
  }
  for (let i = 0; i < 40; i++) {
    await db.aiAction.create({
      data: { actor: "AI", action: pick(readActions), toolCategory: "READ", timestamp: daysAgo(0), outcome: "SUCCESS" },
    });
  }

  console.log("Seed complete.");
  return {
    merchant: merchant.name,
    products: products.length,
    customers: customers.length,
    orders: TOTAL_ORDERS,
  };
}
