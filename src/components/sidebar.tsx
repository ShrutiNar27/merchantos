"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Sparkles,
  Users,
  Package,
  ShoppingCart,
  Megaphone,
  Activity,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/grow-revenue", label: "Grow Revenue", icon: TrendingUp },
  { href: "/ai-commerce", label: "AI Commerce", icon: Sparkles },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/products", label: "Products", icon: Package },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/ai-activity", label: "AI Activity", icon: Activity },
  { href: "/policies", label: "Policies & Guardrails", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
          <Sparkles size={16} />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">MerchantOS</div>
          <div className="text-[11px] leading-tight text-muted">AI Merchant OS</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                active ? "bg-slate-100 text-foreground" : "text-muted hover:bg-slate-50 hover:text-foreground"
              )}
            >
              <Icon size={16} className={active ? "text-accent" : ""} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <Link
          href="/"
          className="block rounded-lg bg-slate-50 px-3 py-2.5 text-center text-[12px] font-medium text-muted hover:bg-slate-100"
        >
          ← Back to homepage
        </Link>
      </div>
    </aside>
  );
}
