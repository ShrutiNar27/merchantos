import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createCart, addCartItem } from "@/lib/agent/tools";

export async function POST(req: Request) {
  const { sessionId, cartId, items } = await req.json();
  if (!sessionId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "sessionId and items are required" }, { status: 400 });
  }

  let cart = cartId ? await db.cart.findUnique({ where: { id: cartId } }) : null;
  if (!cart) {
    cart = await createCart(null, "ai_commerce", sessionId);
    await db.buyerSession.update({ where: { id: sessionId }, data: { cartId: cart.id } });
  }

  for (const item of items as { productId: string; addedByAi?: boolean }[]) {
    await addCartItem(cart.id, item.productId, 1, item.addedByAi ?? false, sessionId);
  }

  const full = await db.cart.findUnique({
    where: { id: cart.id },
    include: { items: { include: { product: true } } },
  });

  const subtotalInr = full!.items.reduce((s, i) => s + i.product.priceInr * i.quantity, 0);
  return NextResponse.json({ cart: full, subtotalInr });
}
