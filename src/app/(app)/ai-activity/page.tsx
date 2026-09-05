"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { formatInr } from "@/lib/utils";
import { ShieldCheck, Lock, MessageSquareText, XCircle } from "lucide-react";

interface Action {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  toolCategory: string;
  entityType: string | null;
  amountInr: number | null;
  reason: string | null;
  confidencePct: number | null;
  policyResult: string;
  approvalStatus: string;
  outcome: string;
}
interface Stats {
  total: number;
  approved: number;
  blocked: number;
  awaitingApproval: number;
  paymentFailures: number;
}

const outcomeVariant: Record<string, "green" | "red" | "amber" | "outline"> = {
  SUCCESS: "green",
  FAILED: "red",
  BLOCKED: "red",
  PENDING: "amber",
};

export default function AiActivityPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/audit").then((r) => r.json()).then((d) => {
      setActions(d.actions);
      setStats(d.stats);
    });
  }, []);

  const blockedExample = actions.find((a) => a.outcome === "BLOCKED" && (a.amountInr ?? 0) > 15000);

  return (
    <div className="max-w-6xl">
      <PageHeader title="AI Activity" subtitle="Every tool call and money-related decision, logged." />

      <Tabs defaultValue="audit">
        <TabsList className="mb-5">
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="trust">Trust Center</TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <Table>
            <THead>
              <TR>
                <TH>Time</TH>
                <TH>Actor</TH>
                <TH>Action</TH>
                <TH>Category</TH>
                <TH>Amount</TH>
                <TH>Reason</TH>
                <TH>Policy</TH>
                <TH>Outcome</TH>
              </TR>
            </THead>
            <TBody>
              {actions.map((a) => (
                <TR key={a.id}>
                  <TD className="whitespace-nowrap text-xs text-muted">
                    {new Date(a.timestamp).toLocaleTimeString("en-IN", { hour12: false })}
                  </TD>
                  <TD>
                    <Badge variant="outline">{a.actor}</Badge>
                  </TD>
                  <TD className="font-medium">{a.action.replace(/_/g, " ")}</TD>
                  <TD>
                    <Badge variant={a.toolCategory === "MONEY" ? "violet" : a.toolCategory === "WRITE" ? "amber" : "outline"}>
                      {a.toolCategory}
                    </Badge>
                  </TD>
                  <TD>{a.amountInr ? formatInr(a.amountInr) : "—"}</TD>
                  <TD className="max-w-xs truncate text-xs text-muted">{a.reason ?? "—"}</TD>
                  <TD>
                    <Badge variant={a.policyResult === "BLOCKED" ? "red" : a.policyResult === "PASSED" ? "green" : "outline"}>
                      {a.policyResult}
                    </Badge>
                  </TD>
                  <TD>
                    <Badge variant={outcomeVariant[a.outcome] ?? "outline"}>{a.outcome}</Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TabsContent>

        <TabsContent value="trust">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <MessageSquareText size={18} className="mb-2 text-accent" />
                <div className="font-semibold">Explainable</div>
                <p className="mt-1 text-sm text-muted">Every AI money action has a business reason, visible on demand.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <ShieldCheck size={18} className="mb-2 text-accent" />
                <div className="font-semibold">Bounded</div>
                <p className="mt-1 text-sm text-muted">Every AI action operates inside merchant-defined limits.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <Lock size={18} className="mb-2 text-accent" />
                <div className="font-semibold">Gated</div>
                <p className="mt-1 text-sm text-muted">Sensitive actions require explicit approval before execution.</p>
              </CardContent>
            </Card>
          </div>

          {stats && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Today&apos;s AI Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-5">
                {[
                  ["Total", stats.total],
                  ["Approved", stats.approved],
                  ["Blocked", stats.blocked],
                  ["Awaiting approval", stats.awaitingApproval],
                  ["Payment failures", stats.paymentFailures],
                ].map(([label, val]) => (
                  <div key={label as string}>
                    <div className="text-xs text-muted">{label}</div>
                    <div className="text-2xl font-semibold">{val}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {blockedExample && (
            <Card className="mb-6 border-red/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red">
                  <XCircle size={16} /> Transaction Blocked — Guardrail in Action
                </CardTitle>
                <CardDescription>A real example of bounded autonomy from today&apos;s activity</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4 pt-2 text-sm">
                <div><div className="text-xs text-muted">Requested</div><div className="font-semibold">{formatInr(blockedExample.amountInr)}</div></div>
                <div><div className="text-xs text-muted">Reason</div><div>{blockedExample.reason}</div></div>
                <div><div className="text-xs text-muted">Outcome</div><div className="font-medium text-red">No payment was initiated</div></div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Tool Permission Model</CardTitle>
              <CardDescription>What the agent can do autonomously vs. what requires gating</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
              <div>
                <Badge variant="outline" className="mb-2">READ</Badge>
                <p className="text-xs text-muted">search_products, get_product, check_inventory, get_customer, get_order_history — execute freely.</p>
              </div>
              <div>
                <Badge variant="amber" className="mb-2">WRITE</Badge>
                <p className="text-xs text-muted">create_cart, apply_discount, create_campaign — logged, policy-aware.</p>
              </div>
              <div>
                <Badge variant="violet" className="mb-2">MONEY</Badge>
                <p className="text-xs text-muted">create_order, create_razorpay_order, initiate_payment — strictly gated by policy + approval.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
