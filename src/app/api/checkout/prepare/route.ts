import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateBundle, createOrder } from "@/lib/agent/tools";

async function getOrCreateGuestCustomer() {
  const email = "ai-buyer-guest@merchantos.demo";
  const existing = await db.customer.findUnique({ where: { email } });
  if (existing) return existing;
  return db.customer.create({
    data: { name: "AI Commerce Guest", email, phone: "9000000000", segment: "new" },
  });
}

export async function POST(req: Request) {
  const { sessionId, cartId } = await req.json();
  if (!cartId) return NextResponse.json({ error: "cartId is required" }, { status: 400 });

  const cart = await db.cart.findUnique({ where: { id: cartId }, include: { items: { include: { product: true } } } });
  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty or not found" }, { status: 404 });
  }

  const hasAiCrossSell = cart.items.some((i) => i.addedByAi);
  const discountPct = hasAiCrossSell ? 5 : 0;
  const items = cart.items.map((i) => ({
    priceInr: i.product.priceInr,
    quantity: i.quantity,
  }));
  const bundle = calculateBundle(items, discountPct);

  const customer = await getOrCreateGuestCustomer();

  const result = await createOrder({
    customerId: customer.id,
    items: cart.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPriceInr: i.product.priceInr,
      isAiCrossSell: i.addedByAi,
    })),
    discountInr: bundle.discountInr,
    channel: "ai_commerce",
    aiAttributed: hasAiCrossSell,
    idempotencyKey: `checkout:${cartId}`,
    sessionId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { blocked: true, blockedReason: result.blockedReason, policyChecks: result.policyChecks, bundle },
      { status: 200 }
    );
  }

  await db.cart.update({ where: { id: cartId }, data: { status: "CONVERTED" } });

  const order = await db.order.findUnique({
    where: { id: result.data!.orderId },
    include: { items: { include: { product: true } } },
  });

  return NextResponse.json({
    blocked: false,
    order,
    bundle,
    policyChecks: result.policyChecks,
    approvalRequired: result.approvalRequired,
  });
}
