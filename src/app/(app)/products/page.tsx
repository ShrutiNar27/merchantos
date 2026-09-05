"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatInr } from "@/lib/utils";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  priceInr: number;
  stock: number;
  aiTags: string;
  imageEmoji: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState("All");

  useEffect(() => {
    fetch("/api/products").then((r) => r.json()).then((d) => setProducts(d.products));
  }, []);

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const visible = category === "All" ? products : products.filter((p) => p.category === category);

  return (
    <div className="max-w-5xl">
      <PageHeader title="Products" subtitle={`${products.length} SKUs in catalog`} />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              category === c ? "bg-slate-900 text-white" : "bg-slate-100 text-muted hover:bg-slate-200"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Product</TH>
            <TH>Category</TH>
            <TH>Price</TH>
            <TH>Stock</TH>
            <TH>AI Tags</TH>
          </TR>
        </THead>
        <TBody>
          {visible.map((p) => (
            <TR key={p.id}>
              <TD className="font-medium">
                <span className="mr-2">{p.imageEmoji}</span>
                {p.name}
              </TD>
              <TD className="text-muted">{p.category}</TD>
              <TD className="font-medium">{formatInr(p.priceInr)}</TD>
              <TD>
                {p.stock <= 15 ? (
                  <Badge variant="amber">{p.stock} left</Badge>
                ) : (
                  <span className="text-muted">{p.stock}</span>
                )}
              </TD>
              <TD className="max-w-xs truncate text-xs text-muted">{p.aiTags}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
