"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { formatInr, formatPct } from "@/lib/utils";
import { Check, Sparkles, ArrowRight } from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  priceInr: number;
  stock: number;
  sizes: string;
  deliveryDays: string;
  returnPolicy: string;
  aiTags: string;
  imageEmoji: string;
}

interface Metrics {
  paymentMode: string;
  readinessPct: number;
  readinessChecks: { label: string; ready: boolean }[];
  buyerRequests: number;
  catalogDiscoverySuccessPct: number;
  productMatchRatePct: number;
  checkoutCompletionPct: number;
  paymentSuccessPct: number;
  aiAssistedGmvInr: number;
}

export default function AiCommercePage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [view, setView] = useState<"human" | "ai">("human");

  useEffect(() => {
    fetch("/api/ai-commerce/metrics").then((r) => r.json()).then(setMetrics);
    fetch("/api/products").then((r) => r.json()).then((d) => setProducts(d.products.slice(0, 6)));
  }, []);

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="AI Commerce"
        subtitle="Make your store understandable and transactable by AI buyers."
        actions={
          <Button asChild variant="accent">
            <Link href="/ai-commerce/buyer">
              Try the AI Buyer Simulator <ArrowRight size={14} />
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>AI Commerce Readiness</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="mb-3 text-3xl font-semibold">{metrics?.readinessPct ?? "—"}%</div>
            <Progress value={metrics?.readinessPct ?? 0} className="mb-4" />
            <ul className="space-y-2 text-sm">
              {metrics?.readinessChecks.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  <Check size={14} className="text-green" /> {c.label}
                </li>
              ))}
            </ul>
            {metrics && (
              <Badge variant={metrics.paymentMode === "RAZORPAY_TEST" ? "green" : "amber"} className="mt-4">
                Payments: {metrics.paymentMode === "RAZORPAY_TEST" ? "Razorpay Test Mode (real API)" : "Simulated (demo mode)"}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>AI Commerce Metrics</CardTitle>
            <CardDescription>How AI buyers actually experience this store</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-3">
            {[
              ["AI buyer requests", metrics ? metrics.buyerRequests.toLocaleString("en-IN") : "—"],
              ["Catalog discovery success", metrics ? formatPct(metrics.catalogDiscoverySuccessPct, 1) : "—"],
              ["Product match rate", metrics ? formatPct(metrics.productMatchRatePct, 1) : "—"],
              ["Checkout completion", metrics ? formatPct(metrics.checkoutCompletionPct, 1) : "—"],
              ["Payment success", metrics ? formatPct(metrics.paymentSuccessPct, 1) : "—"],
              ["AI-assisted GMV", metrics ? formatInr(metrics.aiAssistedGmvInr, { compact: true }) : "—"],
            ].map(([label, val]) => (
              <div key={label as string}>
                <div className="text-xs text-muted">{label}</div>
                <div className="text-xl font-semibold">{val}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Agent-Readable Catalog</CardTitle>
            <CardDescription>What an AI buyer sees vs. what a human shopper sees</CardDescription>
          </div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
            <button onClick={() => setView("human")} className={`rounded-md px-3 py-1 font-medium ${view === "human" ? "bg-white shadow-sm" : "text-muted"}`}>Human View</button>
            <button onClick={() => setView("ai")} className={`rounded-md px-3 py-1 font-medium ${view === "ai" ? "bg-white shadow-sm" : "text-muted"}`}>AI View</button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) =>
            view === "human" ? (
              <div key={p.id} className="rounded-xl border border-border p-4">
                <div className="mb-2 text-3xl">{p.imageEmoji}</div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-muted">{p.category}</div>
                <div className="mt-2 font-semibold">{formatInr(p.priceInr)}</div>
                <div className="mt-1 text-xs text-muted">{p.stock > 0 ? `${p.stock} in stock` : "Out of stock"} · {p.deliveryDays}</div>
              </div>
            ) : (
              <div key={p.id} className="rounded-xl border border-border bg-slate-900 p-4 font-mono text-[11px] leading-relaxed text-emerald-300">
                <div className="mb-1 flex items-center gap-1 text-emerald-400">
                  <Sparkles size={11} /> product.json
                </div>
                <pre className="whitespace-pre-wrap">{JSON.stringify(
                  {
                    id: p.sku,
                    name: p.name,
                    category: p.category,
                    price_inr: p.priceInr,
                    currency: "INR",
                    available_sizes: p.sizes.split(","),
                    stock: p.stock,
                    delivery: p.deliveryDays,
                    return_policy: p.returnPolicy,
                    ai_tags: p.aiTags.split(","),
                  },
                  null,
                  2
                )}</pre>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
