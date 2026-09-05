import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const campaigns = await db.campaign.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ campaigns });
}
