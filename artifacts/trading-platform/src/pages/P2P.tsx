import { useState, useRef, useEffect } from "react";
import { Store, Plus, MessageSquare, Bell, ShieldCheck, Filter, Send, Upload, CheckCircle, Clock, AlertCircle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  useP2PListings, useP2PNotifications, useCreateP2PListing, useCreateP2POrder,
  useP2POrders, useP2PChat, useSendP2PChat, useUpdateOrderStatus, useSubmitProof, useUser,
  useP2PVendorStatus, useRegisterP2PVendor
} from "@/hooks/useApi";
import { formatCurrency, timeAgo } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const ASSETS = ["All", "BTC", "ETH", "USDT", "SOL", "BNB", "XRP"];
const PAYMENT_METHODS = ["Bank Transfer", "PayPal", "Wise", "SEPA Transfer", "M-Pesa", "Interac e-Transfer", "Venmo", "Zelle"];

function OrderStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    payment_sent: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    disputed: "bg-rose-500/15 text-rose-400 border-rose-500/20",
    cancelled: "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={`text-[10px] ${cfg[status] || cfg.pending}`}>{status.replace("_", " ")}</Badge>;
}

function OrderChat({ order, currentUserId }: { order: any; currentUserId: string }) {
  const { data: messages = [] } = useP2PChat(order.id);
  const sendChat = useSendP2PChat();
  const submitProof = useSubmitProof();
  const { data: user } = useUser();
  const { toast } = useToast();
  const [msg, setMsg] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!msg.trim()) return;
    await sendChat.mutateAsync({ orderId: order.id, message: msg, senderName: user?.fullName || "You" });
    setMsg("");
  }

  async function handleProof() {
    // Simulate proof upload
    const mockUrl = `https://mock-storage.xpressprofx.com/proof/${Date.now()}.jpg`;
    await submitProof.mutateAsync({ orderId: order.id, proofUrl: mockUrl });
    toast({ title: "Proof submitted!", description: "Waiting for vendor confirmation." });
  }

  const isBuyer = order.buyerId === currentUserId;

  return (
    <div className="flex flex-col h-full">
      {/* Order info */}
      <div className="p-3 bg-muted/30 border-b border-border">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-semibold text-foreground">{order.asset}</span>
            <span className="text-muted-foreground"> · {formatCurrency(order.amount)} @ ${order.price}</span>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-4">No messages yet</div>
        ) : (
          messages.map((m: any) => {
            const isMe = m.senderId === currentUserId;
            return (
              <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                    {m.senderName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className={`px-3 py-2 rounded-xl text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {m.message}
                    {m.attachmentUrl && (
                      <div className="mt-1.5">
                        <a href={m.attachmentUrl} className="text-xs underline opacity-80">View attachment</a>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(m.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Actions */}
      {order.status === "pending" && isBuyer && (
        <div className="p-3 border-t border-border bg-amber-500/5">
          <Button size="sm" onClick={handleProof} disabled={submitProof.isPending} className="w-full gap-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
            <Upload size={12} /> Submit Proof of Payment
          </Button>
        </div>
      )}

      {/* Chat input */}
      <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2">
        <Input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 text-sm h-9"
        />
        <Button type="submit" size="icon" className="h-9 w-9 bg-primary hover:bg-primary/90" disabled={sendChat.isPending || !msg.trim()}>
          <Send size={14} />
        </Button>
      </form>
    </div>
  );
}

export default function P2P() {
  const [listingType, setListingType] = useState<"buy" | "sell" | undefined>();
  const [assetFilter, setAssetFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [buyListing, setBuyListing] = useState<any>(null);
  const [buyAmount, setBuyAmount] = useState("");
  const [chatOrder, setChatOrder] = useState<any>(null);

  const asset = assetFilter === "All" ? undefined : assetFilter;
  const { data: listings = [], isLoading } = useP2PListings(listingType, asset);
  const { data: notifications = [] } = useP2PNotifications();
  const { data: orders = [] } = useP2POrders();
  const { data: user } = useUser();
  const { data: vendorStatus } = useP2PVendorStatus();
  const createListing = useCreateP2PListing();
  const createOrder = useCreateP2POrder();
  const registerVendor = useRegisterP2PVendor();
  const { toast } = useToast();

  const unread = notifications.filter((n: any) => !n.read).length;
  const userId = user?.id || "00000000-0000-0000-0000-000000000001";

  const incomingOrders = orders.filter((o: any) => o.status === "pending" || o.status === "payment_sent");
  const completedOrders = orders.filter((o: any) => o.status === "completed");

  const [newListing, setNewListing] = useState({
    type: "sell" as "buy" | "sell",
    asset: "BTC",
    amount: "",
    price: "",
    currency: "USD",
    minOrder: "",
    maxOrder: "",
    paymentMethods: ["Bank Transfer"],
  });

  const handleCreateListing = async () => {
    await createListing.mutateAsync({
      ...newListing,
      amount: parseFloat(newListing.amount),
      price: parseFloat(newListing.price),
      minOrder: parseFloat(newListing.minOrder),
      maxOrder: parseFloat(newListing.maxOrder),
      userName: user?.fullName || "Trader",
    });
    toast({ title: "Listing created!", description: "Your P2P listing is now live." });
    setShowCreate(false);
  };

  const handleBuy = async () => {
    if (!buyListing || !buyAmount) return;
    await createOrder.mutateAsync({ listingId: buyListing.id, amount: parseFloat(buyAmount) });
    toast({ title: "Order created!", description: "Check your orders for instructions." });
    setBuyListing(null);
    setBuyAmount("");
  };

  if (vendorStatus && !vendorStatus.eligible) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">P2P Trading</h1>
          <p className="text-muted-foreground text-sm mt-1">Register as a P2P merchant or vendor before using company P2P trading activities.</p>
        </div>
        <Card className="border-card-border bg-gradient-to-br from-primary/10 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store size={18} className="text-primary" /> P2P Merchant Registration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              P2P access is limited to registered merchants/vendors. Registration enables marketplace listings, order chats, alerts, and vendor trading activity.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded-xl border border-border bg-card/70">
                <p className="font-semibold text-foreground">1. Register</p>
                <p className="text-muted-foreground text-xs mt-1">Submit your interest to work with the company as a P2P merchant.</p>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card/70">
                <p className="font-semibold text-foreground">2. Approval</p>
                <p className="text-muted-foreground text-xs mt-1">Company representatives can review and manage vendor eligibility.</p>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card/70">
                <p className="font-semibold text-foreground">3. Trade</p>
                <p className="text-muted-foreground text-xs mt-1">Use P2P listings, orders, and direct channel messaging once approved.</p>
              </div>
            </div>
            <Button
              onClick={async () => {
                await registerVendor.mutateAsync();
                toast({ title: "P2P registration submitted", description: "A company representative must approve vendor access before you can create listings." });
              }}
              disabled={registerVendor.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {registerVendor.isPending ? "Registering..." : "Register as P2P Merchant"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">P2P Trading</h1>
          <p className="text-muted-foreground text-sm mt-1">Buy and sell crypto directly with other traders</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="relative" onClick={() => setShowNotifications(true)}>
            <Bell size={15} className="mr-2" />
            Alerts
            {unread > 0 && (
              <Badge className="ml-2 bg-primary text-primary-foreground text-[10px] px-1.5">{unread}</Badge>
            )}
          </Button>
          <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90">
            <Plus size={15} className="mr-2" />
            Create Listing
          </Button>
        </div>
      </div>

      <Tabs defaultValue="market">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="orders" className="relative">
            My Orders
            {incomingOrders.length > 0 && (
              <Badge className="ml-1.5 h-4 w-4 p-0 text-[9px] bg-primary text-primary-foreground">{incomingOrders.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Market listings */}
        <TabsContent value="market" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
              {(["All", "sell", "buy"] as const).map(t => (
                <Button
                  key={t}
                  size="sm"
                  variant={listingType === (t === "All" ? undefined : t) ? "default" : "ghost"}
                  className="h-7 px-3 text-xs"
                  onClick={() => setListingType(t === "All" ? undefined : t)}
                >
                  {t === "All" ? "All" : t === "sell" ? "Sellers" : "Buyers"}
                </Button>
              ))}
            </div>
            <Select value={assetFilter} onValueChange={setAssetFilter}>
              <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSETS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-card-border"><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Store size={48} className="mx-auto mb-3 opacity-30" />
              <p>No listings found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((listing: any) => (
                <Card key={listing.id} className="border-card-border hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                            {listing.userName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground text-sm">{listing.userName}</p>
                          <div className="flex items-center gap-2">
                            <ShieldCheck size={11} className="text-emerald-400" />
                            <span className="text-xs text-muted-foreground">{listing.completionRate}% · {listing.totalTrades} trades</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Asset</p>
                          <p className="font-semibold text-foreground">{listing.asset}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Price</p>
                          <p className="font-semibold text-foreground">{formatCurrency(listing.price, listing.currency)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Available</p>
                          <p className="font-semibold text-foreground">{listing.amount} {listing.asset}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Limits</p>
                          <p className="font-semibold text-foreground">{formatCurrency(listing.minOrder)} - {formatCurrency(listing.maxOrder)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={listing.type === "sell" ? "badge-active" : "bg-amber-500/15 text-amber-400 border-amber-500/20"}>
                          {listing.type === "sell" ? "BUY" : "SELL"}
                        </Badge>
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90 h-8 px-4 text-xs"
                          onClick={() => setBuyListing(listing)}
                        >
                          Trade
                        </Button>
                      </div>
                    </div>

                    {listing.paymentMethods.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
                        {listing.paymentMethods.slice(0, 3).map((pm: string) => (
                          <Badge key={pm} variant="outline" className="text-[10px] bg-muted/40">{pm}</Badge>
                        ))}
                        {listing.paymentMethods.length > 3 && (
                          <Badge variant="outline" className="text-[10px] bg-muted/40">+{listing.paymentMethods.length - 3} more</Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Orders */}
        <TabsContent value="orders" className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Incoming / Active ({incomingOrders.length})
            </h3>
            {incomingOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm bg-muted/10 rounded-xl">
                No active orders
              </div>
            ) : (
              <div className="space-y-3">
                {incomingOrders.map((order: any) => (
                  <Card key={order.id} className="border-card-border border-amber-500/20 bg-amber-500/5">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <Clock size={14} className="text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {order.buyerId === userId ? "Buying" : "Selling"} {order.asset}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.amount} {order.asset} @ {formatCurrency(order.price)} · {timeAgo(order.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <OrderStatusBadge status={order.status} />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => setChatOrder(order)}
                          >
                            <MessageSquare size={11} /> Chat
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Completed ({completedOrders.length})
            </h3>
            {completedOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm bg-muted/10 rounded-xl">
                No completed orders
              </div>
            ) : (
              <div className="space-y-3">
                {completedOrders.map((order: any) => (
                  <Card key={order.id} className="border-card-border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                            <CheckCircle size={14} className="text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{order.asset}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.amount} @ {formatCurrency(order.price)} · {timeAgo(order.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <OrderStatusBadge status={order.status} />
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setChatOrder(order)}>
                            <MessageSquare size={11} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create listing dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create P2P Listing</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newListing.type} onValueChange={v => setNewListing(l => ({ ...l, type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sell">I'm Selling</SelectItem>
                    <SelectItem value="buy">I'm Buying</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Asset</Label>
                <Select value={newListing.asset} onValueChange={v => setNewListing(l => ({ ...l, asset: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["BTC","ETH","USDT","SOL","BNB","XRP"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" placeholder="0.5" value={newListing.amount} onChange={e => setNewListing(l => ({ ...l, amount: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Price (USD)</Label>
                <Input type="number" placeholder="94000" value={newListing.price} onChange={e => setNewListing(l => ({ ...l, price: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Min Order ($)</Label>
                <Input type="number" placeholder="100" value={newListing.minOrder} onChange={e => setNewListing(l => ({ ...l, minOrder: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Max Order ($)</Label>
                <Input type="number" placeholder="10000" value={newListing.maxOrder} onChange={e => setNewListing(l => ({ ...l, maxOrder: e.target.value }))} />
              </div>
            </div>
            <Button onClick={handleCreateListing} disabled={createListing.isPending} className="w-full bg-primary hover:bg-primary/90">
              {createListing.isPending ? "Creating..." : "Create Listing"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Buy dialog */}
      <Dialog open={!!buyListing} onOpenChange={() => setBuyListing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Trade {buyListing?.asset}</DialogTitle>
          </DialogHeader>
          {buyListing && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/30 rounded-xl text-sm space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Price</span><span className="text-foreground font-medium">{formatCurrency(buyListing.price)}/{buyListing.asset}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Limits</span><span className="text-foreground">{formatCurrency(buyListing.minOrder)} – {formatCurrency(buyListing.maxOrder)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Seller</span><span className="text-foreground">{buyListing.userName}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Amount ({buyListing.asset})</Label>
                <Input type="number" placeholder="Enter amount" value={buyAmount} onChange={e => setBuyAmount(e.target.value)} />
                {buyAmount && (
                  <p className="text-xs text-muted-foreground">
                    You pay: {formatCurrency(parseFloat(buyAmount || "0") * buyListing.price)}
                  </p>
                )}
              </div>
              <Button onClick={handleBuy} disabled={createOrder.isPending || !buyAmount} className="w-full bg-primary hover:bg-primary/90 h-11">
                {createOrder.isPending ? "Processing..." : `Buy ${buyListing.asset}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Notifications dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Bell size={18} />P2P Alerts</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No notifications</p>
            ) : (
              notifications.map((n: any) => (
                <div key={n.id} className={`p-3 rounded-xl border ${!n.read ? "border-primary/20 bg-primary/5" : "border-border bg-muted/10"}`}>
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Chat dialog */}
      <Dialog open={!!chatOrder} onOpenChange={() => setChatOrder(null)}>
        <DialogContent className="max-w-md h-[600px] flex flex-col p-0">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare size={18} className="text-primary" /> Order Chat
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {chatOrder && <OrderChat order={chatOrder} currentUserId={userId} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
