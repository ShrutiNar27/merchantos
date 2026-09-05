import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const customers = await db.customer.findMany({ orderBy: { totalSpendInr: "desc" } });
  return NextResponse.json({ customers });
}
