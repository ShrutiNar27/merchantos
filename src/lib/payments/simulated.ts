import { randomUUID } from "crypto";
import type { AttemptResult, GatewayOrder, PaymentGateway } from "./types";

/**
 * DEMO SIMULATION gateway. Used whenever RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET
 * are not configured. It never talks to a real payment network and never
 * moves real money — it exists so the full order → payment → failure → retry
 * lifecycle is demonstrable and repeatable without live credentials.
 *
 * Behavior is deterministic: the first attempt on every payment fails when
 * DEMO_FORCE_FIRST_ATTEMPT_FAILURE=true (the default), and every retry
 * succeeds. This is what powers the mandatory failure/recovery demo.
 */
export class SimulatedGateway implements PaymentGateway {
  mode = "SIMULATED" as const;

  async createOrder(amountInr: number): Promise<GatewayOrder> {
    return {
      gatewayOrderId: `sim_order_${randomUUID()}`,
      mode: "SIMULATED",
      amountInr,
    };
  }

  simulateAttempt(attemptNumber: number): AttemptResult {
    const forceFailure = process.env.DEMO_FORCE_FIRST_ATTEMPT_FAILURE !== "false";
    if (forceFailure && attemptNumber === 1) {
      return {
        success: false,
        failureReason: "Test payment was declined by the issuing bank (simulated).",
      };
    }
    return { success: true, gatewayPaymentId: `sim_pay_${randomUUID()}` };
  }

  verifyPayment(): boolean {
    // Simulated payments are verified implicitly by simulateAttempt's result.
    return true;
  }
}
