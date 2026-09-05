"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Check, X } from "lucide-react";

interface Status {
  merchantName: string;
  paymentMode: string;
  razorpayConfigured: boolean;
  anthropicConfigured: boolean;
  forceFirstAttemptFailure: boolean;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    fetch("/api/settings/status").then((r) => r.json()).then(setStatus);
  }, []);

  async function resetDemo() {
    setResetting(true);
    setResetDone(false);
    await fetch("/api/demo/reset", { method: "POST" });
    setResetting(false);
    setResetDone(true);
    setTimeout(() => setResetDone(false), 3000);
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Merchant profile, integrations, and demo controls." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Merchant Profile</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm">
          <div className="flex justify-between border-b border-border py-3">
            <span className="text-muted">Merchant name</span>
            <span className="font-medium">{status?.merchantName ?? "—"}</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-muted">Currency</span>
            <span className="font-medium">INR (₹)</span>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Real vs. simulated adapters — see README for setup</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 text-sm">
          <div className="flex items-center justify-between border-b border-border py-3">
            <span>Razorpay Test Mode API</span>
            {status?.razorpayConfigured ? (
              <Badge variant="green"><Check size={12} /> Connected (real)</Badge>
            ) : (
              <Badge variant="amber"><X size={12} /> Not configured — using simulated gateway</Badge>
            )}
          </div>
          <div className="flex items-center justify-between border-b border-border py-3">
            <span>Payment gateway mode</span>
            <Badge variant="outline">{status?.paymentMode ?? "—"}</Badge>
          </div>
          <div className="flex items-center justify-between py-3">
            <span>Anthropic API (optional LLM assist)</span>
            {status?.anthropicConfigured ? (
              <Badge variant="green"><Check size={12} /> Configured</Badge>
            ) : (
              <Badge variant="outline">Not configured — deterministic reasoning in use</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demo Controls</CardTitle>
          <CardDescription>Resets to the same deterministic dataset every time</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between pt-0">
          <div className="text-sm text-muted">
            Restores 50 products, 100 customers, 500 orders, campaigns, opportunities, and audit history.
          </div>
          <Button onClick={resetDemo} disabled={resetting}>
            {resetDone ? "Reset ✓" : resetting ? "Resetting…" : "Reset Demo Data"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
