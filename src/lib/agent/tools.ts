import { randomUUID } from "crypto";
import { db } from "../db";
import { logAction } from "../audit";
import { checkPolicy } from "../policy";
import { getPaymentGateway } from "../payments";
import { assertValidTransition, type PaymentStatus } from "../payments/types";

/**
 * The agent's tool surface. The LLM (or, in demo mode, the deterministic
 * reasoning trace in reasoning.ts) never touches Prisma directly — it can
 * only call these functions, every one of which is logged to the audit
 * trail. READ tools execute freely; WRITE tools are logged as they run;
 * MONEY tools are policy-checked first and can be blocked outright.
 */

// ---------------------------------------------------------------------------
// READ tools
// ---------------------------------------------------------------------------

export interface SearchFilters {
  maxPriceInr?: number;
  size?: string;
  category?: string;
  tags?: string[];
  query?: string;
}

export async function searchProducts(filters: SearchFilters, sessionId?: string) {
  const all = await db.product.findMany();
  let results = all;

  if (filters.maxPriceInr) results = results.filter((p) => p.priceInr <= filters.maxPriceInr!);
  if (filters.size) results = results.filter((p) => p.sizes.split(",").includes(filters.size!));
  if (filters.category) results = results.filter((p) => p.category.toLowerCase() === filters.category!.toLowerCase());
  if (filters.tags?.length) {
    results = results.filter((p) => {
      const tags = p.aiTags.toLowerCase();
      return filters.tags!.some((t) => tags.includes(t.toLowerCase()));
    });
  }
  if (filters.query) {
    const q = filters.query.toLowerCase();
    results = results.filter(
      (p) => p.name.toLowerCase().includes(q) || p.aiTags.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }

  await logAction({
    actor: "AI",
    action: "search_products",
    toolCategory: "READ",
    reason: `Filters: ${JSON.stringify(filters)}`,
    sessionId,
  });

  return results;
}

export async function getProduct(productId: string, sessionId?: string) {
  const product = await db.product.findUnique({ where: { id: productId } });
  await logAction({
    actor: "AI",
    action: "get_product",
    toolCategory: "READ",
    entityType: "Product",
    entityId: productId,
    sessionId,
  });
  return product;
}

export async function checkInventory(productId: string, sessionId?: string) {
  const product = await db.product.findUnique({ where: { id: productId } });
  await logAction({
    actor: "AI",
    action: "check_inventory",
    toolCategory: "READ",
    entityType: "Product",
    entityId: productId,
    reason: product ? `Stock: ${product.stock} units` : "Product not found",
    sessionId,
  });
  return product ? { stock: product.stock } : null;
}

export async function getCustomer(customerId: string, sessionId?: string) {
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  await logAction({
    actor: "AI",
    action: "get_customer",
    toolCategory: "READ",
    entityType: "Customer",
    entityId: customerId,
    sessionId,
  });
  return customer;
}

export async function getOrderHistory(customerId: string, sessionId?: string) {
  const orders = await db.order.findMany({
    where: { customerId },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
  await logAction({
    actor: "AI",
    action: "get_order_history",
    toolCategory: "READ",
    entityType: "Customer",
    entityId: customerId,
    sessionId,
  });
  return orders;
}

export async function getProductAffinities(productId: string, sessionId?: string) {
  const affinities = await db.productAffinity.findMany({
    where: { fromProductId: productId },
    include: { toProduct: true },
    orderBy: { attachRatePct: "desc" },
  });
  await logAction({
    actor: "AI",
    action: "get_product_affinities",
    toolCategory: "READ",
    entityType: "Product",
    entityId: productId,
    sessionId,
  });
  return affinities;
}

// ---------------------------------------------------------------------------
// WRITE tools
// ---------------------------------------------------------------------------

export function calculateBundle(
  items: { priceInr: number; quantity: number }[],
  discountPct = 0
) {
  const subtotalInr = items.reduce((sum, i) => sum + i.priceInr * i.quantity, 0);
  const discountInr = Math.round((subtotalInr * discountPct) / 100);
  const totalInr = subtotalInr - discountInr;
  return { subtotalInr, discountInr, totalInr };
}

export async function createCart(
  customerId: string | null,
  source: "web" | "ai_commerce",
  sessionId?: string
) {
  const cart = await db.cart.create({ data: { customerId, source, status: "ACTIVE" } });
  await logAction({
    actor: "AI",
    action: "create_cart",
    toolCategory: "WRITE",
    entityType: "Cart",
    entityId: cart.id,
    sessionId,
  });
  return cart;
}

export async function addCartItem(
  cartId: string,
  productId: string,
  quantity: number,
  addedByAi: boolean,
  sessionId?: string
) {
  const item = await db.cartItem.create({ data: { cartId, productId, quantity, addedByAi } });
  await logAction({
    actor: "AI",
    action: "add_cart_item",
    toolCategory: "WRITE",
    entityType: "Cart",
    entityId: cartId,
    reason: addedByAi ? "AI-recommended cross-sell item added" : "Item added",
    sessionId,
  });
  return item;
}

/** Discount proposals are logged but must still clear checkPolicy before any
 * money action executes — this tool only records the *intent*. */
export async function applyDiscount(entityId: string, discountPct: number, reason: string, sessionId?: string) {
  await logAction({
    actor: "AI",
    action: "apply_discount",
    toolCategory: "WRITE",
    entityType: "Order",
    entityId,
    reason,
    policyResult: "PENDING",
    sessionId,
  });
  return { discountPct, reason };
}

// ---------------------------------------------------------------------------
// MONEY tools — policy-gated
// ---------------------------------------------------------------------------

export interface CreateOrderInput {
  customerId: string;
  items: { productId: string; quantity: number; unitPriceInr: number; isAiCrossSell?: boolean }[];
  discountInr?: number;
  discountPct?: number;
  channel: "web" | "ai_commerce";
  aiAttributed?: boolean;
  aiOpportunityId?: string;
  idempotencyKey?: string;
  sessionId?: string;
}

export interface ToolResult<T> {
  ok: boolean;
  data?: T;
  blockedReason?: string;
  policyChecks?: Awaited<ReturnType<typeof checkPolicy>>["checks"];
  approvalRequired?: boolean;
}

/** Creates an order. Idempotent on `idempotencyKey` — calling this twice with
 * the same key (e.g. a retried client request) returns the existing order
 * instead of creating a duplicate. */
export async function createOrder(input: CreateOrderInput): Promise<ToolResult<{ orderId: string; totalInr: number }>> {
  if (input.idempotencyKey) {
    const existing = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      await logAction({
        actor: "AI",
        action: "create_order",
        toolCategory: "MONEY",
        entityType: "Order",
        entityId: existing.id,
        amountInr: existing.totalInr,
        reason: "Idempotent replay — returned existing order, no duplicate created",
        outcome: "SUCCESS",
        sessionId: input.sessionId,
      });
      return { ok: true, data: { orderId: existing.id, totalInr: existing.totalInr } };
    }
  }

  const subtotalInr = input.items.reduce((s, i) => s + i.unitPriceInr * i.quantity, 0);
  const discountInr = input.discountInr ?? Math.round((subtotalInr * (input.discountPct ?? 0)) / 100);
  const totalInr = subtotalInr - discountInr;
  const category = "Sports/Fitness";

  const policy = await checkPolicy({
    amountInr: totalInr,
    category,
    discountPct: input.discountPct,
  });

  await logAction({
    actor: "AI",
    action: "check_policy",
    toolCategory: "MONEY",
    entityType: "Order",
    amountInr: totalInr,
    policyResult: policy.passed ? "PASSED" : "BLOCKED",
    policyDetail: policy.checks.map((c) => `${c.passed ? "✓" : "✗"} ${c.label}`).join("; "),
    approvalRequired: policy.approvalRequired,
    sessionId: input.sessionId,
  });

  if (!policy.passed) {
    await logAction({
      actor: "AI",
      action: "create_order",
      toolCategory: "MONEY",
      amountInr: totalInr,
      reason: policy.blockedReason,
      policyResult: "BLOCKED",
      outcome: "BLOCKED",
      sessionId: input.sessionId,
    });
    return { ok: false, blockedReason: policy.blockedReason, policyChecks: policy.checks };
  }

  const order = await db.order.create({
    data: {
      idempotencyKey: input.idempotencyKey ?? randomUUID(),
      customerId: input.customerId,
      subtotalInr,
      discountInr,
      totalInr,
      status: "CREATED",
      aiAttributed: input.aiAttributed ?? false,
      aiOpportunityId: input.aiOpportunityId,
      channel: input.channel,
      items: {
        create: input.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPriceInr: i.unitPriceInr,
          isAiCrossSell: i.isAiCrossSell ?? false,
        })),
      },
    },
  });

  await logAction({
    actor: "AI",
    action: "create_order",
    toolCategory: "MONEY",
    entityType: "Order",
    entityId: order.id,
    amountInr: totalInr,
    policyResult: "PASSED",
    approvalRequired: policy.approvalRequired,
    approvalStatus: policy.approvalRequired ? "PENDING" : "NOT_REQUIRED",
    outcome: "SUCCESS",
    sessionId: input.sessionId,
  });

  return { ok: true, data: { orderId: order.id, totalInr }, approvalRequired: policy.approvalRequired, policyChecks: policy.checks };
}

