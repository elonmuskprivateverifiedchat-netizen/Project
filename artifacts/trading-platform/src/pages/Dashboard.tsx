import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Activity, ShoppingCart, Store, Zap, Gift, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useWallets, useTransactions, useTrades, useSocialWallet, useUser, useReferralInfo } from "@/hooks/useApi";
import { formatCurrency, formatPercent, timeAgo } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const txTypeLabel: Record<string, { label: string; color: string }> = {
  deposit: { label: "Deposit", color: "badge-active" },
  withdrawal: { label: "Withdrawal", color: "bg-rose-500/15 text-rose-400 border-rose-500/20" },
  trade_profit: { label: "Trade Profit", color: "badge-completed" },
  p2p_buy: { label: "P2P Buy", color: "badge-pending" },
  p2p_sell: { label: "P2P Sell", color: "badge-pending" },
  transfer: { label: "Transfer", color: "bg-violet-500/15 text-violet-400 border-violet-500/20" },
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

  const mainWallet = wallets.find((w: any) => w.type === "main");
  const tradingWallet = wallets.find((w: any) => w.type === "trading");
  const activeTrades = trades.filter((t: any) => t.status === "active");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.fullName?.split(" ")[0] ?? "Trader"} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Here's your portfolio overview for today.</p>
      </div>

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {walletsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-card-border">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-28 mb-3" />
                <Skeleton className="h-8 w-36 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          wallets.map((w: any) => (
            <Card key={w.id} className="border-card-border bg-card hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{w.label}</span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    w.type === "main" ? "bg-primary/15" : w.type === "trading" ? "bg-blue-500/15" : "bg-violet-500/15"
                  }`}>
                    <Wallet size={14} className={
                      w.type === "main" ? "text-primary" : w.type === "trading" ? "text-blue-400" : "text-violet-400"
                    } />
                  </div>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(w.balance, w.currency)}
                </div>
                {w.pendingBalance > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    + {formatCurrency(w.pendingBalance, w.currency)} pending
                  </p>
                )}
                {w.type === "trading" && (
                  <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                    <Zap size={10} />
                    Locked during active trades
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href="/buy"><ShoppingCart size={15} className="mr-2" />Buy Crypto</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/trading"><TrendingUp size={15} className="mr-2" />View Trades</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/p2p"><Store size={15} className="mr-2" />P2P Market</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/wallet"><Wallet size={15} className="mr-2" />Connect Wallet</Link>
        </Button>
      </div>

      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            Ongoing Trading Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeTrades.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ongoing trades right now.</p>
          ) : (
            activeTrades.slice(0, 5).map((trade: any) => {
              const movement = ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100 * (trade.type === "short" ? -1 : 1);
              const targetDistance = Math.abs(trade.targetPrice - trade.entryPrice);
              const progress = targetDistance > 0 ? Math.min(100, Math.max(0, Math.abs(trade.currentPrice - trade.entryPrice) / targetDistance * 100)) : 0;
              return (
                <div key={trade.id} className="p-4 rounded-xl bg-muted/20 border border-border">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{trade.pair} <span className="text-xs text-muted-foreground uppercase">({trade.type})</span></p>
                      <p className="text-xs text-muted-foreground">Entry {formatCurrency(trade.entryPrice)} · Current {formatCurrency(trade.currentPrice)} · Target {formatCurrency(trade.targetPrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${movement >= 0 ? "text-profit" : "text-loss"}`}>{formatPercent(movement)}</p>
                      <p className="text-xs text-muted-foreground">P/L {formatCurrency(trade.profit, trade.currency)}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${movement >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent transactions */}
        <div className="lg:col-span-2">
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity size={16} className="text-primary" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {txLoading ? (
                <div className="px-5 py-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex gap-3 items-center">
                        <Skeleton className="w-8 h-8 rounded-lg" />
                        <div>
                          <Skeleton className="h-3 w-28 mb-1.5" />
                          <Skeleton className="h-2.5 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="px-5 py-10 text-center text-muted-foreground text-sm">No transactions yet</div>
              ) : (
                <div className="divide-y divide-border">
                  {transactions.slice(0, 7).map((tx: any) => {
                    const meta = txTypeLabel[tx.type] ?? { label: tx.type, color: "bg-muted" };
                    const isCredit = ["deposit", "trade_profit", "p2p_sell"].includes(tx.type);
                    return (
                      <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCredit ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
                            {isCredit
                              ? <ArrowDownRight size={14} className="text-emerald-400" />
                              : <ArrowUpRight size={14} className="text-rose-400" />
                            }
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">{timeAgo(tx.createdAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${isCredit ? "text-profit" : "text-loss"}`}>
                            {isCredit ? "+" : "-"}{formatCurrency(tx.amount, tx.currency)}
                          </p>
                          <Badge variant="outline" className={`text-[10px] mt-0.5 ${meta.color}`}>
                            {meta.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active trades summary */}
        <div className="space-y-4">
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                Active Trades
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeTrades.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No active trades</p>
              ) : (
                activeTrades.slice(0, 3).map((t: any) => {
                  const pnl = ((t.currentPrice - t.entryPrice) / t.entryPrice) * 100 * (t.type === "short" ? -1 : 1);
                  return (
                    <div key={t.id} className="flex items-center justify-between bg-muted/40 rounded-lg p-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t.pair}</p>
                        <Badge variant="outline" className={`text-[10px] mt-0.5 ${t.type === "long" ? "badge-active" : "bg-amber-500/15 text-amber-400 border-amber-500/20"}`}>
                          {t.type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${pnl >= 0 ? "text-profit" : "text-loss"}`}>
                          {formatPercent(pnl)}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(t.profit)}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/trading">View All Trades</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Social wallet quick info */}
          {socialWallet && (
            <Card className="border-card-border bg-gradient-to-br from-primary/10 to-transparent">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Social Trading</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(socialWallet.totalProfits)}</p>
                <p className="text-xs text-muted-foreground mt-1">Total profits earned</p>
                {socialWallet.pendingProfits > 0 && (
                  <p className="text-xs text-amber-400 mt-1">+ {formatCurrency(socialWallet.pendingProfits)} pending</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Referral widget */}
          {referralInfo && (
            <Card className="border-card-border bg-gradient-to-br from-amber-500/10 to-transparent">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Referral Program</p>
                  <Gift size={14} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(referralInfo.totalEarned)}</p>
                  <p className="text-xs text-muted-foreground">Total earned from referrals</p>
                </div>
                {referralInfo.pendingEarned > 0 && (
                  <p className="text-xs text-amber-400">+ {formatCurrency(referralInfo.pendingEarned)} pending</p>
                )}
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono flex-1 truncate">{referralInfo.referralCode}</code>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={copyReferralCode}>
                    <Copy size={12} />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Earn $500 for every friend who registers & trades</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
