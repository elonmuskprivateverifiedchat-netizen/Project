import { useState } from "react";
import { TrendingUp, TrendingDown, Lock, Unlock, ArrowRight, AlertCircle, Activity, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTrades, useSocialWallet, useReleaseFunds } from "@/hooks/useApi";
import { formatCurrency, formatPercent, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

function PositionsTable({ trades, onRelease }: { trades: any[]; onRelease?: (id: string) => void }) {
  if (trades.length === 0) return (
    <div className="py-16 text-center text-muted-foreground">
      <TrendingUp size={32} className="mx-auto mb-3 opacity-25" />
      <p className="text-sm">No positions</p>
    </div>
  );

  return (
    <div className="rounded-lg border border-card-border overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-12 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/30 border-b border-border">
        <span className="col-span-2">Pair / Type</span>
        <span className="col-span-2 text-right">Entry Price</span>
        <span className="col-span-2 text-right">Current</span>
        <span className="col-span-2 text-right">Target</span>
        <span className="col-span-2 text-right">P&L</span>
        <span className="col-span-2 text-right">Status / Action</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {trades.map(trade => {
          const pnlPct = ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100 * (trade.type === "short" ? -1 : 1);
          const isProfit = trade.profit >= 0;
          const targetDist = Math.abs(trade.targetPrice - trade.entryPrice);
          const progress = targetDist > 0
            ? Math.min(100, Math.abs(trade.currentPrice - trade.entryPrice) / targetDist * 100)
            : 0;

          return (
            <div
              key={trade.id}
              className={`grid grid-cols-12 px-4 py-3 hover:bg-muted/15 transition-colors items-center ${
                isProfit ? "border-l-2 border-l-emerald-500/50" : "border-l-2 border-l-rose-500/50"
              }`}
            >
              {/* Pair + type */}
              <div className="col-span-2">
                <p className="text-[13px] font-bold text-foreground">{trade.pair}</p>
                <Badge variant="outline" className={`text-[9px] mt-0.5 ${trade.type === "long" ? "badge-buy" : "badge-sell"}`}>
                  {trade.type === "long" ? <TrendingUp size={8} className="mr-0.5" /> : <TrendingDown size={8} className="mr-0.5" />}
                  {trade.type.toUpperCase()}
                </Badge>
              </div>

              {/* Entry price */}
              <div className="col-span-2 text-right">
                <p className="num text-[12px] text-muted-foreground">{formatCurrency(trade.entryPrice)}</p>
              </div>

              {/* Current price */}
              <div className="col-span-2 text-right">
                <p className="num text-[12px] text-primary font-semibold">{formatCurrency(trade.currentPrice)}</p>
                {/* Progress bar toward target */}
                <div className="w-full h-0.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isProfit ? "bg-emerald-500" : "bg-rose-500"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Target price */}
              <div className="col-span-2 text-right">
                <p className="num text-[12px] text-foreground">{formatCurrency(trade.targetPrice)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{progress.toFixed(0)}% to target</p>
              </div>

              {/* P&L */}
              <div className="col-span-2 text-right">
                <p className={`num text-[13px] font-bold ${isProfit ? "text-profit" : "text-loss"}`}>
                  {isProfit ? "+" : ""}{formatCurrency(trade.profit)}
                </p>
                <p className={`num text-[10px] ${pnlPct >= 0 ? "text-profit" : "text-loss"}`}>
                  {formatPercent(pnlPct)}
                </p>
              </div>

              {/* Status / Action */}
              <div className="col-span-2 flex items-center justify-end gap-1.5">
                {trade.status === "active" && (
                  <Badge variant="outline" className="badge-active text-[9px]">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 mr-1" />
                    Active
                  </Badge>
                )}
                {trade.status === "completed" && !onRelease && (
                  <Badge variant="outline" className="badge-completed text-[9px]">Completed</Badge>
                )}
                {trade.status === "completed" && onRelease && (
                  <Button
                    size="sm"
                    className="h-6 text-[10px] px-2 bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/25 transition-colors"
                    onClick={() => onRelease(trade.id)}
                  >
                    <Unlock size={9} className="mr-1" />
                    Release
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Trading() {
  const { data: trades = [], isLoading } = useTrades();
  const { data: socialWallet } = useSocialWallet();
  const releaseFunds = useReleaseFunds();
  const { toast } = useToast();

  const activeTrades    = trades.filter((t: any) => t.status === "active");
  const completedTrades = trades.filter((t: any) => t.status === "completed");
  const totalPnl        = trades.reduce((s: number, t: any) => s + Number(t.profit || 0), 0);
  const winRate         = trades.length > 0
    ? (trades.filter((t: any) => Number(t.profit || 0) > 0).length / trades.length * 100).toFixed(0)
    : "—";

  const handleRelease = async (tradeId: string) => {
    const result = await releaseFunds.mutateAsync(tradeId);
    toast({
      title: result.success ? "Funds Released!" : "Release Failed",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
  };

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-5">
      {/* ── Header ── */}
      <div>
        <h1 className="text-[15px] font-semibold text-foreground">Trading Portfolio</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Active, completed and releasable positions</p>
      </div>

      {/* ── Portfolio metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-card-border rounded-lg p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Open Positions</p>
          <p className="num text-2xl font-bold text-foreground">{activeTrades.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">of {trades.length} total</p>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Portfolio P&L</p>
          <p className={`num text-2xl font-bold ${totalPnl >= 0 ? "text-profit" : "text-loss"}`}>
            {totalPnl >= 0 ? "+" : ""}{formatCurrency(totalPnl)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">All-time realized + open</p>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Completed</p>
          <p className="num text-2xl font-bold text-foreground">{completedTrades.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">trades closed</p>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-3.5 flex items-center gap-3">
          <Activity size={16} className="text-primary flex-shrink-0" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Win Rate</p>
            <p className="num text-2xl font-bold text-foreground">{winRate}%</p>
          </div>
        </div>
      </div>

      {/* ── Social Trading Wallet ── */}
      {socialWallet && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-[13px] font-bold text-foreground">Social Trading Wallet</h2>
                  {socialWallet.locked ? (
                    <Badge variant="outline" className="badge-pending text-[9px]">
                      <Lock size={9} className="mr-1" />Locked
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="badge-active text-[9px]">
                      <Unlock size={9} className="mr-1" />Available
                    </Badge>
                  )}
                </div>
                {socialWallet.locked && (
                  <p className="text-[11px] text-amber-400 flex items-center gap-1">
                    <AlertCircle size={11} />
                    Funds locked while {socialWallet.activeTrades} trade(s) are active
                  </p>
                )}
              </div>
              <div className="flex gap-8">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Total Profits</p>
                  <p className="num text-xl font-bold text-profit">{formatCurrency(socialWallet.totalProfits)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Pending</p>
                  <p className="num text-xl font-bold text-amber-400">{formatCurrency(socialWallet.pendingProfits)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Policy notice ── */}
      <Alert className="border-border bg-muted/20 py-2.5">
        <AlertCircle size={13} className="text-muted-foreground" />
        <AlertDescription className="text-[11px] text-muted-foreground">
          <strong className="text-foreground">Wallet lock policy:</strong> Funds stay locked in your trading wallet while positions are open. Release profits to your main wallet once a trade is completed.
        </AlertDescription>
      </Alert>

      {/* ── Positions Tabs ── */}
      <Tabs defaultValue="active">
        <TabsList className="h-8 bg-muted/40">
          <TabsTrigger value="active" className="text-[12px] h-7">
            Active
            {activeTrades.length > 0 && (
              <Badge className="ml-1.5 h-4 px-1.5 text-[9px] bg-primary text-primary-foreground">{activeTrades.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-[12px] h-7">
            Completed
            {completedTrades.length > 0 && (
              <Badge className="ml-1.5 h-4 px-1.5 text-[9px] bg-muted text-muted-foreground">{completedTrades.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <PositionsTable trades={activeTrades} />
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <PositionsTable trades={completedTrades} onRelease={handleRelease} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
