"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { formatInr } from "@/lib/utils";
import { ChevronDown, ArrowRight, PackageCheck, XCircle } from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  priceInr: number;
  stock: number;
}

interface Opportunity {
  id: string;
  type: string;
  title: string;
  segment: string;
  reasoning: string;
  productId: string | null;
  relatedProductId: string | null;
  currentPriceInr: number | null;
  suggestedOfferPct: number | null;
  expectedRevenueInr: number;
  confidencePct: number;
  status: string;
  product: Product | null;
  relatedProduct: Product | null;
}

function OpportunityCard({ o, onResolve }: { o: Opportunity; onResolve: (id: string, action: "approve" | "reject") => void }) {
  const [showWhy, setShowWhy] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="uppercase">{o.type.replace(/_/g, " ")}</Badge>
              <Badge variant="accent">{o.confidencePct}% confidence</Badge>
              {o.status !== "PENDING" && (
                <Badge variant={o.status === "APPROVED" ? "green" : "red"}>{o.status}</Badge>
              )}
            </div>
            <h3 className="mt-2 text-base font-semibold">{o.title}</h3>
            <p className="text-sm text-muted">{o.segment}</p>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {o.currentPriceInr !== null && (
                <div>
                  <div className="text-xs text-muted">Current price</div>
                  <div className="font-medium">{formatInr(o.currentPriceInr)}</div>
                </div>
              )}
              {o.product && (
                <div>
                  <div className="text-xs text-muted">Inventory</div>
                  <div className="font-medium">{o.product.stock} units</div>
                </div>
              )}
              {o.suggestedOfferPct ? (
                <div>
                  <div className="text-xs text-muted">Suggested offer</div>
                  <div className="font-medium">{o.suggestedOfferPct}% bundle discount</div>
                </div>
              ) : null}
              <div>
                <div className="text-xs text-muted">Expected revenue</div>
                <div className="font-medium text-green">+{formatInr(o.expectedRevenueInr)}</div>
              </div>
            </div>

            <button
              onClick={() => setShowWhy((s) => !s)}
              className="mt-3 flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Ask AI Why? <ChevronDown size={12} className={showWhy ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>
            {showWhy && (
              <div className="mt-2 rounded-lg bg-accent-soft p-3 text-sm text-slate-700">{o.reasoning}</div>
            )}
          </div>

          {o.status === "PENDING" && (
            <div className="flex shrink-0 flex-col gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await onResolve(o.id, "approve");
                  setBusy(false);
                }}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await onResolve(o.id, "reject");
                  setBusy(false);
                }}
              >
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface Attribution {
  baselineRevenueInr: number;
  aiAssistedRevenueInr: number;
  incrementalRevenueInr: number;
  aiAttributedOrders: number;
  upsellConversionPct: number;
  crossSellConversionPct: number;
  cartRecoveryPct: number;
  avgAiOrderUpliftInr: number;
}

