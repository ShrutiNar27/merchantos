import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const affinities = await db.productAffinity.findMany({
    include: { fromProduct: true, toProduct: true },
    orderBy: { attachRatePct: "desc" },
  });

  const groups = new Map<string, { fromCategory: string; toCategory: string; rates: number[]; revenue: number[] }>();
  for (const a of affinities) {
    const key = `${a.fromProduct.category}→${a.toProduct.category}`;
    const g = groups.get(key) ?? { fromCategory: a.fromProduct.category, toCategory: a.toProduct.category, rates: [], revenue: [] };
    g.rates.push(a.attachRatePct);
    g.revenue.push(a.avgAdditionalRevenueInr);
    groups.set(key, g);
  }

  const categoryMap = Array.from(groups.values())
    .map((g) => ({
      fromCategory: g.fromCategory,
      toCategory: g.toCategory,
      attachRatePct: Math.round(g.rates.reduce((s, r) => s + r, 0) / g.rates.length),
      avgAdditionalRevenueInr: Math.round(g.revenue.reduce((s, r) => s + r, 0) / g.revenue.length),
    }))
    .sort((a, b) => b.attachRatePct - a.attachRatePct);

  return NextResponse.json({ affinities, categoryMap });
}
