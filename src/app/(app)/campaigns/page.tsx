"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { formatInr } from "@/lib/utils";
import { Wand2 } from "lucide-react";

interface Proposal {
  name: string;
  target: string;
  action: string;
  expectedRevenueInr: number;
  discountCostInr: number;
  reasoning: string;
}
interface Plan {
  goal: string;
  discountCapPct: number;
  proposals: Proposal[];
  impact: { revenueUpliftInr: number; discountCostInr: number; netIncrementalRevenueInr: number };
}
interface Campaign {
  id: string;
  name: string;
  target: string;
  action: string;
  expectedRevenueInr: number;
  discountCostInr: number;
  status: string;
}

const statusVariant: Record<string, "green" | "amber" | "outline"> = {
  ACTIVE: "green",
  COMPLETED: "outline",
  DRAFT: "amber",
  REJECTED: "outline",
};

export default function CampaignsPage() {
  const [goal, setGoal] = useState("Increase revenue by 15% this weekend without discounting more than 10%.");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const loadCampaigns = useCallback(async () => {
    const res = await fetch("/api/campaigns");
    const data = await res.json();
    setCampaigns(data.campaigns);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    loadCampaigns();
  }, [loadCampaigns]);

  async function orchestrate() {
    setLoading(true);
    setPlan(null);
    const res = await fetch("/api/campaigns/orchestrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal }),
    });
    setPlan(await res.json());
    setLoading(false);
  }

  async function approvePlan() {
    if (!plan) return;
    setApproving(true);
    await fetch("/api/campaigns/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: plan.goal, proposals: plan.proposals, discountCapPct: plan.discountCapPct }),
    });
    setPlan(null);
    await loadCampaigns();
    setApproving(false);
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title="AI Campaign Orchestrator" subtitle="Describe a goal in plain language — the AI builds a plan from real store data." />

      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex gap-2">
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/30"
            />
            <Button onClick={orchestrate} disabled={loading || !goal.trim()}>
              <Wand2 size={14} /> {loading ? "Analyzing…" : "Generate Plan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {plan && (
        <div className="mb-6 space-y-3">
          {plan.proposals.map((p, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted">Campaign {i + 1}</div>
                    <div className="text-base font-semibold">{p.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted">Expected revenue</div>
                    <div className="text-lg font-semibold text-green">+{formatInr(p.expectedRevenueInr)}</div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                  <div><span className="text-muted">Target: </span>{p.target}</div>
                  <div><span className="text-muted">Action: </span>{p.action}</div>
                  <div><span className="text-muted">Discount cost: </span>{formatInr(p.discountCostInr)}</div>
                </div>
                <div className="mt-2 text-xs text-muted">{p.reasoning}</div>
              </CardContent>
            </Card>
          ))}

          <Card className="bg-slate-900 text-white">
            <CardContent className="flex items-center justify-between p-5">
              <div className="grid grid-cols-3 gap-6 text-sm">
                <div>
                  <div className="text-slate-300">Revenue uplift</div>
                  <div className="text-lg font-semibold">+{formatInr(plan.impact.revenueUpliftInr)}</div>
                </div>
                <div>
                  <div className="text-slate-300">Discount cost</div>
                  <div className="text-lg font-semibold">{formatInr(plan.impact.discountCostInr)}</div>
                </div>
                <div>
                  <div className="text-slate-300">Net incremental</div>
                  <div className="text-lg font-semibold text-emerald-400">+{formatInr(plan.impact.netIncrementalRevenueInr)}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => setPlan(null)}>
                  Modify
                </Button>
                <Button variant="accent" onClick={approvePlan} disabled={approving}>
                  {approving ? "Approving…" : "Approve Plan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
          <CardDescription>Includes historical, active, and draft campaigns</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Target</TH>
                <TH>Action</TH>
                <TH>Expected revenue</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {campaigns.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.name}</TD>
                  <TD className="text-muted">{c.target}</TD>
                  <TD className="max-w-xs truncate text-xs text-muted">{c.action}</TD>
                  <TD className="font-medium text-green">+{formatInr(c.expectedRevenueInr)}</TD>
                  <TD>
                    <Badge variant={statusVariant[c.status] ?? "outline"}>{c.status}</Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
