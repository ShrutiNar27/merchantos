"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatInr, timeAgo } from "@/lib/utils";

interface Order {
  id: string;
  totalInr: number;
  status: string;
  aiAttributed: boolean;
  channel: string;
  createdAt: string;
  customer: { name: string };
  items: { quantity: number; product: { name: string } }[];
  payments: { status: string; attemptNumber: number }[];
}

const statusVariant: Record<string, "green" | "red" | "outline"> = {
  CONFIRMED: "green",
  CANCELLED: "red",
  CREATED: "outline",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    fetch("/api/orders").then((r) => r.json()).then((d) => setOrders(d.orders));
  }, []);

  return (
    <div className="max-w-6xl">
      <PageHeader title="Orders" subtitle={`${orders.length} most recent orders`} />
      <Table>
        <THead>
          <TR>
            <TH>Order</TH>
            <TH>Customer</TH>
            <TH>Items</TH>
            <TH>Channel</TH>
            <TH>Payment</TH>
            <TH>Status</TH>
            <TH>Total</TH>
            <TH>Placed</TH>
          </TR>
        </THead>
        <TBody>
          {orders.map((o) => {
            const lastPayment = o.payments[o.payments.length - 1];
            return (
              <TR key={o.id}>
                <TD className="font-mono text-xs text-muted">{o.id.slice(0, 10)}</TD>
                <TD className="font-medium">{o.customer.name}</TD>
                <TD className="max-w-[220px] truncate text-xs text-muted">
                  {o.items.map((i) => `${i.quantity}× ${i.product.name}`).join(", ")}
                </TD>
                <TD>
                  <Badge variant={o.channel === "ai_commerce" ? "violet" : "outline"}>
                    {o.channel === "ai_commerce" ? "AI Commerce" : "Web"}
                  </Badge>
                  {o.aiAttributed && (
                    <Badge variant="accent" className="ml-1">
                      AI
                    </Badge>
                  )}
                </TD>
                <TD>
                  {lastPayment ? (
                    <Badge variant={lastPayment.status === "PAID" ? "green" : lastPayment.status === "PAYMENT_FAILED" ? "red" : "outline"}>
                      {lastPayment.status}
                      {o.payments.length > 1 ? ` (#${lastPayment.attemptNumber})` : ""}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </TD>
                <TD>
                  <Badge variant={statusVariant[o.status] ?? "outline"}>{o.status}</Badge>
                </TD>
                <TD className="font-medium">{formatInr(o.totalInr)}</TD>
                <TD className="text-xs text-muted">{timeAgo(o.createdAt)}</TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
