"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { formatInr, formatPct, timeAgo } from "@/lib/utils";
import { Sparkles, TrendingUp, Target, Percent, Wallet, Lightbulb, ArrowRight } from "lucide-react";

interface Opportunity {
  id: string;
  title: string;
  segment: string;
  reasoning: string;
  expectedRevenueInr: number;
  confidencePct: number;
}

interface OverviewData {
  revenueInr: number;
  aiAttributedRevenueInr: number;
  aiRevenueContributionPct: number;
  conversionRatePct: number;
  averageOrderValueInr: number;
  aiOpportunitiesCount: number;
  pendingOpportunitySum: number;
  topOpportunities: Opportunity[];
  trend: { date: string; revenueInr: number; aiRevenueInr: number }[];
  feed: { id: string; icon: string; text: string; timestamp: string }[];
}

function MetricTile({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
          <Icon size={15} className="text-muted" />
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/overview");
    setData(await res.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
  }, [load]);

  async function resolveOpportunity(id: string, action: "approve" | "reject") {
    setBusyId(id);
    await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
    setBusyId(null);
  }

  async function letAiHandleSafeActions() {
    if (!data) return;
    setAutoRunning(true);
    const safe = data.topOpportunities.filter((o) => o.confidencePct >= 85);
    for (const o of safe) {
      await fetch(`/api/opportunities/${o.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
    }
    await load();
    setAutoRunning(false);
  }

  if (!data) {
    return <div className="text-sm text-muted">Loading command center…</div>;
  }

  return (
    <div className="max-w-6xl">
      <PageHeader title="Good morning, StrideX 👋" />

      <Card className="mb-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-300">
              <Sparkles size={14} /> AI Revenue Brief
            </div>
            <div className="text-xl font-semibold">
              Your AI found {formatInr(data.pendingOpportunitySum)} in potential revenue today.
            </div>
            <div className="mt-1 text-sm text-slate-300">
              {data.aiOpportunitiesCount} opportunities identified across cross-sell, recovery, and inventory signals.
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
              <Link href="/grow-revenue">Review Opportunities</Link>
            </Button>
            <Button variant="accent" onClick={letAiHandleSafeActions} disabled={autoRunning}>
              {autoRunning ? "Executing…" : "Let AI Handle Safe Actions"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <MetricTile icon={Wallet} label="Revenue (30d)" value={formatInr(data.revenueInr, { compact: true })} />
        <MetricTile icon={Sparkles} label="AI-attributed revenue" value={formatInr(data.aiAttributedRevenueInr, { compact: true })} />
        <MetricTile icon={Percent} label="AI revenue contribution" value={formatPct(data.aiRevenueContributionPct, 1)} />
        <MetricTile icon={TrendingUp} label="Conversion rate" value={formatPct(data.conversionRatePct, 1)} />
        <MetricTile icon={Target} label="Avg order value" value={formatInr(data.averageOrderValueInr)} />
        <MetricTile icon={Lightbulb} label="AI opportunities" value={String(data.aiOpportunitiesCount)} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue — last 14 days</CardTitle>
            <CardDescription>Total revenue vs. AI-attributed revenue</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.trend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f172a" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="airev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f9d8c" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0f9d8c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  formatter={(v: unknown) => formatInr(Number(v))}
                  contentStyle={{ borderRadius: 12, border: "1px solid #e6e9ef", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="revenueInr" stroke="#0f172a" fill="url(#rev)" strokeWidth={2} name="Total revenue" />
                <Area type="monotone" dataKey="aiRevenueInr" stroke="#0f9d8c" fill="url(#airev)" strokeWidth={2} name="AI revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Activity</CardTitle>
            <CardDescription>What the AI is doing right now</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {data.feed.map((f) => (
              <div key={f.id} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    f.icon === "green" ? "bg-green" : f.icon === "amber" ? "bg-amber" : "bg-red"
                  }`}
                />
                <div className="flex-1">
                  <div className="text-foreground">{f.text}</div>
                  <div className="text-xs text-muted">{timeAgo(f.timestamp)}</div>
                </div>
              </div>
            ))}
            <Link href="/ai-activity" className="flex items-center gap-1 pt-1 text-xs font-medium text-accent hover:underline">
              View full audit trail <ArrowRight size={12} />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Top Opportunities</CardTitle>
            <CardDescription>Ranked by expected revenue impact</CardDescription>
          </div>
          <Link href="/grow-revenue" className="text-xs font-medium text-accent hover:underline">
            See all →
          </Link>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          {data.topOpportunities.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-xl border border-border p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{o.title}</span>
                  <Badge variant="accent">{o.confidencePct}% confidence</Badge>
                </div>
                <div className="mt-0.5 text-sm text-muted">{o.segment}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-semibold text-green">+{formatInr(o.expectedRevenueInr)}</div>
                </div>
                <Button size="sm" variant="outline" disabled={busyId === o.id} onClick={() => resolveOpportunity(o.id, "reject")}>
                  Reject
                </Button>
                <Button size="sm" disabled={busyId === o.id} onClick={() => resolveOpportunity(o.id, "approve")}>
                  Approve
                </Button>
              </div>
            </div>
          ))}
          {data.topOpportunities.length === 0 && (
            <div className="py-6 text-center text-sm text-muted">All caught up — no pending opportunities right now.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
