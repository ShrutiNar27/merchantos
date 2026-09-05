import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scoreOpportunity } from "@/lib/agent/opportunityScoring";

export async function GET() {
  const opportunities = await db.aiOpportunity.findMany();
  const productIds = opportunities.flatMap((o) => [o.productId, o.relatedProductId]).filter(Boolean) as string[];
  const products = await db.product.findMany({ where: { id: { in: productIds } } });
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  // Expected revenue / confidence / reasoning are recomputed live from
  // current data on every request — see src/lib/agent/opportunityScoring.ts.
  const enriched = await Promise.all(
    opportunities.map(async (o) => {
      const score = await scoreOpportunity(db, o);
      return {
        ...o,
        ...score,
        product: o.productId ? byId[o.productId] : null,
        relatedProduct: o.relatedProductId ? byId[o.relatedProductId] : null,
      };
    })
  );

  enriched.sort((a, b) => {
    if (a.status !== b.status) return a.status.localeCompare(b.status);
    return b.expectedRevenueInr - a.expectedRevenueInr;
  });

  return NextResponse.json({ opportunities: enriched });
}
