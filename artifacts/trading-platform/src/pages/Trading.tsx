import { useState } from "react";
import { TrendingUp, TrendingDown, Lock, Unlock, ArrowRight, AlertCircle, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTrades, useSocialWallet, useReleaseFunds } from "@/hooks/useApi";
import { formatCurrency, formatPercent, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

function TradeCard({ trade, onRelease }: { trade: any; onRelease?: (id: string) => void }) {
  const pnlPct = ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100 * (trade.type === "short" ? -1 : 1);
  const isProfit = trade.profit >= 0;

  return (
    <Card className="border-card-border hover:border-primary/30 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${trade.type === "long" ? "bg-emerald-500/15" : "bg-amber-500/15"}`}>
              {trade.type === "long" ? (
                <TrendingUp size={18} className="text-emerald-400" />
              ) : (
                <TrendingDown size={18} className="text-amber-400" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-foreground text-lg">{trade.pair}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={trade.type === "long" ? "badge-active" : "bg-amber-500/15 text-amber-400 border-amber-500/20"}>
                  {trade.type.toUpperCase()}
                </Badge>
                <Badge variant="outline" className={trade.status === "active" ? "badge-active" : "badge-completed"}>
                  {trade.status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-xl font-bold ${isProfit ? "text-profit" : "text-loss"}`}>
              {isProfit ? "+" : ""}{formatCurrency(trade.profit)}
            </p>
            <p className={`text-sm ${pnlPct >= 0 ? "text-profit" : "text-loss"}`}>
              {formatPercent(pnlPct)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-muted/40 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Entry</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{formatCurrency(trade.entryPrice)}</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Current</p>
            <p className="text-sm font-semibold text-primary mt-0.5">{formatCurrency(trade.currentPrice)}</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-2.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Target</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{formatCurrency(trade.targetPrice)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Amount: <span className="text-foreground font-medium">{formatCurrency(trade.amount, trade.currency)}</span></span>
          {trade.status === "active" && (
            <span>Expected: <span className="text-profit font-medium">+{formatCurrency(trade.expectedProfit)}</span></span>
          )}
          {trade.status === "completed" && (
            <span className="text-muted-foreground">{formatDate(trade.completedAt)}</span>
          )}
        </div>

        {trade.status === "completed" && onRelease && (
          <Button
            className="w-full mt-4 bg-primary hover:bg-primary/90"
            size="sm"
            onClick={() => onRelease(trade.id)}
          >
            <Unlock size={14} className="mr-2" />
            Release Funds to Main Wallet
            <ArrowRight size={14} className="ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function Trading() {
  const { data: trades = [], isLoading } = useTrades();
  const { data: socialWallet } = useSocialWallet();
  const releaseFunds = useReleaseFunds();
  const { toast } = useToast();

  const activeTrades = trades.filter((t: any) => t.status === "active");
  const completedTrades = trades.filter((t: any) => t.status === "completed");

  const handleRelease = async (tradeId: string) => {
    const result = await releaseFunds.mutateAsync(tradeId);
    toast({
      title: result.success ? "Funds Released!" : "Release Failed",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Live Trading Portfolio</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor active, completed, locked, and releasable trade positions</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-card-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Open Positions</p>
            <p className="text-2xl font-bold text-foreground mt-1">{activeTrades.length}</p>
          </CardContent>
        </Card>
        <Card className="border-card-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Portfolio P/L</p>
            <p className="text-2xl font-bold text-profit mt-1">{formatCurrency(trades.reduce((sum: number, t: any) => sum + Number(t.profit || 0), 0))}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity size={18} className="text-primary" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Live Refresh</p>
              <p className="text-sm font-semibold text-foreground">Every 5 seconds</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Social Trading Wallet */}
      {socialWallet && (
        <Card className="border-card-border bg-gradient-to-r from-primary/10 via-card to-card">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-bold text-foreground text-lg">Social Trading Wallet</h2>
                  {socialWallet.locked ? (
                    <Badge variant="outline" className="badge-pending">
                      <Lock size={10} className="mr-1" />Locked
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="badge-active">
                      <Unlock size={10} className="mr-1" />Available
                    </Badge>
                  )}
                </div>
                {socialWallet.locked && (
                  <p className="text-xs text-amber-400 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Funds locked while {socialWallet.activeTrades} trade(s) are active
                  </p>
                )}
              </div>
              <div className="flex gap-6 sm:gap-10">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Profits</p>
                  <p className="text-2xl font-bold text-profit">{formatCurrency(socialWallet.totalProfits)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
                  <p className="text-2xl font-bold text-amber-400">{formatCurrency(socialWallet.pendingProfits)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Alert className="border-primary/20 bg-primary/5">
        <AlertCircle size={14} className="text-primary" />
        <AlertDescription className="text-sm text-muted-foreground">
          <strong className="text-foreground">Trading Wallet Policy:</strong> Funds remain locked in your trading wallet during active trades. Once a trade completes, you can release profits directly to your main wallet.
        </AlertDescription>
      </Alert>

      {/* Trades tabs */}
      <Tabs defaultValue="active">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="active">
            Active Trades
            {activeTrades.length > 0 && (
              <Badge className="ml-2 bg-primary/20 text-primary text-[10px] px-1.5">{activeTrades.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed Trades
            {completedTrades.length > 0 && (
              <Badge className="ml-2 bg-muted text-muted-foreground text-[10px] px-1.5">{completedTrades.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-card-border"><CardContent className="p-5"><Skeleton className="h-32 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : activeTrades.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
              <p>No active trades at the moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTrades.map((t: any) => <TradeCard key={t.id} trade={t} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedTrades.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
              <p>No completed trades yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedTrades.map((t: any) => (
                <TradeCard key={t.id} trade={t} onRelease={handleRelease} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
