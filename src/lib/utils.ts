import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatInr(amount: number | null | undefined, opts?: { compact?: boolean }) {
  if (amount === null || amount === undefined) return "₹0";
  if (opts?.compact && Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatPct(n: number | null | undefined, digits = 0) {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(digits)}%`;
}

export function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
