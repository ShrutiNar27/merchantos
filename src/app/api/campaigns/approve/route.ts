import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPolicy } from "@/lib/policy";
import { logAction } from "@/lib/audit";

export async function POST(req: Request) {
  const { goal, proposals, discountCapPct } = await req.json();
  if (!Array.isArray(proposals) || proposals.length === 0) {
    return NextResponse.json({ error: "proposals are required" }, { status: 400 });
  }

  const merchant = await getPolicy();
  const policy = merchant.policy!;
  const created = [];

  for (const p of proposals) {
    const impliedDiscountPct = p.expectedRevenueInr > 0 ? (p.discountCostInr / p.expectedRevenueInr) * 100 : 0;
    const withinCap = impliedDiscountPct <= policy.maxCampaignDiscountPct;

    await logAction({
      actor: "AI",
      action: "check_policy",
      toolCategory: "WRITE",
      entityType: "Campaign",
      reason: `${p.name}: implied discount ${impliedDiscountPct.toFixed(1)}% vs cap ${policy.maxCampaignDiscountPct}%`,
      policyResult: withinCap ? "PASSED" : "BLOCKED",
    });

    if (!withinCap) {
      continue;
    }

    const campaign = await db.campaign.create({
      data: {
        name: p.name,
        goal,
        target: p.target,
        action: p.action,
        expectedRevenueInr: p.expectedRevenueInr,
        discountCostInr: p.discountCostInr,
        status: policy.autoCampaignsRequireApproval ? "ACTIVE" : "ACTIVE",
        planJson: JSON.stringify({ goal, discountCapPct, reasoning: p.reasoning }),
      },
    });

    await logAction({
      actor: "MERCHANT",
      action: "approve_campaign",
      toolCategory: "WRITE",
      entityType: "Campaign",
      entityId: campaign.id,
      expectedImpactInr: p.expectedRevenueInr,
      reason: p.name,
      outcome: "SUCCESS",
    });

    created.push(campaign);
  }

  return NextResponse.json({ campaigns: created });
}
