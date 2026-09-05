"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { formatInr } from "@/lib/utils";
import { Bot, Check, X, ShieldCheck, RefreshCw, Sparkles } from "lucide-react";

const EXAMPLE_QUERY = "I need running shoes under ₹5,000, size 9, for daily running. I prefer lightweight shoes.";

type Product = { id: string; sku: string; name: string; priceInr: number; category: string };
type Step = { label: string; checks: string[] };
type PolicyCheck = { label: string; passed: boolean; detail: string };
type Payment = { id: string; status: string; attemptNumber: number; failureReason: string | null };
type OrderView = {
  id: string;
  totalInr: number;
  subtotalInr: number;
  discountInr: number;
  status: string;
  items: { quantity: number; unitPriceInr: number; product: Product }[];
  payments: Payment[];
};

interface Msg {
  id: string;
  kind:
    | "ai-text"
    | "user-text"
    | "steps"
    | "product"
    | "crosssell"
    | "no-crosssell"
    | "gate"
    | "payment-failed"
    | "payment-success"
    | "blocked";
  payload?: unknown;
}

let uid = 0;
const nextId = () => `m${++uid}`;

interface RazorpayCheckoutOptions {
  key?: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}
interface RazorpayCheckoutInstance {
  open: () => void;
  on: (event: "payment.failed", handler: (response: { error: { description: string } }) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function AiBuyerSimulatorPage() {
  return (
    <Suspense fallback={null}>
      <AiBuyerSimulator />
    </Suspense>
  );
}

function AiBuyerSimulator() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [crossSell, setCrossSell] = useState<{ product: Product; attachRatePct: number; avgAdditionalRevenueInr: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function push(kind: Msg["kind"], payload?: unknown) {
    setMessages((m) => [...m, { id: nextId(), kind, payload }]);
  }

  async function runQuery(q: string) {
    setBusy(true);
    push("user-text", q);
    const res = await fetch("/api/buyer/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    });
    const data = await res.json();
    setSessionId(data.sessionId);
    push("steps", data.steps);
    await sleep(500);

    if (!data.selected) {
      push("ai-text", "I couldn't find a confident match for that request in the catalog.");
      setBusy(false);
      return;
    }
    setSelectedProduct(data.selected.product);
    push("product", { product: data.selected.product, reasons: data.selected.reasons });
    await sleep(400);

    if (data.crossSell) {
      setCrossSell(data.crossSell);
      push("crosssell", { ...data.crossSell, fromProductName: data.selected.product.name });
    } else {
      push("no-crosssell", { product: data.selected.product });
    }
    setBusy(false);
  }

  async function addToCart(withCrossSell: boolean) {
    if (!sessionId || !selectedProduct) return;
    setBusy(true);
    push("user-text", withCrossSell ? "Add them." : `Just the ${selectedProduct.name}, thanks.`);
    const items = [{ productId: selectedProduct.id, addedByAi: false }];
    if (withCrossSell && crossSell) items.push({ productId: crossSell.product.id, addedByAi: true });

    const res = await fetch("/api/buyer/add-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, cartId, items }),
    });
    const data = await res.json();
    setCartId(data.cart.id);
    await sleep(300);
    push("ai-text", "I've prepared your order. Let me check it against store policy before we proceed.");
    await prepareCheckout(data.cart.id);
  }

  async function prepareCheckout(cid: string) {
    const res = await fetch("/api/checkout/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, cartId: cid }),
    });
    const data = await res.json();
    if (data.blocked) {
      push("blocked", { reason: data.blockedReason, bundle: data.bundle, checks: data.policyChecks });
      setBusy(false);
      return;
    }
    push("gate", { order: data.order, bundle: data.bundle, checks: data.policyChecks });
    setBusy(false);
  }

  async function pay(orderId: string) {
    setBusy(true);
    const res = await fetch("/api/checkout/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, sessionId }),
    });
    const data = await res.json();

    if (data.ok && data.data?.mode === "RAZORPAY_TEST") {
      // Order created with the real Razorpay API — payment itself hasn't
      // happened yet. Open the Checkout widget and wait for its result
      // instead of treating this response as final.
      await openRazorpayCheckout(orderId, data.data);
      return;
    }

    const statusRes = await fetch(`/api/checkout/status?orderId=${orderId}`);
    const { order: fresh } = await statusRes.json();
    if (data.ok) {
      push("payment-success", fresh);
    } else {
      push("payment-failed", { reason: data.blockedReason, order: fresh });
    }
    setBusy(false);
  }

