"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/page-header";

interface Policy {
  id: string;
  maxAiTransactionInr: number;
  maxAiDiscountPct: number;
  maxCampaignDiscountPct: number;
  requireApprovalPayment: boolean;
  requireApprovalDiscountAbovePct: number;
  allowedCategories: string;
  maxDailyAiSpendInr: number;
  autoCampaignsRequireApproval: boolean;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-4 last:border-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

export default function PoliciesPage() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/policy").then((r) => r.json()).then(setPolicy);
  }, []);

  async function save() {
    if (!policy) return;
    setSaving(true);
    await fetch("/api/policy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(policy),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!policy) return <div className="text-sm text-muted">Loading guardrails…</div>;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Policies & Guardrails"
        subtitle="These are the actual limits the AI agent evaluates before every money action."
        actions={
          <Button onClick={save} disabled={saving}>
            {saved ? "Saved ✓" : saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Transaction limits</CardTitle>
          <CardDescription>Bounds every MONEY-category tool call</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Field label="Maximum AI transaction" hint="Single order/payment ceiling">
            <div className="flex items-center gap-1 text-sm">
              ₹
              <input
                type="number"
                value={policy.maxAiTransactionInr}
                onChange={(e) => setPolicy({ ...policy, maxAiTransactionInr: Number(e.target.value) })}
                className="w-28 rounded-lg border border-border px-2 py-1 text-right outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </Field>
          <Field label="Maximum AI discount" hint="Per-order discount ceiling">
            <div className="flex items-center gap-1 text-sm">
              <input
                type="number"
                value={policy.maxAiDiscountPct}
                onChange={(e) => setPolicy({ ...policy, maxAiDiscountPct: Number(e.target.value) })}
                className="w-20 rounded-lg border border-border px-2 py-1 text-right outline-none focus:ring-2 focus:ring-accent/30"
              />
              %
            </div>
          </Field>
          <Field label="Maximum campaign discount" hint="Ceiling for orchestrated campaigns">
            <div className="flex items-center gap-1 text-sm">
              <input
                type="number"
                value={policy.maxCampaignDiscountPct}
                onChange={(e) => setPolicy({ ...policy, maxCampaignDiscountPct: Number(e.target.value) })}
                className="w-20 rounded-lg border border-border px-2 py-1 text-right outline-none focus:ring-2 focus:ring-accent/30"
              />
              %
            </div>
          </Field>
          <Field label="Maximum daily AI spend" hint="Cumulative cap across all MONEY actions per day">
            <div className="flex items-center gap-1 text-sm">
              ₹
              <input
                type="number"
                value={policy.maxDailyAiSpendInr}
                onChange={(e) => setPolicy({ ...policy, maxDailyAiSpendInr: Number(e.target.value) })}
                className="w-28 rounded-lg border border-border px-2 py-1 text-right outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Approval gates</CardTitle>
          <CardDescription>When the AI must stop and ask</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Field label="Require approval for payments" hint="Every payment attempt needs explicit approval">
            <Switch
              checked={policy.requireApprovalPayment}
              onCheckedChange={(v) => setPolicy({ ...policy, requireApprovalPayment: v })}
            />
          </Field>
          <Field label="Require approval for discounts above" hint="Discounts under this are pre-approved">
            <div className="flex items-center gap-1 text-sm">
              <input
                type="number"
                value={policy.requireApprovalDiscountAbovePct}
                onChange={(e) => setPolicy({ ...policy, requireApprovalDiscountAbovePct: Number(e.target.value) })}
                className="w-20 rounded-lg border border-border px-2 py-1 text-right outline-none focus:ring-2 focus:ring-accent/30"
              />
              %
            </div>
          </Field>
          <Field label="Auto-campaigns" hint="Orchestrated campaigns require merchant approval before going active">
            <Switch
              checked={policy.autoCampaignsRequireApproval}
              onCheckedChange={(v) => setPolicy({ ...policy, autoCampaignsRequireApproval: v })}
            />
          </Field>
          <Field label="Allowed categories" hint="Comma-separated; AI cannot transact outside these">
            <input
              value={policy.allowedCategories}
              onChange={(e) => setPolicy({ ...policy, allowedCategories: e.target.value })}
              className="w-56 rounded-lg border border-border px-2 py-1 text-right text-sm outline-none focus:ring-2 focus:ring-accent/30"
            />
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}
