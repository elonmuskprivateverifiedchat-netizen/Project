import { useState } from "react";
import { CreditCard, Plus, Shield, Star, Crown, CheckCircle, Clock, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const CARD_TIERS = [
  { value: "standard", label: "Standard", icon: CreditCard, color: "from-slate-600 to-slate-800", limit: "$5,000/mo", annualFee: "Free", perks: ["Virtual card", "Online payments", "Transaction alerts"] },
  { value: "gold", label: "Gold", icon: Star, color: "from-amber-600 to-amber-800", limit: "$15,000/mo", annualFee: "$99/yr", perks: ["Physical + Virtual", "Priority support", "1% cashback", "ATM withdrawals"] },
  { value: "platinum", label: "Platinum", icon: Shield, color: "from-zinc-500 to-zinc-700", limit: "$50,000/mo", annualFee: "$249/yr", perks: ["Premium benefits", "2% cashback", "Travel insurance", "Airport lounge"] },
  { value: "black", label: "Black", icon: Crown, color: "from-gray-900 to-black", limit: "Unlimited", annualFee: "$999/yr", perks: ["No limits", "3% cashback", "Concierge service", "Global acceptance"] },
];

function CardDisplay({ card }: { card: any }) {
  const tier = CARD_TIERS.find(t => t.value === card.cardTier) || CARD_TIERS[0];
  const TierIcon = tier.icon;
  const isActive = card.status === "active";
  const style = card.design ? {
    background: `linear-gradient(135deg, ${card.design.primary || "#0f172a"}, ${card.design.secondary || "#14b8a6"})`,
  } : undefined;

  return (
    <div className={`relative w-full aspect-[1.586] rounded-2xl bg-gradient-to-br ${card.design ? "" : tier.color} p-6 text-white shadow-xl overflow-hidden`} style={style}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 right-4 w-40 h-40 rounded-full border-2 border-white/30" />
        <div className="absolute bottom-4 right-8 w-24 h-24 rounded-full border-2 border-white/20" />
      </div>
      <div className="relative z-10 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest opacity-70">ExpressPro101</p>
            <p className="text-lg font-bold mt-0.5">{card.design?.theme || tier.label}</p>
          </div>
          <div className="flex items-center gap-2">
            <TierIcon size={20} className="opacity-80" />
            {!isActive && (
              <Badge variant="outline" className="text-[10px] border-white/30 text-white bg-white/10">
                {card.status === "pending" ? "Pending" : card.status}
              </Badge>
            )}
          </div>
        </div>
        <div>
          {isActive && card.cardNumber ? (
            <p className="font-mono text-lg tracking-wider">{card.cardNumber}</p>
          ) : (
            <p className="font-mono text-lg tracking-wider opacity-50">•••• •••• •••• ••••</p>
          )}
          <div className="flex items-center justify-between mt-3">
            <div>
              <p className="text-[10px] opacity-60 uppercase">Card Holder</p>
              <p className="text-sm font-medium">{card.cardholderName}</p>
            </div>
            {isActive && card.expiryDate && (
              <div>
                <p className="text-[10px] opacity-60 uppercase">Expires</p>
                <p className="text-sm font-medium">{card.expiryDate}</p>
              </div>
            )}
            <div className="flex gap-1">
              <div className="w-8 h-8 rounded-full bg-red-400/80" />
              <div className="w-8 h-8 rounded-full bg-amber-400/80 -ml-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Cards() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showApply, setShowApply] = useState(false);
  const [selectedTier, setSelectedTier] = useState("standard");
  const [form, setForm] = useState({
    cardType: "virtual",
    cardholderName: "",
    billingAddress: "",
    billingCity: "",
    billingCountry: "United Kingdom",
  });
  const [designCardId, setDesignCardId] = useState("");
  const [designForm, setDesignForm] = useState({
    theme: "Custom ExpressPro",
    primary: "#0f172a",
    secondary: "#14b8a6",
    pattern: "premium-wave",
  });

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["cards"],
    queryFn: () => api.get<any[]>("/cards"),
    refetchInterval: 6000,
  });

  const requestCard = useMutation({
    mutationFn: (body: any) => api.post("/cards/request", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cards"] });
      toast({ title: "Card application submitted!", description: "Approval takes 1-3 business days." });
      setShowApply(false);
    },
    onError: (err: any) => toast({ title: "Application failed", description: err.message, variant: "destructive" }),
  });

  const customizeCard = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/cards/${id}/design`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cards"] });
      setDesignCardId("");
      toast({ title: "Card design updated" });
    },
    onError: (err: any) => toast({ title: "Design failed", description: err.message, variant: "destructive" }),
  });

  const hasCard = cards.length > 0;

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cardholderName || !form.billingAddress || !form.billingCity || !form.billingCountry) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    requestCard.mutate({ ...form, cardTier: selectedTier });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard size={24} className="text-primary" /> Cards
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Spend your trading profits anywhere in the world.</p>
        </div>
        {!hasCard && (
          <Button onClick={() => setShowApply(true)} className="bg-primary hover:bg-primary/90 gap-2">
            <Plus size={16} /> Apply for Card
          </Button>
        )}
      </div>

      {/* Existing cards */}
      {isLoading ? (
        <div className="h-48 bg-muted/30 rounded-2xl animate-pulse" />
      ) : cards.length > 0 ? (
        <div className="space-y-6">
          {cards.map((card: any) => (
            <div key={card.id} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CardDisplay card={card} />
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground capitalize">{card.cardTier} Card</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {card.status === "active" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 gap-1">
                        <CheckCircle size={11} /> Active
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 gap-1">
                        <Clock size={11} /> {card.status}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground capitalize">{card.cardType}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Spend Limit</p>
                    <p className="font-semibold text-foreground">${card.spendLimit !== "unlimited" ? Number(card.spendLimit).toLocaleString() : "Unlimited"}/mo</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">CVV</p>
                    <p className="font-semibold text-foreground font-mono">
                      {card.status === "active" && card.cvv ? card.cvv : "•••"}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Card Features</p>
                  {CARD_TIERS.find(t => t.value === card.cardTier)?.perks.map((perk: string) => (
                    <div key={perk} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
                      {perk}
                    </div>
                  ))}
                </div>
                {card.status === "active" && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDesignCardId(card.id)}>
                      Custom Design
                    </Button>
                    <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => customizeCard.mutate({ id: card.id, body: { mode: "bot" } })}>
                      <Sparkles size={13} className="mr-1.5" /> Bot Generate
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-card-border">
          <CardContent className="py-12 text-center">
            <CreditCard size={48} className="mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="font-semibold text-foreground mb-2">No Cards Yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              Apply for a card to spend your trading profits anywhere worldwide.
            </p>
            <Button onClick={() => setShowApply(true)} className="bg-primary hover:bg-primary/90 gap-2">
              <Plus size={16} /> Apply for Your First Card
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Card tiers */}
      {!hasCard && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Available Card Tiers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CARD_TIERS.map(tier => {
              const Icon = tier.icon;
              return (
                <Card key={tier.value} className="border-card-border hover:border-primary/30 transition-colors cursor-pointer" onClick={() => { setSelectedTier(tier.value); setShowApply(true); }}>
                  <CardContent className="p-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center mb-3`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground">{tier.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{tier.limit}</p>
                    <p className="text-xs text-primary mt-1">{tier.annualFee}</p>
                    <ul className="mt-3 space-y-1">
                      {tier.perks.slice(0, 2).map(p => (
                        <li key={p} className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle size={10} className="text-emerald-400" /> {p}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Apply dialog */}
      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for Card</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApply} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Card Tier</Label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CARD_TIERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label} — {t.limit}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Card Type</Label>
              <Select value={form.cardType} onValueChange={v => setForm(f => ({ ...f, cardType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="virtual">Virtual Card (Instant)</SelectItem>
                  <SelectItem value="physical">Physical Card (7-10 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Cardholder Name</Label>
              <Input placeholder="As on ID" value={form.cardholderName} onChange={e => setForm(f => ({ ...f, cardholderName: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Billing Address</Label>
              <Input placeholder="123 Main Street" value={form.billingAddress} onChange={e => setForm(f => ({ ...f, billingAddress: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">City</Label>
                <Input placeholder="London" value={form.billingCity} onChange={e => setForm(f => ({ ...f, billingCity: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Country</Label>
                <Input placeholder="United Kingdom" value={form.billingCountry} onChange={e => setForm(f => ({ ...f, billingCountry: e.target.value }))} required />
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={requestCard.isPending}>
              {requestCard.isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!designCardId} onOpenChange={open => !open && setDesignCardId("")}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customize Card Design</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Theme Name</Label>
              <Input value={designForm.theme} onChange={e => setDesignForm(f => ({ ...f, theme: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Primary Color</Label>
                <Input type="color" value={designForm.primary} onChange={e => setDesignForm(f => ({ ...f, primary: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Secondary Color</Label>
                <Input type="color" value={designForm.secondary} onChange={e => setDesignForm(f => ({ ...f, secondary: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Pattern</Label>
              <Select value={designForm.pattern} onValueChange={v => setDesignForm(f => ({ ...f, pattern: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium-wave">Premium Wave</SelectItem>
                  <SelectItem value="neural-wave">Neural Wave</SelectItem>
                  <SelectItem value="market-grid">Market Grid</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={() => customizeCard.mutate({ id: designCardId, body: { design: designForm } })}
              disabled={customizeCard.isPending}
            >
              Save Design
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