  async function finishRazorpayAttempt(orderId: string, verifyBody: Record<string, unknown>) {
    const verifyRes = await fetch("/api/checkout/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ...verifyBody }),
    });
    const verifyData = await verifyRes.json();
    const statusRes = await fetch(`/api/checkout/status?orderId=${orderId}`);
    const { order: fresh } = await statusRes.json();
    if (verifyData.ok) {
      push("payment-success", fresh);
    } else {
      push("payment-failed", { reason: verifyData.blockedReason, order: fresh });
    }
    setBusy(false);
  }

  async function openRazorpayCheckout(
    orderId: string,
    data: { paymentId: string; gatewayOrderId: string; keyId?: string; amountInr: number }
  ) {
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      push("ai-text", "The Razorpay payment widget failed to load. Please check your connection and try again.");
      setBusy(false);
      return;
    }

    let settled = false;
    const rzp = new window.Razorpay({
      key: data.keyId,
      amount: Math.round(data.amountInr * 100),
      currency: "INR",
      name: "StrideX Sports",
      description: "MerchantOS order",
      order_id: data.gatewayOrderId,
      handler: (response) => {
        settled = true;
        finishRazorpayAttempt(orderId, {
          localPaymentId: data.paymentId,
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => {
          if (settled) return;
          settled = true;
          finishRazorpayAttempt(orderId, {
            localPaymentId: data.paymentId,
            failed: true,
            reason: "Customer closed the payment window before completing payment.",
          });
        },
      },
    });
    rzp.on("payment.failed", (response) => {
      if (settled) return;
      settled = true;
      finishRazorpayAttempt(orderId, {
        localPaymentId: data.paymentId,
        failed: true,
        reason: response.error?.description ?? "Payment was declined.",
      });
    });
    rzp.open();
  }

  function reset() {
    setMessages([]);
    setSessionId(null);
    setCartId(null);
    setSelectedProduct(null);
    setCrossSell(null);
    setQuery("");
  }

  const demoStarted = useRef(false);
  useEffect(() => {
    if (searchParams.get("demo") === "1" && !demoStarted.current) {
      demoStarted.current = true;
      setQuery(EXAMPLE_QUERY);
      runQuery(EXAMPLE_QUERY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="AI Buyer Simulator"
        subtitle="Simulate an AI agent shopping your store — from discovery to a real, policy-gated Razorpay checkout."
        actions={
          <Button variant="outline" size="sm" onClick={reset}>
            <RefreshCw size={14} /> New session
          </Button>
        }
      />

      <div className="mb-4 min-h-[200px] space-y-3">
        {messages.length === 0 && (
          <Card>
            <CardContent className="p-5 text-sm text-muted">
              Try: <span className="font-medium text-foreground">&ldquo;{EXAMPLE_QUERY}&rdquo;</span>
            </CardContent>
          </Card>
        )}
        {messages.map((m) => (
          <MessageRenderer key={m.id} msg={m} onAddToCart={addToCart} onPay={pay} busy={busy} />
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!query.trim() || busy) return;
          runQuery(query);
          setQuery("");
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe what the AI buyer is looking for…"
          className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/30"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !query.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function MessageRenderer({
  msg,
  onAddToCart,
  onPay,
  busy,
}: {
  msg: Msg;
  onAddToCart: (withCrossSell: boolean) => void;
  onPay: (orderId: string) => void;
  busy: boolean;
}) {
  switch (msg.kind) {
    case "user-text":
      return (
        <div className="flex justify-end">
          <div className="max-w-md rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2.5 text-sm text-white">{msg.payload as string}</div>
        </div>
      );
    case "ai-text":
      return <AiBubble>{msg.payload as string}</AiBubble>;
    case "steps": {
      const steps = msg.payload as Step[];
      return (
        <AiCard>
          <div className="space-y-3">
            {steps.map((s) => (
              <div key={s.label}>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">{s.label}</div>
                <div className="mt-1 space-y-0.5">
                  {s.checks.map((c) => (
                    <div key={c} className="flex items-center gap-1.5 text-sm">
                      <Check size={13} className="text-green" /> {c}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </AiCard>
      );
    }
    case "product": {
      const { product, reasons } = msg.payload as { product: Product; reasons: string[] };
      return (
        <AiCard>
          <div className="text-sm text-muted">AI selects:</div>
          <div className="mt-1 text-lg font-semibold">{product.name}</div>
          <div className="text-accent font-medium">{formatInr(product.priceInr)}</div>
          <div className="mt-2 space-y-1">
            {reasons.map((r) => (
              <div key={r} className="flex items-center gap-1.5 text-sm text-slate-700">
                <Check size={13} className="text-green" /> {r}
              </div>
            ))}
          </div>
        </AiCard>
      );
    }
    case "crosssell": {
      const cs = msg.payload as { product: Product; attachRatePct: number; avgAdditionalRevenueInr: number; fromProductName: string };
      return (
        <AiCard>
          <div className="text-sm text-slate-700">
            Customers purchasing <span className="font-medium">{cs.fromProductName}</span> often add{" "}
            <span className="font-medium">{cs.product.name}</span>. It&apos;s{" "}
            {formatInr(cs.product.priceInr)} today. ({cs.attachRatePct}% attach rate)
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => onAddToCart(true)}>
              Add them
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onAddToCart(false)}>
              No thanks, just this
            </Button>
          </div>
        </AiCard>
      );
    }
    case "no-crosssell": {
      const { product } = msg.payload as { product: Product };
      return (
        <AiCard>
          <div className="text-sm text-slate-700">
            Ready to add <span className="font-medium">{product.name}</span> to your cart?
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => onAddToCart(false)}>
              Add to cart
            </Button>
          </div>
        </AiCard>
      );
    }
    case "gate": {
      const { order, bundle, checks } = msg.payload as { order: OrderView; bundle: { subtotalInr: number; discountInr: number; totalInr: number }; checks: PolicyCheck[] };
      return (
        <AiCard>
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck size={15} className="text-accent" /> AI wants to take an action
          </div>
          <div className="text-sm">Action: <span className="font-medium">Create order &amp; charge payment</span></div>
          <div className="mt-2 space-y-1 text-sm">
            {order.items.map((it, i) => (
              <div key={i} className="flex justify-between text-slate-700">
                <span>{it.product.name}</span>
                <span>{formatInr(it.unitPriceInr * it.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between text-muted"><span>Subtotal</span><span>{formatInr(bundle.subtotalInr)}</span></div>
            {bundle.discountInr > 0 && (
              <div className="flex justify-between text-muted"><span>Discount</span><span>−{formatInr(bundle.discountInr)}</span></div>
            )}
            <div className="flex justify-between border-t border-border pt-1 font-semibold"><span>Total</span><span>{formatInr(bundle.totalInr)}</span></div>
          </div>
          <div className="mt-3 space-y-1">
            {checks.map((c) => (
              <div key={c.label} className={`flex items-center gap-1.5 text-xs ${c.passed ? "text-green" : "text-red"}`}>
                {c.passed ? <Check size={12} /> : <X size={12} />} {c.label}
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-slate-700">Your total is {formatInr(bundle.totalInr)}. Would you like me to proceed?</div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => onPay(order.id)}>
              Approve &amp; Pay
            </Button>
            <Button size="sm" variant="outline" disabled>
              Modify Order
            </Button>
          </div>
        </AiCard>
      );
    }
    case "blocked": {
      const { reason, checks } = msg.payload as { reason: string; checks: PolicyCheck[] };
      return (
        <AiCard tone="red">
          <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-red">
            <X size={15} /> Transaction Blocked
          </div>
          <div className="text-sm text-slate-700">{reason}</div>
          <div className="mt-2 space-y-1">
            {checks?.map((c) => (
              <div key={c.label} className={`flex items-center gap-1.5 text-xs ${c.passed ? "text-green" : "text-red"}`}>
                {c.passed ? <Check size={12} /> : <X size={12} />} {c.label} — {c.detail}
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-muted">No payment was initiated.</div>
        </AiCard>
      );
    }
    case "payment-failed": {
      const { reason, order } = msg.payload as { reason: string; order: OrderView };
      return (
        <AiCard tone="red">
          <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-red">
            <X size={15} /> Payment failed
          </div>
          <div className="text-sm text-slate-700">Reason: {reason}</div>
          <div className="mt-2 space-y-1 text-xs text-slate-600">
            <div className="flex items-center gap-1.5"><Check size={12} className="text-green" /> No order marked as paid</div>
            <div className="flex items-center gap-1.5"><Check size={12} className="text-green" /> No duplicate charge</div>
            <div className="flex items-center gap-1.5"><Check size={12} className="text-green" /> Cart preserved</div>
            <div className="flex items-center gap-1.5"><Check size={12} className="text-green" /> AI did not retry automatically without permission</div>
          </div>
          <div className="mt-2 text-sm text-slate-700">I couldn&apos;t complete the payment. Your cart is safe.</div>
          <Button size="sm" className="mt-3" disabled={busy} onClick={() => onPay(order.id)}>
            Retry Payment
          </Button>
        </AiCard>
      );
    }
    case "payment-success": {
      const order = msg.payload as OrderView;
      return (
        <AiCard tone="green">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-green">
            <Check size={15} /> Order confirmed
          </div>
          <div className="space-y-1 text-sm">
            {order.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <span>Payment #{p.attemptNumber}</span>
                <Badge variant={p.status === "PAID" ? "green" : p.status === "PAYMENT_FAILED" ? "red" : "outline"}>{p.status}</Badge>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-sm font-semibold">
            <span>Total charged</span>
            <span>{formatInr(order.totalInr)}</span>
          </div>
        </AiCard>
      );
    }
    default:
      return null;
  }
}

function AiBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
        <Bot size={13} />
      </div>
      <div className="max-w-md rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm text-foreground">{children}</div>
    </div>
  );
}

function AiCard({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "red" | "green" }) {
  const border = tone === "red" ? "border-red/30" : tone === "green" ? "border-green/30" : "border-border";
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
        <Sparkles size={13} />
      </div>
      <Card className={`max-w-md flex-1 ${border}`}>
        <CardContent className="p-4">{children}</CardContent>
      </Card>
    </div>
  );
}
