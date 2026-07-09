import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Activity, ShoppingCart, Store, Zap, Gift, Copy, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useWallets, useTransactions, useTrades, useSocialWallet, useUser, useReferralInfo } from "@/hooks/useApi";
import { formatCurrency, formatPercent, timeAgo } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const txTypeLabel: Record<string, { label: string; color: string }> = {
  deposit:      { label: "Deposit",      color: "badge-active" },
  withdrawal:   { label: "Withdrawal",   color: "bg-rose-500/15 text-rose-400 border-rose-500/20" },
  trade_profit: { label: "Trade Profit", color: "badge-completed" },
  p2p_buy:      { label: "P2P Buy",      color: "badge-pending" },
  p2p_sell:     { label: "P2P Sell",     color: "badge-pending" },
  transfer:     { label: "Transfer",     color: "bg-violet-500/15 text-violet-400 border-violet-500/20" },
};

export default function Dashboard() {
  const { toast } = useToast();
  const { data: user } = useUser();
  const { data: wallets = [], isLoading: walletsLoading } = useWallets();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { data: trades = [] } = useTrades();
  const { data: socialWallet } = useSocialWallet();
  const { data: referralInfo } = useReferralInfo();

  function copyReferralCode() {
    if (referralInfo?.referralCode) {
      navigator.clipboard.writeText(referralInfo.referralCode);
      toast({ title: "Referral code copied!" });
    }
  }

  const mainWallet    = wallets.find((w: any) => w.type === "main");
  const tradingWallet = wallets.find((w: any) => w.type === "trading");
  const activeTrades  = trades.filter((t: any) => t.status === "active");
  const totalEquity   = wallets.reduce((s: number, w: any) => s + Number(w.balance || 0), 0);
  const openPnl       = activeTrades.reduce((s: number, t: any) => s + Number(t.profit || 0), 0);

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-5">

      {/* ── Equity Summary Bar ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-[15px] font-semibold text-foreground">
              {user?.fullName?.split(" ")[0] ?? "Trader"}'s Account
            </h1>
            <p className="text-xs text-muted-foreground">Portfolio summary · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90">
              <Link href="/wallet"><ArrowDownRight size={13} className="mr-1.5" />Deposit</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-8 text-xs">
              <Link href="/wallet"><ArrowUpRight size={13} className="mr-1.5" />Withdraw</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total Equity */}
          <div className="bg-card border border-card-border rounded-lg p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Total Equity</p>
            {walletsLoading
              ? <Skeleton className="h-7 w-32" />
              : <p className="num text-2xl font-bold text-foreground">{formatCurrency(totalEquity)}</p>
            }
            <p className="text-[10px] text-muted-foreground mt-1">All wallets combined</p>
          </div>

          {/* Available Cash */}
          <div className="bg-card border border-card-border rounded-lg p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Available Cash</p>
            {walletsLoading
              ? <Skeleton className="h-7 w-28" />
              : <p className="num text-2xl font-bold text-foreground">{formatCurrency(mainWallet?.balance ?? 0)}</p>
            }
            <p className="text-[10px] text-muted-foreground mt-1">Main wallet · withdrawable</p>
          </div>

          {/* In Positions */}
          <div className="bg-card border border-card-border rounded-lg p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">In Positions</p>
            {walletsLoading
              ? <Skeleton className="h-7 w-24" />
              : <p className="num text-2xl font-bold text-amber-400">{formatCurrency(tradingWallet?.balance ?? 0)}</p>
            }
            <p className="text-[10px] text-muted-foreground mt-1">Trading wallet · {activeTrades.length} open trade{activeTrades.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Unrealized P&L */}
          <div className="bg-card border border-card-border rounded-lg p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Unrealized P&L</p>
            {walletsLoading
              ? <Skeleton className="h-7 w-24" />
              : <p className={`num text-2xl font-bold ${openPnl >= 0 ? "text-profit" : "text-loss"}`}>
                  {openPnl >= 0 ? "+" : ""}{formatCurrency(openPnl)}
                </p>
            }
            <p className="text-[10px] text-muted-foreground mt-1">Across active positions</p>
          </div>
        </div>
      </div>

      {/* ── Wallet Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {walletsLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-card-border">
                <CardContent className="p-4">
                  <Skeleton className="h-3 w-24 mb-3" />
                  <Skeleton className="h-7 w-32 mb-2" />
                  <Skeleton className="h-2.5 w-20" />
                </CardContent>
              </Card>
            ))
          : wallets.map((w: any) => (
              <Card key={w.id} className="border-card-border bg-card hover:border-primary/25 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${
                        w.type === "main" ? "bg-primary/15" : w.type === "trading" ? "bg-blue-500/15" : "bg-violet-500/15"
                      }`}>
                        <Wallet size={12} className={
                          w.type === "main" ? "text-primary" : w.type === "trading" ? "text-blue-400" : "text-violet-400"
                        } />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{w.label}</span>
                    </div>
                    {w.type === "trading" && activeTrades.length > 0 && (
                      <Badge variant="outline" className="text-[9px] badge-pending py-0 px-1.5">Locked</Badge>
                    )}
                  </div>
                  <p className="num text-xl font-bold text-foreground">{formatCurrency(w.balance, w.currency)}</p>
                  {w.pendingBalance > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      + <span className="num">{formatCurrency(w.pendingBalance, w.currency)}</span> pending
                    </p>
                  )}
                  {w.type === "trading" && activeTrades.length > 0 && (
                    <p className="text-[10px] text-amber-400 mt-1.5 flex items-center gap-1">
                      <Zap size={9} /> Locked · {activeTrades.length} active trade{activeTrades.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
        }
      </div>

      {/* ── Quick Actions ── */}
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" className="bg-primary hover:bg-primary/90 h-8 text-xs">
          <Link href="/buy"><ShoppingCart size={13} className="mr-1.5" />Buy Crypto</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
          <Link href="/trading"><TrendingUp size={13} className="mr-1.5" />View Trades</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
          <Link href="/p2p"><Store size={13} className="mr-1.5" />P2P Market</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
          <Link href="/wallet"><Wallet size={13} className="mr-1.5" />Wallet</Link>
        </Button>
      </div>

      {/* ── Open Positions ── */}
      {activeTrades.length > 0 && (
        <Card className="border-card-border">
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
                <Activity size={14} className="text-primary" />
                Open Positions
                <Badge variant="outline" className="text-[10px] badge-active">{activeTrades.length} active</Badge>
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-2">
                <Link href="/trading">View all →</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <div className="grid grid-cols-5 gap-0 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <span>Pair</span>
                <span>Type</span>
                <span className="text-right">Entry</span>
                <span className="text-right">Current</span>
                <span className="text-right">P&L</span>
              </div>
              {activeTrades.slice(0, 6).map((trade: any) => {
                const pnl = ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100 * (trade.type === "short" ? -1 : 1);
                const isUp = pnl >= 0;
                const targetDist = Math.abs(trade.targetPrice - trade.entryPrice);
                const progress = targetDist > 0 ? Math.min(100, Math.abs(trade.currentPrice - trade.entryPrice) / targetDist * 100) : 0;
                return (
                  <div key={trade.id} className={`px-4 py-2.5 hover:bg-muted/20 transition-colors ${isUp ? "border-l-2 border-l-emerald-500/40" : "border-l-2 border-l-rose-500/40"}`}>
                    <div className="grid grid-cols-5 gap-0 items-center">
                      <div>
                        <p className="text-[13px] font-bold text-foreground">{trade.pair}</p>
                        <div className="h-1 w-full bg-muted rounded-full mt-1 overflow-hidden">
                          <div className={`h-full rounded-full ${isUp ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] w-fit ${trade.type === "long" ? "badge-buy" : "badge-sell"}`}>
                        {trade.type.toUpperCase()}
                      </Badge>
                      <p className="num text-[12px] text-right text-muted-foreground">{formatCurrency(trade.entryPrice)}</p>
                      <p className="num text-[12px] text-right text-primary">{formatCurrency(trade.currentPrice)}</p>
                      <div className="text-right">
                        <p className={`num text-[12px] font-semibold ${isUp ? "text-profit" : "text-loss"}`}>
                          {isUp ? "+" : ""}{formatCurrency(trade.profit, trade.currency)}
                        </p>
                        <p className={`num text-[10px] ${isUp ? "text-profit" : "text-loss"}`}>{formatPercent(pnl)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Recent Transactions ── */}
        <div className="lg:col-span-2">
          <Card className="border-card-border">
            <CardHeader className="pb-2 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
                  <BarChart3 size={14} className="text-primary" /> Transaction History
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="h-6 text-[11px] text-muted-foreground px-2">
                  <Link href="/wallet">View all →</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {txLoading ? (
                <div className="px-4 py-3 space-y-2.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex gap-2.5 items-center">
                        <Skeleton className="w-7 h-7 rounded" />
                        <div><Skeleton className="h-3 w-28 mb-1.5" /><Skeleton className="h-2.5 w-16" /></div>
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="px-4 py-10 text-center text-muted-foreground text-sm">No transactions yet</div>
              ) : (
                <>
                  <div className="grid grid-cols-3 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <span>Transaction</span>
                    <span className="text-center">Type</span>
                    <span className="text-right">Amount</span>
                  </div>
                  <div className="divide-y divide-border">
                    {transactions.slice(0, 8).map((tx: any) => {
                      const meta = txTypeLabel[tx.type] ?? { label: tx.type, color: "bg-muted" };
                      const isCredit = ["deposit", "trade_profit", "p2p_sell"].includes(tx.type);
                      return (
                        <div key={tx.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${isCredit ? "bg-emerald-500/12" : "bg-rose-500/12"}`}>
                              {isCredit
                                ? <ArrowDownRight size={12} className="text-emerald-400" />
                                : <ArrowUpRight size={12} className="text-rose-400" />
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium text-foreground truncate">{tx.description}</p>
                              <p className="text-[10px] text-muted-foreground">{timeAgo(tx.createdAt)}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[9px] mx-3 flex-shrink-0 ${meta.color}`}>{meta.label}</Badge>
                          <div className="text-right flex-shrink-0">
                            <p className={`num text-[12px] font-semibold ${isCredit ? "text-profit" : "text-loss"}`}>
                              {isCredit ? "+" : "-"}{formatCurrency(tx.amount, tx.currency)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right sidebar widgets ── */}
        <div className="space-y-3">
          {/* Active trades summary */}
          <Card className="border-card-border">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
                <TrendingUp size={14} className="text-primary" /> Active Positions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {activeTrades.length === 0 ? (
                <p className="text-muted-foreground text-xs text-center py-3">No active positions</p>
              ) : (
                activeTrades.slice(0, 4).map((t: any) => {
                  const pnl = ((t.currentPrice - t.entryPrice) / t.entryPrice) * 100 * (t.type === "short" ? -1 : 1);
                  return (
                    <div key={t.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-[12px] font-semibold text-foreground">{t.pair}</p>
                        <Badge variant="outline" className={`text-[9px] mt-0.5 ${t.type === "long" ? "badge-buy" : "badge-sell"}`}>
                          {t.type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className={`num text-[12px] font-bold ${pnl >= 0 ? "text-profit" : "text-loss"}`}>
                          {formatPercent(pnl)}
                        </p>
                        <p className="num text-[10px] text-muted-foreground">{formatCurrency(t.profit)}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <Button asChild variant="outline" size="sm" className="w-full h-7 text-xs mt-1">
                <Link href="/trading">View Trading Portfolio</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Social wallet */}
          {socialWallet && (
            <Card className="border-card-border">
              <CardContent className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Social Trading</p>
                <p className="num text-xl font-bold text-profit">{formatCurrency(socialWallet.totalProfits)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Total profits earned</p>
                {socialWallet.pendingProfits > 0 && (
                  <p className="num text-[10px] text-amber-400 mt-1">+ {formatCurrency(socialWallet.pendingProfits)} pending</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Referral widget */}
          {referralInfo && (
            <Card className="border-card-border">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Referral</p>
                  <Gift size={12} className="text-amber-400" />
                </div>
                <p className="num text-lg font-bold text-foreground">{formatCurrency(referralInfo.totalEarned)}</p>
                <p className="text-[10px] text-muted-foreground">Total from referrals</p>
                {referralInfo.pendingEarned > 0 && (
                  <p className="num text-[10px] text-amber-400">+ {formatCurrency(referralInfo.pendingEarned)} pending</p>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  <code className="text-[11px] bg-muted px-2 py-1 rounded font-mono flex-1 truncate">{referralInfo.referralCode}</code>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={copyReferralCode}>
                    <Copy size={11} />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Earn $500 per verified referral</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
