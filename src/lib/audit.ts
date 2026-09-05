import { db } from "./db";

export type Actor = "AI" | "MERCHANT" | "CUSTOMER" | "SYSTEM";
export type ToolCategory = "READ" | "WRITE" | "MONEY";
export type PolicyResult = "PASSED" | "BLOCKED" | "PENDING" | "N/A";
export type ApprovalStatus = "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
export type Outcome = "SUCCESS" | "FAILED" | "BLOCKED" | "PENDING";

export interface LogActionInput {
  actor: Actor;
  action: string;
  toolCategory?: ToolCategory;
  entityType?: string;
  entityId?: string;
  amountInr?: number;
  reason?: string;
  confidencePct?: number;
  expectedImpactInr?: number;
  policyResult?: PolicyResult;
  policyDetail?: string;
  approvalRequired?: boolean;
  approvalStatus?: ApprovalStatus;
  outcome?: Outcome;
  sessionId?: string;
}

/** Every tool invocation and money-related decision the agent makes is
 * written here — this is the ground truth behind the AI Activity / Trust
 * Center pages. Nothing renders there that wasn't actually logged. */
export async function logAction(input: LogActionInput) {
  return db.aiAction.create({
    data: {
      actor: input.actor,
      action: input.action,
      toolCategory: input.toolCategory ?? "READ",
      entityType: input.entityType,
      entityId: input.entityId,
      amountInr: input.amountInr,
      reason: input.reason,
      confidencePct: input.confidencePct,
      expectedImpactInr: input.expectedImpactInr,
      policyResult: input.policyResult ?? "N/A",
      policyDetail: input.policyDetail,
      approvalRequired: input.approvalRequired ?? false,
      approvalStatus: input.approvalStatus ?? "NOT_REQUIRED",
      outcome: input.outcome ?? "SUCCESS",
      sessionId: input.sessionId,
    },
  });
}

export async function getRecentActions(limit = 100) {
  return db.aiAction.findMany({ orderBy: { timestamp: "desc" }, take: limit });
}

export async function getTrustCenterStats() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todaysActions = await db.aiAction.findMany({
    where: { timestamp: { gte: startOfDay }, toolCategory: { in: ["WRITE", "MONEY"] } },
  });

  const approved = todaysActions.filter((a) => a.approvalStatus === "APPROVED" || (a.policyResult === "PASSED" && a.approvalStatus === "NOT_REQUIRED")).length;
  const blocked = todaysActions.filter((a) => a.policyResult === "BLOCKED" || a.outcome === "BLOCKED").length;
  const awaitingApproval = todaysActions.filter((a) => a.approvalStatus === "PENDING").length;
  const paymentFailures = todaysActions.filter((a) => a.action === "initiate_payment" && a.outcome === "FAILED").length;

  return {
    total: todaysActions.length,
    approved,
    blocked,
    awaitingApproval,
    paymentFailures,
  };
}
