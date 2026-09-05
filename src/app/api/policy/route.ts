import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPolicy } from "@/lib/policy";
import { logAction } from "@/lib/audit";

export async function GET() {
  const merchant = await getPolicy();
  return NextResponse.json(merchant.policy);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const merchant = await getPolicy();
  const updated = await db.policyConfig.update({
    where: { id: merchant.policy!.id },
    data: {
      maxAiTransactionInr: body.maxAiTransactionInr,
      maxAiDiscountPct: body.maxAiDiscountPct,
      maxCampaignDiscountPct: body.maxCampaignDiscountPct,
      requireApprovalPayment: body.requireApprovalPayment,
      requireApprovalDiscountAbovePct: body.requireApprovalDiscountAbovePct,
      allowedCategories: body.allowedCategories,
      maxDailyAiSpendInr: body.maxDailyAiSpendInr,
      autoCampaignsRequireApproval: body.autoCampaignsRequireApproval,
    },
  });
  await logAction({
    actor: "MERCHANT",
    action: "update_policy",
    toolCategory: "WRITE",
    entityType: "PolicyConfig",
    entityId: updated.id,
    reason: "Merchant updated AI guardrails",
    outcome: "SUCCESS",
  });
  return NextResponse.json(updated);
}
