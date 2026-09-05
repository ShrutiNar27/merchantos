import { NextResponse } from "next/server";
import { getRecentActions, getTrustCenterStats } from "@/lib/audit";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 150);
  const [actions, stats] = await Promise.all([getRecentActions(limit), getTrustCenterStats()]);
  return NextResponse.json({ actions, stats });
}
