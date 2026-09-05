import { db } from "./db";

export interface PolicyCheckInput {
  amountInr: number;
  category?: string;
  discountPct?: number;
}

export interface PolicyCheckItem {
  label: string;
  passed: boolean;
  detail: string;
}

export interface PolicyCheckResult {
  passed: boolean;
  checks: PolicyCheckItem[];
  approvalRequired: boolean;
  blockedReason?: string;
}

/** Fetches (and lazily creates) the single merchant's guardrail policy. */
export async function getPolicy() {
  let merchant = await db.merchant.findFirst({ include: { policy: true } });
  if (!merchant) {
    merchant = await db.merchant.create({
      data: { name: "StrideX Sports", policy: { create: {} } },
      include: { policy: true },
    });
  }
  if (!merchant.policy) {
    const policy = await db.policyConfig.create({ data: { merchantId: merchant.id } });
    return { ...merchant, policy };
  }
  return merchant;
}

/** Evaluates a proposed money action against merchant-configured guardrails.
 * This is the single choke point every MONEY-category tool must pass
 * through before it is allowed to execute — see AGENTS/README "Safety". */
export async function checkPolicy(input: PolicyCheckInput): Promise<PolicyCheckResult> {
  const merchant = await getPolicy();
  const policy = merchant.policy!;
  const checks: PolicyCheckItem[] = [];

  const underTxnLimit = input.amountInr <= policy.maxAiTransactionInr;
  checks.push({
    label: "Under transaction limit",
    passed: underTxnLimit,
    detail: `₹${input.amountInr.toLocaleString("en-IN")} vs limit ₹${policy.maxAiTransactionInr.toLocaleString("en-IN")}`,
  });

  const allowedCategories = policy.allowedCategories.split(",").map((c) => c.trim().toLowerCase());
  const categoryOk =
    !input.category || allowedCategories.some((c) => input.category!.toLowerCase().includes(c.split("/")[0]));
  checks.push({
    label: "Product category allowed",
    passed: categoryOk,
    detail: input.category ? `${input.category} within ${policy.allowedCategories}` : "No category restriction",
  });

  const discountOk = !input.discountPct || input.discountPct <= policy.maxAiDiscountPct;
  checks.push({
    label: "Discount within limit",
    passed: discountOk,
    detail: input.discountPct
      ? `${input.discountPct}% vs limit ${policy.maxAiDiscountPct}%`
      : "No discount applied",
  });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  // Only `create_order` is counted: the same rupee amount is also logged
  // against create_razorpay_order/initiate_payment/payment_result for
  // traceability, and summing every MONEY-category log line would count
  // one transaction 4-5x over.
  const todaysSpend = await db.aiAction.aggregate({
    where: {
      timestamp: { gte: startOfDay },
      action: "create_order",
      toolCategory: "MONEY",
      outcome: "SUCCESS",
    },
    _sum: { amountInr: true },
  });
  const spentSoFar = todaysSpend._sum.amountInr ?? 0;
  const underDailyCap = spentSoFar + input.amountInr <= policy.maxDailyAiSpendInr;
  checks.push({
    label: "Within daily AI spend cap",
    passed: underDailyCap,
    detail: `₹${spentSoFar.toLocaleString("en-IN")} spent + ₹${input.amountInr.toLocaleString("en-IN")} vs cap ₹${policy.maxDailyAiSpendInr.toLocaleString("en-IN")}`,
  });

  const passed = checks.every((c) => c.passed);

  const approvalRequired =
    policy.requireApprovalPayment ||
    (input.discountPct !== undefined && input.discountPct > policy.requireApprovalDiscountAbovePct);

  checks.push({
    label: "User approval obtained",
    passed: true,
    detail: approvalRequired ? "Required before execution" : "Not required for this action",
  });

  return {
    passed,
    checks,
    approvalRequired,
    blockedReason: passed ? undefined : checks.find((c) => !c.passed)?.detail,
  };
}