export default function GrowRevenuePage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [categoryMap, setCategoryMap] = useState<{ fromCategory: string; toCategory: string; attachRatePct: number; avgAdditionalRevenueInr: number }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [attribution, setAttribution] = useState<Attribution | null>(null);
  const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [oppRes, affRes, prodRes, attrRes] = await Promise.all([
      fetch("/api/opportunities"),
      fetch("/api/affinities"),
      fetch("/api/products"),
      fetch("/api/attribution"),
    ]);
    const oppData = await oppRes.json();
    const affData = await affRes.json();
    const prodData = await prodRes.json();
    setOpportunities(oppData.opportunities);
    setCategoryMap(affData.categoryMap.slice(0, 6));
    setProducts(prodData.products);
    setAttribution(await attrRes.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
  }, [load]);

  async function resolve(id: string, action: "approve" | "reject") {
    const res = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (data.blocked) {
      setBlockedMsg(data.blockedReason ?? "Action blocked by policy.");
      setTimeout(() => setBlockedMsg(null), 6000);
    }
    await load();
  }

  const shoes = products.find((p) => p.sku === "RS-001");
  const socks = products.find((p) => p.sku === "SO-001");
  const bottle = products.find((p) => p.sku === "WB-001");
  const bundlePrice = shoes && socks && bottle ? shoes.priceInr + socks.priceInr + bottle.priceInr : 0;
  const offerPrice = Math.round(bundlePrice * 0.943 / 10) * 10;

  const visible = opportunities.filter((o) => filter === "ALL" || o.status === "PENDING");

  return (
    <div className="max-w-5xl">
      <PageHeader title="Grow Revenue" subtitle="Your AI sales team is always looking for the next ₹." />

      {blockedMsg && (
        <Card className="mb-6 border-red/30 bg-red-soft">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-red">
            <XCircle size={16} /> <span className="font-medium">Transaction Blocked</span> — {blockedMsg}
          </CardContent>
        </Card>
      )}

      {shoes && socks && bottle && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Upsell Engine — “Complete Your Run”</CardTitle>
            <CardDescription>AI assembles a relevant bundle the moment a customer selects a product</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-2">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>{shoes.name}</span><span>{formatInr(shoes.priceInr)}</span></div>
              <div className="flex justify-between text-muted"><span>+ {socks.name}</span><span>{formatInr(socks.priceInr)}</span></div>
              <div className="flex justify-between text-muted"><span>+ {bottle.name}</span><span>{formatInr(bottle.priceInr)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-medium"><span>Bundle</span><span>{formatInr(bundlePrice)}</span></div>
              <div className="flex justify-between font-semibold text-accent"><span>AI Offer</span><span>{formatInr(offerPrice)}</span></div>
            </div>
            <div className="flex flex-col justify-center gap-3 rounded-xl bg-slate-50 p-4">
              <div className="flex justify-between text-sm"><span className="text-muted">Original order</span><span className="font-medium">{formatInr(shoes.priceInr)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted">AI-assisted order</span><span className="font-medium">{formatInr(offerPrice)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted">Incremental revenue</span><span className="font-semibold text-green">+{formatInr(offerPrice - shoes.priceInr)}</span></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Product Affinity Map</CardTitle>
          <CardDescription>What customers buy together, ranked by attach rate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {categoryMap.map((c, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex w-56 items-center gap-2 text-sm font-medium">
                <PackageCheck size={14} className="text-accent" />
                {c.fromCategory} <ArrowRight size={12} className="text-muted" /> {c.toCategory}
              </div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-accent" style={{ width: `${c.attachRatePct}%` }} />
              </div>
              <div className="w-16 text-right text-sm font-semibold">{c.attachRatePct}%</div>
              <div className="w-24 text-right text-xs text-muted">+{formatInr(c.avgAdditionalRevenueInr)} avg</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {attribution && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>AI Revenue Attribution</CardTitle>
            <CardDescription>AI isn&apos;t just producing recommendations — it&apos;s producing measurable commercial outcomes</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-4">
            {[
              ["Baseline revenue", formatInr(attribution.baselineRevenueInr, { compact: true })],
              ["AI-assisted revenue", formatInr(attribution.aiAssistedRevenueInr, { compact: true })],
              ["Incremental revenue", formatInr(attribution.incrementalRevenueInr, { compact: true })],
              ["AI-attributed orders", String(attribution.aiAttributedOrders)],
              ["Upsell conversion", `${attribution.upsellConversionPct.toFixed(1)}%`],
              ["Cross-sell conversion", `${attribution.crossSellConversionPct.toFixed(1)}%`],
              ["Cart recovery", `${attribution.cartRecoveryPct.toFixed(1)}%`],
              ["Avg AI order uplift", formatInr(attribution.avgAiOrderUpliftInr)],
            ].map(([label, val]) => (
              <div key={label}>
                <div className="text-xs text-muted">{label}</div>
                <div className="text-xl font-semibold">{val}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Revenue Opportunity Engine</h2>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
          <button onClick={() => setFilter("PENDING")} className={`rounded-md px-3 py-1 font-medium ${filter === "PENDING" ? "bg-white shadow-sm" : "text-muted"}`}>Pending</button>
          <button onClick={() => setFilter("ALL")} className={`rounded-md px-3 py-1 font-medium ${filter === "ALL" ? "bg-white shadow-sm" : "text-muted"}`}>All</button>
        </div>
      </div>
      <div className="space-y-3">
        {visible.map((o) => (
          <OpportunityCard key={o.id} o={o} onResolve={resolve} />
        ))}
        {visible.length === 0 && <div className="py-10 text-center text-sm text-muted">No opportunities to show.</div>}
      </div>
    </div>
  );
}
