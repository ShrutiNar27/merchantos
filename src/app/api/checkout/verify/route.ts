import { NextResponse } from "next/server";
import { verifyPayment, resolvePaymentAttempt } from "@/lib/agent/tools";

/**
 * Finalizes a Razorpay Test Mode payment attempt. The client calls this after
 * the Checkout widget resolves — either with a signature to verify (success)
 * or with `failed: true` (the widget reported a decline, or the customer
 * dismissed it without paying). SIMULATED-gateway payments never hit this
 * route; they resolve synchronously inside /api/checkout/pay.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { localPaymentId, sessionId } = body;
  if (!localPaymentId) {
    return NextResponse.json({ error: "localPaymentId is required" }, { status: 400 });
  }

  if (body.failed) {
    const result = await resolvePaymentAttempt(
      localPaymentId,
      { success: false, failureReason: body.reason ?? "Payment was not completed." },
      sessionId
    );
    return NextResponse.json(result);
  }

  const { orderId, paymentId, signature } = body;
  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "orderId, paymentId, and signature are required" }, { status: 400 });
  }
  const result = await verifyPayment({ orderId, paymentId, signature, localPaymentId }, sessionId);
  return NextResponse.json(result);
}
