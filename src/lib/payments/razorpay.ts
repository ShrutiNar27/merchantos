import crypto from "crypto";
import Razorpay from "razorpay";
import type { AttemptResult, GatewayOrder, PaymentGateway } from "./types";

/**
 * REAL Razorpay TEST MODE integration. Activated only when both
 * RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set. Orders are created via the
 * real Razorpay Orders API (test mode); payment capture happens client-side
 * via Razorpay Checkout using Razorpay's published test cards, and is
 * verified server-side with an HMAC signature check — never trusted blindly.
 */
export class RazorpayGateway implements PaymentGateway {
  mode = "RAZORPAY_TEST" as const;
  private client: Razorpay;
  private keyId: string;
  private keySecret: string;

  constructor(keyId: string, keySecret: string) {
    this.keyId = keyId;
    this.keySecret = keySecret;
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createOrder(amountInr: number, receipt: string): Promise<GatewayOrder> {
    const order = await this.client.orders.create({
      amount: amountInr * 100, // paise
      currency: "INR",
      receipt,
      notes: { platform: "MerchantOS", mode: "test" },
    });
    return {
      gatewayOrderId: order.id,
      mode: "RAZORPAY_TEST",
      amountInr,
      keyId: this.keyId,
    };
  }

  simulateAttempt(): AttemptResult {
    // Real gateway resolves via the client-side Checkout widget, not here.
    throw new Error("simulateAttempt is not applicable to the real Razorpay gateway");
  }

  verifyPayment(input: { orderId: string; paymentId: string; signature: string }): boolean {
    const expected = crypto
      .createHmac("sha256", this.keySecret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest("hex");
    return expected === input.signature;
  }
}
