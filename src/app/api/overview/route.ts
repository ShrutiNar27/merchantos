import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scoreOpportunity } from "@/lib/agent/opportunityScoring";

export async function GET() {
  const now = new Date();
  const days30 = new Date(now);
  days30.setDate(days30.getDate() - 30);

  const [confirmedOrders, aiOrders, abandonedCarts, pendingOpportunitiesRaw, allOpportunities] = await Promise.all([
    db.order.findMany({ where: { status: "CONFIRMED", createdAt: { gte: days30 } } }),
    db.order.findMany({ where: { status: "CONFIRMED", aiAttributed: true, createdAt: { gte: days30 } } }),
    db.cart.count({ where: { status: "ABANDONED", createdAt: { gte: days30 } } }),
    db.aiOpportunity.findMany({ where: { status: "PENDING" } }),
    db.aiOpportunity.count(),
  ]);

  // Recompute each pending opportunity's numbers live before ranking them —
  // sorting by the stored (possibly stale) value would put yesterday's
  // biggest opportunity first even if today's data no longer supports it.
  const pendingOpportunities = (
    await Promise.all(
      pendingOpportunitiesRaw.map(async (o) => ({ ...o, ...(await scoreOpportunity(db, o)) }))
    )
  ).sort((a, b) => b.expectedRevenueInr - a.expectedRevenueInr);

  const revenueInr = confirmedOrders.reduce((s, o) => s + o.totalInr, 0);
  const aiAttributedRevenueInr = aiOrders.reduce((s, o) => s + o.totalInr, 0);
  const aiRevenueContributionPct = revenueInr > 0 ? (aiAttributedRevenueInr / revenueInr) * 100 : 0;
  const conversionRatePct = confirmedOrders.length + abandonedCarts > 0 ? (confirmedOrders.length / (confirmedOrders.length + abandonedCarts)) * 100 : 0;
  const averageOrderValueInr = confirmedOrders.length > 0 ? revenueInr / confirmedOrders.length : 0;
  const pendingOpportunitySum = pendingOpportunities.reduce((s, o) => s + o.expectedRevenueInr, 0);
  const topOpportunities = pendingOpportunities.slice(0, 4);

  const trend: { date: string; revenueInr: number; aiRevenueInr: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const dayOrders = confirmedOrders.filter((o) => o.createdAt >= dayStart && o.createdAt <= dayEnd);
    trend.push({
      date: `${String(dayStart.getMonth() + 1).padStart(2, "0")}-${String(dayStart.getDate()).padStart(2, "0")}`,
      revenueInr: dayOrders.reduce((s, o) => s + o.totalInr, 0),
      aiRevenueInr: dayOrders.filter((o) => o.aiAttributed).reduce((s, o) => s + o.totalInr, 0),
    });
  }

  const recentActions = await db.aiAction.findMany({ orderBy: { timestamp: "desc" }, take: 8 });
  const feed = recentActions.map((a) => ({
    id: a.id,
    icon: a.outcome === "BLOCKED" ? "red" : a.outcome === "FAILED" ? "red" : a.approvalStatus === "PENDING" ? "amber" : "green",
    text: describeAction(a),
    timestamp: a.timestamp,
  }));

  return NextResponse.json({
    revenueInr,
    aiAttributedRevenueInr,
    aiRevenueContributionPct,
    conversionRatePct,
    averageOrderValueInr,
    aiOpportunitiesCount: allOpportunities,
    pendingOpportunitySum,
    topOpportunities,
    trend,
    feed,
  });
}

function describeAction(a: { action: string; amountInr: number | null; outcome: string }) {
  const amt = a.amountInr ? ` (₹${a.amountInr.toLocaleString("en-IN")})` : "";
  switch (a.action) {
    case "create_order":
      return a.outcome === "BLOCKED" ? `AI attempted a transaction that was blocked${amt}` : `AI created an order${amt}`;
    case "initiate_payment":
      return a.outcome === "FAILED" ? "Payment attempt failed" : `Payment initiated${amt}`;
    case "payment_result":
      return a.outcome === "SUCCESS" ? "Payment succeeded — retry recovered the order" : "Payment attempt failed";
    case "recommend_cross_sell":
      return "AI found an upsell opportunity";
    case "receive_buyer_request":
      return "AI buyer discovered the catalog";
    case "request_payment_approval":
      return "Payment approval requested";
    default:
      return a.action.replace(/_/g, " ");
  }
}
