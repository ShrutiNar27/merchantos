import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const confirmedOrders = await db.order.findMany({
    where: { status: "CONFIRMED" },
    include: { items: true },
  });

  const aiOrders = confirmedOrders.filter((o) => o.aiAttributed);
  const nonAiOrders = confirmedOrders.filter((o) => !o.aiAttributed);

  const baselineRevenueInr = nonAiOrders.reduce((s, o) => s + o.totalInr, 0);
  const aiAssistedRevenueInr = aiOrders.reduce((s, o) => s + o.totalInr, 0);

  const crossSellItemRevenueInr = confirmedOrders
    .flatMap((o) => o.items)
    .filter((i) => i.isAiCrossSell)
    .reduce((s, i) => s + i.unitPriceInr * i.quantity, 0);

  const approvedImpact = await db.aiAction.aggregate({
    where: { action: { in: ["approve_opportunity", "approve_campaign"] }, outcome: "SUCCESS" },
    _sum: { expectedImpactInr: true },
  });
  const incrementalRevenueInr = crossSellItemRevenueInr + (approvedImpact._sum.expectedImpactInr ?? 0);

  const [crossSellOpps, upsellOpps, carts] = await Promise.all([
    db.aiOpportunity.findMany({ where: { type: "CROSS_SELL" } }),
    db.aiOpportunity.findMany({ where: { type: "UPSELL_SEGMENT" } }),
    db.cart.findMany({ where: { status: { in: ["ABANDONED", "RECOVERED"] } } }),
  ]);

  const rate = (items: { status: string }[], target: string) =>
    items.length ? (items.filter((i) => i.status === target).length / items.length) * 100 : 0;

  const crossSellConversionPct = rate(crossSellOpps, "APPROVED");
  const upsellConversionPct = rate(upsellOpps, "APPROVED");
  const recoveredCarts = carts.filter((c) => c.status === "RECOVERED").length;
  const cartRecoveryPct = carts.length ? (recoveredCarts / carts.length) * 100 : 0;

  const ordersWithCrossSell = confirmedOrders.filter((o) => o.items.some((i) => i.isAiCrossSell));
  const avgAiOrderUpliftInr = ordersWithCrossSell.length
    ? ordersWithCrossSell.reduce((s, o) => s + o.items.filter((i) => i.isAiCrossSell).reduce((ss, i) => ss + i.unitPriceInr * i.quantity, 0), 0) /
      ordersWithCrossSell.length
    : 0;

  return NextResponse.json({
    baselineRevenueInr,
    aiAssistedRevenueInr,
    incrementalRevenueInr,
    aiAttributedOrders: aiOrders.length,
    upsellConversionPct,
    crossSellConversionPct,
    cartRecoveryPct,
    avgAiOrderUpliftInr,
  });
}
