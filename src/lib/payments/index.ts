import { SimulatedGateway } from "./simulated";
import { RazorpayGateway } from "./razorpay";
import type { PaymentGateway } from "./types";

export * from "./types";

let cached: PaymentGateway | null = null;

export function getPaymentGateway(): PaymentGateway {
  if (cached) return cached;
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  cached =
    RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
      ? new RazorpayGateway(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
      : new SimulatedGateway();
  return cached;
}
