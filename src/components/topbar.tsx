"use client";

import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Topbar() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface/80 px-6 py-3 backdrop-blur">
      <div className="text-sm font-medium text-muted">StrideX Sports</div>
      <div className="flex items-center gap-3">
        <Badge variant="amber" className="border border-amber/20">
          Razorpay Test Mode
        </Badge>
        <Badge variant="green" className="border border-green/20">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-green" />
          AI Agent Online
        </Badge>
        <button className="relative rounded-lg p-2 text-muted hover:bg-slate-100">
          <Bell size={16} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white">
          SX
        </div>
      </div>
    </header>
  );
}
