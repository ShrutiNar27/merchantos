import { NextResponse } from "next/server";
import { getPaymentGateway } from "@/lib/payments";

export async function GET() {
  return NextResponse.json({
    merchantName: "StrideX Sports",
    paymentMode: getPaymentGateway().mode,
    razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    forceFirstAttemptFailure: process.env.DEMO_FORCE_FIRST_ATTEMPT_FAILURE !== "false",
  });
}
