"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatInr } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  email: string;
  segment: string;
  totalOrders: number;
  totalSpendInr: number;
}

const segmentVariant: Record<string, "green" | "violet" | "outline"> = {
  "high-value": "green",
  repeat: "violet",
  new: "outline",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then((d) => setCustomers(d.customers));
  }, []);

  return (
    <div className="max-w-5xl">
      <PageHeader title="Customers" subtitle={`${customers.length} customers across all segments`} />
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Email</TH>
            <TH>Segment</TH>
            <TH>Orders</TH>
            <TH>Lifetime spend</TH>
          </TR>
        </THead>
        <TBody>
          {customers.map((c) => (
            <TR key={c.id}>
              <TD className="font-medium">{c.name}</TD>
              <TD className="text-muted">{c.email}</TD>
              <TD>
                <Badge variant={segmentVariant[c.segment] ?? "outline"}>{c.segment}</Badge>
              </TD>
              <TD>{c.totalOrders}</TD>
              <TD className="font-medium">{formatInr(c.totalSpendInr)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
