import { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Activity, Play, Square, RotateCcw, Zap, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatPercent } from "@/lib/format";

const PAIRS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "Gold/USD", "Oil/USD"];
const INITIAL_BALANCE = 100000;

const BASE_PRICES: Record<string, number> = {
  "BTC/USDT": 94250, "ETH/USDT": 3485, "SOL/USDT": 178.5, "BNB/USDT": 615,
  "XRP/USDT": 2.34, "EUR/USD": 1.0872, "GBP/USD": 1.2641, "USD/JPY": 151.82,
  "AUD/USD": 0.6534, "Gold/USD": 2345.5, "Oil/USD": 82.45,
};

interface DemoTrade {
  id: string;
  pair: string;
  type: "long" | "short";
  entryPrice: number;
  currentPrice: number;
  amount: number;
  leverage: number;
  pnl: number;
  pnlPct: number;
  openedAt: Date;
  status: "open" | "closed";
  closePrice?: number;
}

function PriceChart({ pair, prices }: { pair: string; prices: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prices.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const min = Math.min(...prices) * 0.9995;
    const max = Math.max(...prices) * 1.0005;
    const range = max - min;

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    const isUp = prices[prices.length - 1] >= prices[0];
    grad.addColorStop(0, isUp ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    // Line
    ctx.beginPath();
    prices.forEach((p, i) => {
      const x = (i / (prices.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = isUp ? "#10b981" : "#ef4444";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }, [prices]);

  return <canvas ref={canvasRef} width={400} height={120} className="w-full h-28 rounded-lg" />;
}

export default function DemoTrading() {
  const { toast } = useToast();
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [tradeType, setTradeType] = useState<"long" | "short">("long");
  const [amount, setAmount] = useState("1000");
  const [leverage, setLeverage] = useState("1");
  const [trades, setTrades] = useState<DemoTrade[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({ ...BASE_PRICES });
  const [priceHistory, setPriceHistory] = useState<number[]>([BASE_PRICES["BTC/USDT"]]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simulate live prices
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setPrices(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(pair => {
          const change = (Math.random() - 0.49) * 0.001;
          updated[pair] = +(updated[pair] * (1 + change)).toFixed(pair.includes("USD/JPY") ? 3 : 6);
        });
        return updated;
      });

      setPriceHistory(prev => {
        const newPrices = [...prev, prices[selectedPair]].slice(-60);
        return newPrices;
      });

      // Update open trades P&L
      setTrades(prev => prev.map(t => {
        if (t.status !== "open") return t;
        const current = prices[t.pair] || t.currentPrice;
        const direction = t.type === "long" ? 1 : -1;
        const pnlPct = ((current - t.entryPrice) / t.entryPrice) * 100 * direction * t.leverage;
        const pnl = t.amount * (pnlPct / 100);
        return { ...t, currentPrice: current, pnl, pnlPct };
      }));
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [selectedPair, prices]);

  const currentPrice = prices[selectedPair];
  const prevPrice = priceHistory[priceHistory.length - 2] || currentPrice;
  const priceChange = ((currentPrice - prevPrice) / prevPrice) * 100;

  function openTrade() {
    const amt = parseFloat(amount);
    const lev = parseInt(leverage);
    if (isNaN(amt) || amt <= 0 || amt > balance) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    const trade: DemoTrade = {
      id: Date.now().toString(),
      pair: selectedPair,
      type: tradeType,
      entryPrice: currentPrice,
      currentPrice,
      amount: amt,
      leverage: lev,
      pnl: 0,
      pnlPct: 0,
      openedAt: new Date(),
      status: "open",
    };
    setTrades(prev => [trade, ...prev]);
    setBalance(b => b - amt);
    toast({ title: `${tradeType.toUpperCase()} position opened`, description: `${selectedPair} @ ${currentPrice.toFixed(4)}` });
  }

  function closeTrade(id: string) {
    setTrades(prev => prev.map(t => {
      if (t.id !== id) return t;
      const closed = { ...t, status: "closed" as const, closePrice: t.currentPrice };
      setBalance(b => b + t.amount + t.pnl);
      toast({
        title: `Position closed`,
        description: `P&L: ${t.pnl >= 0 ? "+" : ""}${formatCurrency(t.pnl)}`,
      });
      return closed;
    }));
  }

  function resetDemo() {
    setBalance(INITIAL_BALANCE);
    setTrades([]);
    setPrices({ ...BASE_PRICES });
    toast({ title: "Demo account reset", description: "Balance restored to $100,000" });
  }

  const openTrades = trades.filter(t => t.status === "open");
  const closedTrades = trades.filter(t => t.status === "closed");
  const totalPnl = openTrades.reduce((s, t) => s + t.pnl, 0);
  const totalValue = balance + openTrades.reduce((s, t) => s + t.amount, 0) + totalPnl;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap size={24} className="text-primary" /> Demo Trading
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Practice risk-free with $100,000 virtual funds.</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 px-3 py-1">Demo Mode</Badge>
          <Button variant="outline" size="sm" onClick={resetDemo} className="gap-2">
            <RotateCcw size={14} /> Reset
          </Button>
        </div>
      </div>

      {/* Portfolio overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Available Balance", value: formatCurrency(balance), color: "text-foreground" },
          { label: "Total Portfolio", value: formatCurrency(totalValue), color: "text-foreground" },
          { label: "Open P&L", value: `${totalPnl >= 0 ? "+" : ""}${formatCurrency(totalPnl)}`, color: totalPnl >= 0 ? "text-profit" : "text-loss" },
          { label: "Open Positions", value: openTrades.length.toString(), color: "text-foreground" },
        ].map(item => (
          <Card key={item.label} className="border-card-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-xl font-bold mt-1 ${item.color}`}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart + Price */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Select value={selectedPair} onValueChange={setSelectedPair}>
                    <SelectTrigger className="w-36 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div>
                    <span className="text-xl font-bold text-foreground">{currentPrice.toFixed(currentPrice > 10 ? 2 : 4)}</span>
                    <span className={`ml-2 text-sm font-medium ${priceChange >= 0 ? "text-profit" : "text-loss"}`}>
                      {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(3)}%
                    </span>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </CardHeader>
            <CardContent>
              <PriceChart pair={selectedPair} prices={priceHistory} />
            </CardContent>
          </Card>

          {/* Open trades */}
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity size={16} className="text-primary" />
                Open Positions ({openTrades.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {openTrades.length === 0 ? (
                <div className="px-5 py-8 text-center text-muted-foreground text-sm">No open positions</div>
              ) : (
                <div className="divide-y divide-border">
                  {openTrades.map(t => (
                    <div key={t.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={t.type === "long" ? "badge-active" : "bg-rose-500/15 text-rose-400 border-rose-500/20"}>
                          {t.type === "long" ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
                          {t.type.toUpperCase()}
                        </Badge>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{t.pair}</p>
                          <p className="text-xs text-muted-foreground">
                            ${t.amount.toLocaleString()} × {t.leverage}x @ {t.entryPrice.toFixed(t.entryPrice > 10 ? 2 : 4)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className={`text-sm font-bold ${t.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                            {t.pnl >= 0 ? "+" : ""}{formatCurrency(t.pnl)}
                          </p>
                          <p className={`text-xs ${t.pnlPct >= 0 ? "text-profit" : "text-loss"}`}>
                            {t.pnlPct >= 0 ? "+" : ""}{t.pnlPct.toFixed(2)}%
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => closeTrade(t.id)} className="h-7 text-xs">
                          <Square size={10} className="mr-1" /> Close
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trade form */}
        <div className="space-y-4">
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Open Position</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={tradeType === "long" ? "default" : "outline"}
                  onClick={() => setTradeType("long")}
                  className={`h-10 ${tradeType === "long" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                >
                  <TrendingUp size={14} className="mr-1" /> Long
                </Button>
                <Button
                  variant={tradeType === "short" ? "default" : "outline"}
                  onClick={() => setTradeType("short")}
                  className={`h-10 ${tradeType === "short" ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}`}
                >
                  <TrendingDown size={14} className="mr-1" /> Short
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Amount (USD)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="1000"
                  min="10"
                  max={balance.toString()}
                />
                <div className="flex gap-1.5">
                  {[25, 50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setAmount(String(Math.floor(balance * pct / 100)))}
                      className="flex-1 text-xs bg-muted hover:bg-muted/80 rounded px-1.5 py-1 text-muted-foreground"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Leverage</Label>
                <Select value={leverage} onValueChange={setLeverage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 5, 10, 25, 50, 100].map(l => (
                      <SelectItem key={l} value={String(l)}>{l}x Leverage</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-muted/30 rounded-xl text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Entry Price</span><span className="text-foreground">{currentPrice.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Position Size</span>
                  <span className="text-foreground">{formatCurrency(parseFloat(amount || "0") * parseInt(leverage || "1"))}</span>
                </div>
              </div>

              <Button
                onClick={openTrade}
                className={`w-full h-11 ${tradeType === "long" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"} text-white`}
              >
                <Play size={14} className="mr-2" />
                {tradeType === "long" ? "Buy Long" : "Sell Short"}
              </Button>

              <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 rounded-lg">
                <Info size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground">Demo mode uses virtual funds only. Switch to live mode to trade real assets.</p>
              </div>
            </CardContent>
          </Card>

          {/* Market prices */}
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Live Markets</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {PAIRS.slice(0, 6).map(pair => {
                  const price = prices[pair];
                  const base = BASE_PRICES[pair];
                  const chg = ((price - base) / base) * 100;
                  return (
                    <button
                      key={pair}
                      onClick={() => setSelectedPair(pair)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors text-sm ${selectedPair === pair ? "bg-primary/5" : ""}`}
                    >
                      <span className="font-medium text-foreground">{pair}</span>
                      <div className="text-right">
                        <span className="text-foreground">{price.toFixed(price > 10 ? 2 : 4)}</span>
                        <span className={`ml-2 text-xs ${chg >= 0 ? "text-profit" : "text-loss"}`}>
                          {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Closed trades */}
      {closedTrades.length > 0 && (
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Trade History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {closedTrades.map(t => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-muted-foreground">CLOSED</Badge>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.pair}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.type.toUpperCase()} @ {t.entryPrice.toFixed(t.entryPrice > 10 ? 2 : 4)} → {t.closePrice?.toFixed(t.closePrice > 10 ? 2 : 4)}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold ${t.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                    {t.pnl >= 0 ? "+" : ""}{formatCurrency(t.pnl)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
