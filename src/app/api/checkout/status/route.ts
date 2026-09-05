import { NextResponse } from "next/server";
import { getOrderStatus } from "@/lib/agent/tools";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  const order = await getOrderStatus(orderId);
  return NextResponse.json({ order });
}