/** Creates (or reuses, via idempotency key) a gateway order and a Payment
 * row, then — for the SIMULATED gateway — resolves the attempt
 * deterministically. Enforces the payment state machine explicitly. */
export async function initiatePayment(orderId: string, sessionId?: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) return { ok: false, blockedReason: "Order not found" };

  const priorFailed = order.payments.find((p) => p.status === "PAYMENT_FAILED" || p.status === "RETRY_PENDING");
  const attemptNumber = order.payments.length + 1;
  const idempotencyKey = `${orderId}:attempt:${attemptNumber}`;

  const existing = await db.payment.findUnique({ where: { idempotencyKey } });
  if (existing) return { ok: true, data: existing };

  const gateway = getPaymentGateway();
  const gatewayOrder = await gateway.createOrder(order.totalInr, orderId);

  await logAction({
    actor: "AI",
    action: "create_razorpay_order",
    toolCategory: "MONEY",
    entityType: "Order",
    entityId: orderId,
    amountInr: order.totalInr,
    reason: `Gateway: ${gateway.mode}, attempt #${attemptNumber}`,
    outcome: "SUCCESS",
    sessionId,
  });

  const status: PaymentStatus = priorFailed ? "RETRY_PENDING" : "APPROVED";
  const payment = await db.payment.create({
    data: {
      idempotencyKey,
      orderId,
      amountInr: order.totalInr,
      status,
      attemptNumber,
      razorpayOrderId: gatewayOrder.gatewayOrderId,
      mode: gateway.mode,
    },
  });

  assertValidTransition(status, "PAYMENT_INITIATED");
  await db.payment.update({ where: { id: payment.id }, data: { status: "PAYMENT_INITIATED" } });

  await logAction({
    actor: "AI",
    action: "initiate_payment",
    toolCategory: "MONEY",
    entityType: "Payment",
    entityId: payment.id,
    amountInr: order.totalInr,
    reason: `Attempt #${attemptNumber} via ${gateway.mode}`,
    outcome: "PENDING",
    sessionId,
  });

  if (gateway.mode === "SIMULATED") {
    const result = gateway.simulateAttempt(attemptNumber);
    return resolvePaymentAttempt(payment.id, result, sessionId);
  }

  // Real Razorpay: client completes Checkout, then calls /api/checkout/verify.
  return {
    ok: true,
    data: { paymentId: payment.id, gatewayOrderId: gatewayOrder.gatewayOrderId, keyId: gatewayOrder.keyId, mode: gateway.mode, amountInr: order.totalInr },
  };
}

