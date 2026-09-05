import { NextResponse } from "next/server";
import { initiatePayment } from "@/lib/agent/tools";

export async function POST(req: Request) {
  const { orderId, sessionId } = await req.json();
  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

  const result = await initiatePayment(orderId, sessionId);
  return NextResponse.json(result);
}
