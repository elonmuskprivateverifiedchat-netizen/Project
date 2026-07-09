import { Link } from "wouter";
import { TrendingUp, TrendingDown, Shield, Zap, Globe, ArrowRight, Activity, Lock, BarChart2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useForexRates, type ForexRate } from "@/hooks/useForexRates";

function PriceCell({ rate, prev }: { rate: ForexRate; prev?: ForexRate }) {
  const up = prev ? rate.price >= prev.price : rate.change24h >= 0;
  const color = up ? "text-emerald-400" : "text-rose-400";
  const bg = up ? "bg-emerald-500/10" : "bg-rose-500/10";

  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg ${bg} border border-white/5 transition-colors`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-mono font-semibold text-foreground text-sm w-20 shrink-0">{rate.pair}</span>
        <span className={`font-mono font-bold ${color} text-sm`}>
          {rate.price < 10 ? rate.price.toFixed(5) : rate.price < 1000 ? rate.price.toFixed(3) : rate.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {up ? <TrendingUp size={12} className="text-emerald-400" /> : <TrendingDown size={12} className="text-rose-400" />}
        <span className={`text-xs font-medium ${color}`}>
          {rate.change24h >= 0 ? "+" : ""}{rate.change24h.toFixed(3)}%
        </span>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: BarChart2, title: "15+ Forex Pairs", desc: "Majors, minors, metals & crypto — all in one platform" },
  { icon: Shield, title: "FCA Compliant", desc: "Regulated and audited to UK FCA and global standards" },
  { icon: Zap, title: "Instant Execution", desc: "Sub-millisecond order routing with deep liquidity pools" },
  { icon: Globe, title: "Global Access", desc: "Trade from anywhere — US, EU, Asia, Africa, 24/5" },
  { icon: Lock, title: "Institutional Security", desc: "End-to-end encryption, 2FA, and cold wallet custody" },
  { icon: Activity, title: "Live Analytics", desc: "Real-time P&L, position tracking, and smart alerts" },
];

export default function Home() {
  const { rates, connected } = useForexRates();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp size={16} className="text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">XpressProFX</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#markets" className="hover:text-foreground transition-colors">Markets</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#plans" className="hover:text-foreground transition-colors">Investment Plans</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth/login">
              <Button variant="ghost" size="sm" className="text-sm">Sign In</Button>
            </Link>
            <Link to="/auth/register">
              <Button size="sm" className="text-sm bg-primary hover:bg-primary/90">
                Get Started <ArrowRight size={14} className="ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge variant="outline" className="mb-6 text-primary border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium">
          🔴 Live Markets · 24/5 Trading
        </Badge>
        <h1 className="text-4xl md:text-6xl font-extrabold text-foreground leading-tight mb-5">
          Professional Forex Trading
          <br />
          <span className="text-primary">Built for Serious Traders</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
          Access institutional-grade forex, gold, and crypto markets with real-time pricing,
          advanced order types, and multi-asset portfolio management — all in one platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/auth/register">
            <Button size="lg" className="bg-primary hover:bg-primary/90 h-12 px-8 text-base font-semibold">
              Open Live Account <ArrowRight size={16} className="ml-2" />
            </Button>
          </Link>
          <Link to="/auth/login">
            <Button size="lg" variant="outline" className="h-12 px-8 text-base border-white/15 hover:bg-white/5">
              Try Demo — $10,000 Free
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Live Ticker ───────────────────────────────────────────────────── */}
      <section id="markets" className="max-w-6xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Live Market Prices</h2>
            <p className="text-xs text-muted-foreground">Streaming forex, metals & crypto rates</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {connected ? (
              <>
                <Wifi size={12} className="text-emerald-400" />
                <span className="text-emerald-400 font-medium">Live</span>
              </>
            ) : (
              <>
                <WifiOff size={12} className="text-muted-foreground" />
                <span className="text-muted-foreground">Connecting…</span>
              </>
            )}
          </div>
        </div>

        {rates.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {rates.map(rate => (
              <PriceCell key={rate.pair} rate={rate} />
            ))}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground/50 mt-4">
          Indicative prices · Updated every 2 seconds · {rates.length} instruments tracked
        </p>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Enterprise-Grade Trading Infrastructure</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Everything professional traders need — from advanced order execution to institutional-level security.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-5 rounded-xl border border-white/8 bg-white/2 hover:bg-white/5 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon size={20} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5 text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Investment Plans ──────────────────────────────────────────────── */}
      <section id="plans" className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Managed Investment Plans</h2>
          <p className="text-muted-foreground">Institutional quant strategies — from $500 to unlimited capital</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: "Starter", roi: 8, duration: 30, min: 500, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
            { name: "Growth", roi: 15, duration: 60, min: 5000, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
            { name: "Professional", roi: 25, duration: 90, min: 25000, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
            { name: "Elite", roi: 40, duration: 180, min: 100000, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
          ].map(plan => (
            <div key={plan.name} className={`p-5 rounded-xl border ${plan.bg}`}>
              <div className={`text-xs font-semibold ${plan.color} mb-3`}>{plan.name.toUpperCase()}</div>
              <div className={`text-3xl font-extrabold ${plan.color} mb-1`}>{plan.roi}%</div>
              <div className="text-xs text-muted-foreground mb-4">ROI · {plan.duration}-day term</div>
              <div className="text-xs text-muted-foreground mb-4">Min. ${plan.min.toLocaleString()} USDC</div>
              <Link to="/auth/register">
                <Button size="sm" variant="outline" className={`w-full text-xs border-current ${plan.color}`}>
                  Invest Now
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Ready to Start Trading?</h2>
          <p className="text-muted-foreground mb-6">Join thousands of traders. Open a live or demo account in under 2 minutes.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/auth/register">
              <Button size="lg" className="bg-primary hover:bg-primary/90 h-11 px-8 font-semibold">
                Create Free Account <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
            <Link to="/auth/login">
              <Button size="lg" variant="outline" className="h-11 px-8 border-white/15 hover:bg-white/5">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground/50">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-primary" />
            <span className="font-semibold text-muted-foreground">XpressProFX</span>
          </div>
          <p>© {new Date().getFullYear()} XpressProFX. Regulated · FCA Compliant · Secure</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