export async function resolvePaymentAttempt(
  paymentId: string,
  result: { success: boolean; gatewayPaymentId?: string; failureReason?: string },
  sessionId?: string
) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return { ok: false, blockedReason: "Payment not found" };

  if (result.success) {
    assertValidTransition(payment.status as PaymentStatus, "PAID");
    await db.payment.update({
      where: { id: paymentId },
      data: { status: "PAID", razorpayPaymentId: result.gatewayPaymentId },
    });
    await db.order.update({ where: { id: payment.orderId }, data: { status: "CONFIRMED" } });
    await logAction({
      actor: "SYSTEM",
      action: "payment_result",
      toolCategory: "MONEY",
      entityType: "Payment",
      entityId: paymentId,
      amountInr: payment.amountInr,
      reason: `Payment #${payment.attemptNumber} succeeded`,
      outcome: "SUCCESS",
      sessionId,
    });
    return { ok: true, data: { status: "PAID" } };
  }

  assertValidTransition(payment.status as PaymentStatus, "PAYMENT_FAILED");
  await db.payment.update({
    where: { id: paymentId },
    data: { status: "PAYMENT_FAILED", failureReason: result.failureReason },
  });
  await logAction({
    actor: "SYSTEM",
    action: "payment_result",
    toolCategory: "MONEY",
    entityType: "Payment",
    entityId: paymentId,
    amountInr: payment.amountInr,
    reason: result.failureReason ?? `Payment #${payment.attemptNumber} failed`,
    outcome: "FAILED",
    sessionId,
  });
  return { ok: false, blockedReason: result.failureReason, data: { status: "PAYMENT_FAILED" } };
}

export async function verifyPayment(input: { orderId: string; paymentId: string; signature: string; localPaymentId: string }, sessionId?: string) {
  const gateway = getPaymentGateway();
  const valid = gateway.verifyPayment(input);
  await logAction({
    actor: "SYSTEM",
    action: "verify_payment",
    toolCategory: "MONEY",
    entityType: "Payment",
    entityId: input.localPaymentId,
    reason: valid ? "Signature verified" : "Signature mismatch — payment rejected",
    outcome: valid ? "SUCCESS" : "FAILED",
    sessionId,
  });
  return resolvePaymentAttempt(
    input.localPaymentId,
    valid
      ? { success: true, gatewayPaymentId: input.paymentId }
      : { success: false, failureReason: "Payment signature could not be verified." },
    sessionId
  );
}

export async function getOrderStatus(orderId: string, sessionId?: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } }, payments: true },
  });
  await logAction({
    actor: "AI",
    action: "get_order_status",
    toolCategory: "READ",
    entityType: "Order",
    entityId: orderId,
    sessionId,
  });
  return order;
}
