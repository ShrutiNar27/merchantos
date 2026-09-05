import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, ShoppingBag, ArrowRight, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex-1 bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
            <Sparkles size={16} />
          </div>
          <span className="font-semibold">MerchantOS</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/overview">Dashboard →</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-10 text-center">
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          <Sparkles size={12} /> Built for Razorpay merchants
        </div>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          The AI employee that helps your store sell more.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
          MerchantOS finds revenue opportunities, converts AI shoppers, and executes commerce safely through Razorpay.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/overview">
              Launch MerchantOS <ArrowRight size={16} />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/ai-commerce/buyer?demo=1">See AI Commerce in Action</Link>
          </Button>
        </div>

        <div className="mx-auto mt-14 grid max-w-2xl grid-cols-1 gap-3 rounded-2xl border border-border bg-surface p-5 text-left text-sm sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span className="text-lg">🧑</span>
            <span>Human Buyer</span>
            <ArrowRight size={13} className="text-muted" />
            <span className="font-medium">MerchantOS</span>
            <ArrowRight size={13} className="text-muted" />
            <span>Razorpay</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span className="text-lg">🤖</span>
            <span>AI Buyer</span>
            <ArrowRight size={13} className="text-muted" />
            <span className="font-medium">MerchantOS</span>
            <ArrowRight size={13} className="text-muted" />
            <span>Razorpay</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <TrendingUp className="mb-3 text-accent" size={22} />
            <h3 className="text-lg font-semibold">Grow Revenue</h3>
            <p className="mt-1 text-sm text-muted">
              An AI sales team that finds upsells, cross-sells, cart recovery, and campaign opportunities — every action policy-gated and logged.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <ShoppingBag className="mb-3 text-accent" size={22} />
            <h3 className="text-lg font-semibold">AI Commerce</h3>
            <p className="mt-1 text-sm text-muted">
              A catalog, checkout, and payment flow AI agents can actually discover and transact against — through real Razorpay test-mode payments.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-slate-900 py-16 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            <ShieldCheck size={13} /> Your merchant is now AI-native
          </div>
          <div className="grid grid-cols-1 gap-8 pt-6 sm:grid-cols-3">
            <div>
              <div className="text-3xl font-semibold text-emerald-400">₹84,200</div>
              <div className="mt-1 text-sm text-slate-300">AI-attributed incremental revenue</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-emerald-400">96.4%</div>
              <div className="mt-1 text-sm text-slate-300">AI commerce discovery success</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-emerald-400">100%</div>
              <div className="mt-1 text-sm text-slate-300">Money actions policy-checked</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-muted">
        Sell more to humans. Sell directly to AI. · Razorpay Test Mode — no real money moves in this demo.
      </footer>
    </div>
  );
}
