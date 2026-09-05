export type PaymentMode = "RAZORPAY_TEST" | "SIMULATED";

export type PaymentStatus =
  | "CREATED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PAYMENT_INITIATED"
  | "PAYMENT_FAILED"
  | "RETRY_PENDING"
  | "PAID"
  | "CANCELLED";

/** Valid forward transitions. PAYMENT_FAILED can only reach PAID via a new
 *  attempt (RETRY_PENDING -> PAYMENT_INITIATED -> PAID), never directly. */
export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  CREATED: ["PENDING_APPROVAL", "CANCELLED"],
  PENDING_APPROVAL: ["APPROVED", "CANCELLED"],
  APPROVED: ["PAYMENT_INITIATED", "CANCELLED"],
  PAYMENT_INITIATED: ["PAID", "PAYMENT_FAILED"],
  PAYMENT_FAILED: ["RETRY_PENDING", "CANCELLED"],
  RETRY_PENDING: ["PAYMENT_INITIATED", "CANCELLED"],
  PAID: [],
  CANCELLED: [],
};

export function assertValidTransition(from: PaymentStatus, to: PaymentStatus) {
  if (!PAYMENT_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid payment state transition: ${from} -> ${to}`);
  }
}

export interface GatewayOrder {
  gatewayOrderId: string;
  mode: PaymentMode;
  amountInr: number;
  keyId?: string; // only for RAZORPAY_TEST, safe to expose to the frontend
}

export interface AttemptResult {
  success: boolean;
  gatewayPaymentId?: string;
  failureReason?: string;
}

export interface PaymentGateway {
  mode: PaymentMode;
  createOrder(amountInr: number, receipt: string): Promise<GatewayOrder>;
  /** Deterministic outcome for the SIMULATED gateway. No-op for real Razorpay
   *  (which resolves via the client-side Checkout widget + verifyPayment). */
  simulateAttempt(attemptNumber: number): AttemptResult;
  verifyPayment(input: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean;
}
