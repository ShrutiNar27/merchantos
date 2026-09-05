import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseIntent } from "@/lib/agent/intent";
import { rankProducts } from "@/lib/agent/reasoning";
import { searchProducts, getProductAffinities } from "@/lib/agent/tools";
import { logAction } from "@/lib/audit";

export async function POST(req: Request) {
  const { query } = await req.json();
  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const session = await db.buyerSession.create({ data: { query } });
  const sessionId = session.id;

  await logAction({
    actor: "AI",
    action: "receive_buyer_request",
    toolCategory: "READ",
    reason: `Query: "${query}"`,
    sessionId,
  });

  const intent = parseIntent(query);
  await logAction({
    actor: "AI",
    action: "parse_intent",
    toolCategory: "READ",
    reason: `Parsed: ${JSON.stringify(intent)}`,
    sessionId,
  });

  const candidates = await searchProducts(
    { maxPriceInr: intent.budgetInr, category: intent.category, size: intent.size, tags: [...(intent.usage ?? []), ...(intent.preference ?? [])] },
    sessionId
  );
  // Widen search if the strict filter set found nothing, to keep the demo resilient.
  const searchPool = candidates.length > 0 ? candidates : await searchProducts({ maxPriceInr: intent.budgetInr }, sessionId);

  const bySizeCount = intent.size ? searchPool.filter((p) => p.sizes.split(",").includes(intent.size!)).length : searchPool.length;
  const byBudgetCount = intent.budgetInr ? searchPool.filter((p) => p.priceInr <= intent.budgetInr!).length : searchPool.length;

  const ranked = rankProducts(searchPool, intent);
  const top = ranked[0];

  await logAction({
    actor: "AI",
    action: "rank_products",
    toolCategory: "READ",
    entityType: "Product",
    entityId: top?.product.id,
    reason: top ? `Selected ${top.product.name} (score ${top.score})` : "No suitable product found",
    confidencePct: top ? Math.min(97, 60 + top.reasons.length * 8) : undefined,
    sessionId,
  });

  let crossSell = null;
  if (top) {
    const affinities = await getProductAffinities(top.product.id, sessionId);
    const best = affinities[0];
    if (best) {
      crossSell = {
        product: best.toProduct,
        attachRatePct: best.attachRatePct,
        avgAdditionalRevenueInr: best.avgAdditionalRevenueInr,
      };
      await logAction({
        actor: "AI",
        action: "recommend_cross_sell",
        toolCategory: "READ",
        entityType: "Product",
        entityId: best.toProductId,
        reason: `${best.attachRatePct}% of ${top.product.name} buyers also buy ${best.toProduct.name}`,
        confidencePct: best.attachRatePct,
        sessionId,
      });
    }
  }

  await db.buyerSession.update({ where: { id: sessionId }, data: { parsedJson: JSON.stringify(intent) } });

  return NextResponse.json({
    sessionId,
    intent,
    steps: [
      {
        label: "Understanding request",
        checks: [
          intent.budgetInr ? `Budget: ₹${intent.budgetInr.toLocaleString("en-IN")}` : null,
          intent.size ? `Size: ${intent.size}` : null,
          intent.usage?.length ? `Usage: ${intent.usage.join(", ")}` : null,
          intent.preference?.length ? `Preference: ${intent.preference.join(", ")}` : null,
        ].filter(Boolean),
      },
      { label: "Searching catalog", checks: [`Found ${searchPool.length} products`] },
      {
        label: "Filtering",
        checks: [
          intent.size ? `${bySizeCount} products match size` : null,
          intent.budgetInr ? `${byBudgetCount} products match budget` : null,
        ].filter(Boolean),
      },
      { label: "Ranking", checks: top ? [`AI selects ${top.product.name}`] : ["No confident match found"] },
    ],
    selected: top ? { product: top.product, reasons: top.reasons, score: top.score } : null,
    crossSell,
  });
}
