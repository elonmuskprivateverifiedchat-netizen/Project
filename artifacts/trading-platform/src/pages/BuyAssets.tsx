import { useState } from "react";
import { ShoppingCart, TrendingUp, TrendingDown, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssets, usePurchaseAsset } from "@/hooks/useApi";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const PAYMENT_METHODS = [
  { value: "main_wallet", label: "Main Wallet" },
  { value: "moonpay", label: "MoonPay Card / Bank" },
];

export default function BuyAssets() {
  const { data: assets = [], isLoading } = useAssets();
  const purchase = usePurchaseAsset();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("main_wallet");

  const filtered = assets.filter((a: any) =>
    a.symbol.toLowerCase().includes(search.toLowerCase()) ||
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const handlePurchase = async () => {
    if (!selected || !amount) return;
    const result = await purchase.mutateAsync({
      assetId: selected.id,
      amount: parseFloat(amount),
      paymentMethod,
    });
    toast({
      title: result.success ? "Purchase Successful!" : "Purchase Failed",
      description: result.message,
    });
    if (result.redirectUrl) {
      window.open(result.redirectUrl, "_blank", "noopener,noreferrer");
    }
    if (result.success) {
      setSelected(null);
      setAmount("");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Buy Crypto</h1>
        <p className="text-muted-foreground text-sm mt-1">Purchase digital assets directly on the platform</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search assets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Asset grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="border-card-border"><CardContent className="p-4"><Skeleton className="h-28 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((asset: any) => {
            const isPositive = asset.change24h >= 0;
            return (
              <Card
                key={asset.id}
                className="border-card-border hover:border-primary/40 transition-all cursor-pointer group"
                onClick={() => setSelected(asset)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="text-xs font-black text-primary">{asset.symbol.slice(0, 2)}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={isPositive ? "badge-active" : "bg-rose-500/15 text-rose-400 border-rose-500/20"}
                    >
                      {isPositive ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
                      {formatPercent(asset.change24h)}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{asset.symbol}</p>
                    <p className="text-xs text-muted-foreground">{asset.name}</p>
                    <p className="text-lg font-bold text-foreground mt-2">{formatCurrency(asset.price)}</p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-3 bg-primary/80 hover:bg-primary opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ShoppingCart size={13} className="mr-1.5" />
                    Buy {asset.symbol}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Purchase dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        {selected && (
          <DialogContent className="bg-card border-card-border max-w-sm">
            <DialogHeader>
              <DialogTitle>Buy {selected.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(selected.price)}</p>
                  <p className="text-xs text-muted-foreground">{selected.symbol} / {selected.currency}</p>
                </div>
                <Badge variant="outline" className={selected.change24h >= 0 ? "badge-active" : "bg-rose-500/15 text-rose-400 border-rose-500/20"}>
                  {formatPercent(selected.change24h)}
                </Badge>
              </div>

              <div>
                <Label className="text-xs">Amount ({selected.symbol})</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1.5"
                />
                {amount && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Total: <span className="text-foreground font-medium">{formatCurrency(parseFloat(amount || "0") * selected.price)}</span>
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(pm => (
                      <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handlePurchase}
                disabled={!amount || purchase.isPending}
              >
                {purchase.isPending ? "Processing..." : `Buy ${selected.symbol}`}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
