# MerchantOS — The AI Merchant Operating System

> "Sell more to humans. Sell directly to AI."

MerchantOS is an AI merchant operating system for Razorpay merchants. It has two
integrated modes powered by one intelligence layer:

- **Grow Revenue** — an AI sales agent that finds upsell, cross-sell, cart-recovery,
  and campaign opportunities in the merchant's own data.
- **AI Commerce** — a catalog, cart, and checkout that an AI *buyer* agent can
  discover and transact against, through a real order → payment → confirmation
  lifecycle on Razorpay.

Every money-moving action is **explainable**, **bounded**, and **gated** — see
[Safety](#safety) below. Demo merchant: **StrideX Sports**, a fictional sports
e-commerce store, seeded with 50 products, 100 customers, 500 orders, abandoned
carts, campaigns, and product affinities.

## Problem

Merchants are built to sell to humans through websites and apps. AI agents are
emerging as a new commerce interface — but most stores are invisible to them:
no structured catalog, no policy-aware checkout, no safe way for an autonomous
buyer to complete a purchase. Separately, most merchants leave revenue on the
table simply because no one is continuously mining their own order history for
upsell/cross-sell/recovery opportunities.

## Solution

One intelligence layer, two surfaces:

```
                          MERCHANT DATA
                    (products, orders, customers,
                   affinities, carts, campaigns)
                               |
                               v
                    MERCHANTOS INTELLIGENCE LAYER
                    (tool functions + reasoning)
                       /                    \
                      v                      v
              GROW AGENT              AI COMMERCE AGENT
              - upsell                - catalog discovery
              - cross-sell            - conversational checkout
              - cart recovery         - cart assembly
              - campaign planning     - payment execution
                      \                    /
                       v                  v
                        POLICY ENGINE
                     (checkPolicy: limits,
                    categories, daily cap)
                               |
                               v
                        APPROVAL GATE
                  (explicit user action required
                     for every MONEY tool call)
                               |
                               v
                        RAZORPAY (test mode)
                               |
                               v
                         AUDIT TRAIL
                   (every tool call logged:
                  actor, action, amount, reason,
                    policy result, outcome)
```

```
   Human Buyer ─┐
                ├──▶  MerchantOS Agent  ─────────▶──  Razorpay (test mode)
   AI Buyer ────┘
```

## Architecture

Full-stack Next.js 16 (App Router) + TypeScript monolith:

- **Frontend**: React 19, Tailwind CSS v4, Recharts, hand-built UI primitives
  (Radix UI under the hood for Tabs/Dialog/Switch).
- **Backend**: Next.js Route Handlers (`src/app/api/**`) — no separate server.
- **Database**: SQLite via Prisma (`prisma/schema.prisma`), zero-config for
  local/demo use. Swap the datasource `provider` to `postgresql` and set
  `DATABASE_URL` to a real Postgres instance for production; the schema uses
  only cross-compatible types.
- **AI agent layer**: `src/lib/agent/` — tool functions, deterministic intent
  parsing/ranking, and reasoning. See [AI Agent](#ai-agent) below.
- **Payments**: `src/lib/payments/` — `RazorpayGateway` integrates the real
  Razorpay **test-mode** Orders API: order creation, the client-side Checkout
  widget, and server-side HMAC signature verification (`verifyPayment`).
- **Policy engine**: `src/lib/policy.ts` — the single choke point every
  MONEY-category tool call passes through.
- **Audit log**: `src/lib/audit.ts` — every tool call is written to the
  `AiAction` table; this is the literal data behind the AI Activity and Trust
  Center pages (nothing there is hard-coded UI copy).

### Project structure

```
prisma/schema.prisma        Data model (Merchant, Product, Customer, Order,
                             Payment, Campaign, AiOpportunity, AiAction, ...)
prisma/seed.ts               CLI seed entrypoint
src/lib/seed-runner.ts       Deterministic seed logic (shared with /api/demo/reset)
src/lib/seedData.ts          The 50-SKU catalog + name lists + campaign templates
src/lib/db.ts                Prisma client singleton
src/lib/policy.ts            Guardrail evaluation (checkPolicy)
src/lib/audit.ts             Audit logging + Trust Center stats
src/lib/payments/            Razorpay Test Mode integration + explicit payment
                             state machine
src/lib/agent/
  tools.ts                   The agent's tool surface (READ/WRITE/MONEY)
  intent.ts                  Deterministic buyer-query parser
  reasoning.ts                Deterministic product ranking against parsed intent
src/app/(app)/...            Dashboard pages (sidebar shell)
src/app/api/...              Route handlers (the "backend")
src/app/page.tsx             Public landing page
```

## AI Agent

The agent never touches Prisma directly — it can only call the functions in
`src/lib/agent/tools.ts`, every one of which is logged. Tools are categorized
by risk, matching what's shown on the Trust Center page:

| Category | Tools | Behavior |
|---|---|---|
| **READ** | `search_products`, `get_product`, `check_inventory`, `get_customer`, `get_order_history`, `get_product_affinities` | Execute freely, logged for traceability. |
| **WRITE** | `create_cart`, `add_cart_item`, `apply_discount` | Logged; discount *proposals* still require `checkPolicy` before any money moves. |
| **MONEY** | `create_order`, `initiate_payment` (creates the gateway order + resolves/attempts the charge), `verify_payment` | Policy-gated. `create_order` runs `checkPolicy` first and is **idempotent** on a caller-supplied key — calling it twice with the same key returns the existing order instead of creating a duplicate. |

**Why deterministic instead of a live LLM call for the core decisions?**
Buyer-intent parsing, product ranking, opportunity reasoning, and the campaign
planner are all rule-based, operating over real tool-call results — not
free-form LLM generation. This is a deliberate choice for a judged demo: it's
reproducible run-to-run, every number traces back to a database query (the
agent can never hallucinate a price, stock count, or payment status), and it
still demonstrates genuinely agentic behavior — the system reasons over tools,
checks policy, and executes bounded actions. `@anthropic-ai/sdk` is installed
and `ANTHROPIC_API_KEY` is wired through (`/api/settings/status` reports
whether it's configured) as a pluggable extension point for teams that want to
add live LLM-generated copy on top of this deterministic core.

### Decision object

Every proposed MONEY action is represented internally the same way, and this
shape is what the Action Gate UI renders:

```ts
{
  action: "create_order",
  reason: "...",
  amountInr: 4463,
  expectedImpactInr: 12400,
  confidencePct: 91,
  policyChecks: [{ label, passed, detail }, ...],
  approvalRequired: true,
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED",
}
```

## Safety

**Explainable** — every AI money action logs a plain-language business reason
(purchase affinity %, abandoned-cart value, segment size) — see `AiAction.reason`.

**Bounded** — `checkPolicy()` evaluates every MONEY action against merchant-configured
limits before it can execute: max transaction amount, max discount %, allowed
categories, and a cumulative **daily AI spend cap** (summed from `create_order`
successes only — see the note in `policy.ts` about why other MONEY-tagged log
lines for the same order aren't double-counted). Configurable on the
**Policies & Guardrails** page.

**Gated** — `requireApprovalPayment` (on by default) means no payment is ever
silently initiated; the UI always renders an explicit **Approve & Pay** step
before `initiate_payment` is called.

The **Trust Center** (AI Activity → Trust Center tab) shows a live blocked-transaction
example: the AI attempting to purchase the ₹18,999 *StrideX Pulse Elite* watch
against the merchant's ₹10,000 per-transaction limit — request rejected, zero
payment initiated, fully logged.

## Payments — Razorpay integration

`src/lib/payments/` integrates the real Razorpay **Test Mode** Orders API
through an explicit state machine (`CREATED → PENDING_APPROVAL → APPROVED →
PAYMENT_INITIATED → PAID`, with `PAYMENT_FAILED → RETRY_PENDING →
PAYMENT_INITIATED` as the only path back from a failure — a failed payment can
never silently become `PAID`).

`RazorpayGateway` creates a real Razorpay test-mode Order via the Orders API;
the client-side Razorpay Checkout widget collects the (test) card, and the
result is verified server-side with an HMAC signature check (`verifyPayment`)
— never trusted blindly.

Note: a real gateway doesn't fail on its own the way a mock would. To see the
failure → retry flow, pay with one of Razorpay's test cards that's documented
to always get declined — a normal test card will simply succeed.

## Demo instructions

```bash
npm install
npx prisma db push      # creates dev.db from prisma/schema.prisma
npm run db:seed         # deterministic seed: products, customers, orders, ...
npm run dev             # http://localhost:3000
```

Suggested walkthrough (5–7 min):

1. **Landing page** (`/`) — the two-mode story, proof points.
2. **Overview** (`/overview`) — "Your AI found ₹X in potential revenue" banner,
   metrics, revenue chart, top opportunities. Click **Approve** on one.
3. **AI Buyer Simulator** (`/ai-commerce/buyer`, or `/ai-commerce/buyer?demo=1`
   to auto-run the canned query) — type or accept:
   *"I need running shoes under ₹5,000, size 9, for daily running. I prefer
   lightweight shoes."* Watch it reason through Understanding → Searching →
   Filtering → Ranking, select **StrideX ProRun X1**, recommend **Performance
   Socks** (72% attach rate), click **Add them**, then **Approve & Pay** on the
   policy-gated order summary.
4. **Payment fails** — pay with one of Razorpay's test cards that always
   declines (or just close the Checkout popup) to see: cart preserved, no
   duplicate charge, no silent retry. Click **Retry Payment**, complete it
   with a valid test card → **Order confirmed** with a Payment #1 FAILED /
   Payment #2 PAID timeline.
5. **AI Activity → Audit Trail** — every step above, logged with timestamps.
6. **AI Activity → Trust Center** — Explainable/Bounded/Gated pillars, today's
   action counts, the ₹18,999 blocked-transaction example.
7. **Grow Revenue** — Product Affinity Map, "Complete Your Run" upsell demo,
   AI Revenue Attribution.
8. **Campaigns** — type a goal ("Increase revenue by 15% this weekend without
   discounting more than 10%"), **Generate Plan**, **Approve Plan**.

## Metrics

- **AI Revenue Attribution** (`/grow-revenue`): baseline vs. AI-assisted
  revenue, incremental revenue (AI cross-sell item revenue + realized
  opportunity/campaign impact), cross-sell/upsell conversion, cart recovery
  rate, average AI order uplift — all computed live from `/api/attribution`.
- **AI Commerce metrics** (`/ai-commerce`): buyer requests, catalog discovery
  success, product match rate, checkout completion, payment success, AI-assisted
  GMV — blended from a documented historical baseline plus whatever you do live
  in the current session (see `blend()` in `/api/ai-commerce/metrics/route.ts`).

## Environment variables

See `.env.example`. Nothing is hard-coded; secrets are never sent to the client.

| Variable | Required? | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Prisma datasource. Defaults to local SQLite (`file:./dev.db`). |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Yes | Real Razorpay **test-mode** keys — generate free ones from the Razorpay Dashboard (Test Mode → Settings → API Keys). |
| `ANTHROPIC_API_KEY` | No | Reserved extension point (see AI Agent section). Unused by the core deterministic flows. |
| `DEMO_FORCE_FIRST_ATTEMPT_FAILURE` | No (default `true`) | Keeps the failure/retry demo deterministic. Set to `false` for an always-succeeds gateway. |

## Known limitations

- SQLite is used for zero-config local demo purposes; the schema is Postgres-portable
  but hasn't been run against Postgres in this environment.
- Buyer-intent parsing is regex/rule-based, not a live LLM call (see rationale
  above) — unusual free-text phrasing may not parse every field, though the
  search step degrades gracefully (widens the filter rather than failing).
- Single-merchant demo (no multi-tenant auth) — deliberately out of scope for
  a hackathon MVP.

---

Built for the [Razorpay Buildathon](https://razorpay.com/buildathon/).
