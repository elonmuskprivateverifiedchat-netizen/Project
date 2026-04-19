import { useState, useEffect, useRef } from "react";
import {
  Users, FileText, CreditCard, TrendingUp, ShieldCheck, Clock, BarChart3,
  ArrowUpRight, ArrowDownRight, RefreshCw, DollarSign, Activity, Settings2,
  ChevronUp, ChevronDown, Wallet, Edit3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { timeAgo, formatCurrency } from "@/lib/format";
import { getToken, getRole } from "@/lib/auth";

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="border-card-border">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Live simulated trading chart
function LiveTradingChart({ adminOverride }: { adminOverride: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<{ time: string; value: number; profit: boolean }[]>([]);
  const [currentValue, setCurrentValue] = useState(45230.5);
  const [change24h, setChange24h] = useState(2.34);

  useEffect(() => {
    // Generate initial data
    const initial: typeof data = [];
    let val = 44000;
    for (let i = 60; i >= 0; i--) {
      const d = new Date();
      d.setMinutes(d.getMinutes() - i);
      const delta = (Math.random() - 0.45) * 200;
      val = Math.max(40000, val + delta);
      initial.push({
        time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        value: val,
        profit: delta > 0,
      });
    }
    setData(initial);
    setCurrentValue(val);
  }, []);

  // Apply admin override to chart
  useEffect(() => {
    if (adminOverride && adminOverride.value) {
      const override = parseFloat(adminOverride.value);
      if (!isNaN(override)) {
        setData(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last) {
            const isProfit = override > last.value;
            updated.push({ time: new Date().toLocaleTimeString(), value: override, profit: isProfit });
            if (updated.length > 80) updated.shift();
          }
          return updated;
        });
        setCurrentValue(override);
      }
    }
  }, [adminOverride]);

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const last = prev[prev.length - 1]?.value || 44000;
        const delta = (Math.random() - 0.48) * 150;
        const newVal = Math.max(40000, last + delta);
        const newEntry = {
          time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          value: newVal,
          profit: delta > 0,
        };
        const updated = [...prev, newEntry];
        if (updated.length > 80) updated.shift();
        setCurrentValue(newVal);
        setChange24h(((newVal - 44000) / 44000) * 100);
        return updated;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const min = Math.min(...data.map(d => d.value)) - 200;
    const max = Math.max(...data.map(d => d.value)) + 200;
    const range = max - min;

    const getX = (i: number) => (i / (data.length - 1)) * W;
    const getY = (v: number) => H - ((v - min) / range) * H;

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "rgba(16, 185, 129, 0.3)");
    gradient.addColorStop(1, "rgba(16, 185, 129, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0].value));
    data.forEach((d, i) => ctx.lineTo(getX(i), getY(d.value)));
    ctx.lineTo(getX(data.length - 1), H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    // Line
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      if (i === 0) ctx.moveTo(getX(i), getY(d.value));
      else ctx.lineTo(getX(i), getY(d.value));
    });
    ctx.stroke();

    // Current price dot
    const lastI = data.length - 1;
    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(getX(lastI), getY(data[lastI].value), 4, 0, Math.PI * 2);
    ctx.fill();
  }, [data]);

  const isPositive = change24h >= 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-foreground">${currentValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`text-xs ${isPositive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-rose-500/15 text-rose-400 border-rose-500/20"}`} variant="outline">
              {isPositive ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {Math.abs(change24h).toFixed(2)}% 24h
            </Badge>
            <span className="text-xs text-muted-foreground">BTC/USDT · Live</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">LIVE</span>
        </div>
      </div>
      <canvas ref={canvasRef} width={700} height={200} className="w-full rounded-xl bg-card border border-border" />
    </div>
  );
}

export default function Admin() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // Check if admin is properly authenticated
  const isAdminSession = getRole() === "admin" || window.sessionStorage.getItem("xpfx_is_admin") === "true";

  const [chartOverride, setChartOverride] = useState({ value: "", type: "price" });
  const [pendingOverride, setPendingOverride] = useState<any>(null);
  const [editBalanceUserId, setEditBalanceUserId] = useState("");
  const [editBalanceAmount, setEditBalanceAmount] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get<any>("/admin/stats"),
    refetchInterval: 30000,
    enabled: isAdminSession,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get<any[]>("/admin/users"),
    enabled: isAdminSession,
  });

  const { data: kycDocs = [], isLoading: kycLoading } = useQuery({
    queryKey: ["admin-kyc"],
    queryFn: () => api.get<any[]>("/admin/kyc-documents"),
    enabled: isAdminSession,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: () => api.get<any[]>("/admin/transactions"),
    enabled: isAdminSession,
  });

  const { data: cards = [] } = useQuery({
    queryKey: ["admin-cards"],
    queryFn: () => api.get<any[]>("/admin/cards"),
    enabled: isAdminSession,
  });

  const updateKyc = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      api.patch(`/admin/users/${userId}/kyc`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-kyc"] });
      toast({ title: "KYC status updated" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/admin/users/${userId}/role`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Role updated" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const reviewWithdrawal = useMutation({
    mutationFn: ({ txId, status }: { txId: string; status: string }) =>
      api.patch(`/admin/transactions/${txId}/withdrawal`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-transactions"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "Withdrawal reviewed" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const updateCardStatus = useMutation({
    mutationFn: ({ cardId, status }: { cardId: string; status: string }) =>
      api.patch(`/admin/cards/${cardId}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cards"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "Card request updated" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const adjustBalance = useMutation({
    mutationFn: ({ userId, amount }: { userId: string; amount: number }) =>
      api.patch(`/admin/users/${userId}/balance`, { amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Balance adjusted" });
      setEditBalanceUserId("");
      setEditBalanceAmount("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  if (!isAdminSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-rose-500/20">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 flex items-center justify-center mx-auto">
              <ShieldCheck size={28} className="text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Admin Access Required</h2>
            <p className="text-sm text-muted-foreground">You must log in through the Admin C-Panel login to access this area.</p>
            <Button className="w-full bg-rose-600 hover:bg-rose-700" onClick={() => window.location.href = "/auth/login"}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kycStatusBadge = (status: string) => {
    const cfg: any = {
      unverified: "bg-muted text-muted-foreground border-border",
      pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
      verified: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
      rejected: "bg-rose-500/15 text-rose-400 border-rose-500/20",
    };
    return <Badge variant="outline" className={`text-[11px] ${cfg[status] || cfg.unverified}`}>{status}</Badge>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 size={24} className="text-rose-400" /> Admin Control Panel
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Full system control — users, KYC, withdrawals, trading, and wallets.</p>
          </div>
          <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/20 text-sm px-3 py-1.5" variant="outline">
            Administrator Access
          </Badge>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Users" value={stats.totalUsers} icon={Users} color="bg-primary" />
          <StatCard label="Pending KYC" value={stats.pendingKyc} icon={ShieldCheck} color="bg-amber-500" />
          <StatCard label="Transactions" value={stats.totalTransactions} icon={TrendingUp} color="bg-blue-500" />
          <StatCard label="Pending Cards" value={stats.pendingCards} icon={CreditCard} color="bg-violet-500" />
          <StatCard label="P2P Listings" value={stats.activeP2PListings} icon={FileText} color="bg-emerald-500" />
          <StatCard label="Withdrawals" value={stats.pendingWithdrawals} icon={Clock} color="bg-orange-500" />
        </div>
      )}

      <Tabs defaultValue="trading">
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
          <TabsTrigger value="trading" className="gap-1.5"><Activity size={13} /> Live Trading</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users size={13} /> Users</TabsTrigger>
          <TabsTrigger value="kyc" className="gap-1.5"><ShieldCheck size={13} /> KYC</TabsTrigger>
          <TabsTrigger value="transactions" className="gap-1.5"><TrendingUp size={13} /> Transactions</TabsTrigger>
          <TabsTrigger value="cards" className="gap-1.5"><CreditCard size={13} /> Cards</TabsTrigger>
        </TabsList>

        {/* Live Trading Chart */}
        <TabsContent value="trading">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card className="border-card-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity size={16} className="text-emerald-400" /> Live Trading Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LiveTradingChart adminOverride={pendingOverride} />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <Card className="border-card-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings2 size={14} className="text-primary" /> Trading Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Override Trade Value</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 46500.00"
                      value={chartOverride.value}
                      onChange={e => setChartOverride(c => ({ ...c, value: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Override Type</Label>
                    <Select value={chartOverride.type} onValueChange={v => setChartOverride(c => ({ ...c, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">Price Override</SelectItem>
                        <SelectItem value="win">Force Win</SelectItem>
                        <SelectItem value="loss">Force Loss</SelectItem>
                        <SelectItem value="prediction">Set Prediction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={() => {
                      setPendingOverride({ ...chartOverride, timestamp: Date.now() });
                      toast({ title: "Trading override applied", description: `Value set to ${chartOverride.value}` });
                    }}
                  >
                    Apply Override
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setPendingOverride(null);
                      setChartOverride({ value: "", type: "price" });
                      toast({ title: "Override cleared" });
                    }}
                  >
                    Clear Override
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-card-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Wallet size={14} className="text-primary" /> Adjust User Balance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">User ID</Label>
                    <Select value={editBalanceUserId} onValueChange={setEditBalanceUserId}>
                      <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                      <SelectContent>
                        {users.map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Balance Adjustment (+ / -)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 1000 or -500"
                      value={editBalanceAmount}
                      onChange={e => setEditBalanceAmount(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={!editBalanceUserId || !editBalanceAmount || adjustBalance.isPending}
                    onClick={() => adjustBalance.mutate({ userId: editBalanceUserId, amount: parseFloat(editBalanceAmount) })}
                  >
                    {adjustBalance.isPending ? "Adjusting..." : "Adjust Balance"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Registered Users ({users.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {usersLoading ? (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : (
                <div className="divide-y divide-border overflow-auto">
                  <div className="grid grid-cols-6 gap-3 px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/20">
                    <div className="col-span-2">User</div>
                    <div>Country</div>
                    <div>KYC Status</div>
                    <div>Role</div>
                    <div>Actions</div>
                  </div>
                  {users.map((u: any) => (
                    <div key={u.id} className="grid grid-cols-6 gap-3 px-5 py-3 items-center text-sm hover:bg-muted/20 transition-colors">
                      <div className="col-span-2">
                        <p className="font-medium text-foreground">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <div className="text-muted-foreground text-xs">{u.country}</div>
                      <div>{kycStatusBadge(u.kycStatus)}</div>
                      <div>
                        <Badge variant="outline" className="text-[11px] capitalize">{u.role}</Badge>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {u.kycStatus === "pending" && (
                          <>
                            <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2"
                              onClick={() => updateKyc.mutate({ userId: u.id, status: "verified" })}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-xs text-rose-400 border-rose-500/30 px-2"
                              onClick={() => updateKyc.mutate({ userId: u.id, status: "rejected" })}>
                              Reject
                            </Button>
                          </>
                        )}
                        {u.role !== "admin" && (
                          <Button size="sm" variant="ghost" className="h-6 text-xs px-2"
                            onClick={() => updateRole.mutate({ userId: u.id, role: u.role === "vendor" ? "user" : "vendor" })}>
                            {u.role === "vendor" ? "→ User" : "→ Vendor"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* KYC Documents */}
        <TabsContent value="kyc">
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">KYC Documents ({kycDocs.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {kycLoading ? (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : kycDocs.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">No KYC documents submitted</div>
              ) : (
                <div className="divide-y divide-border">
                  {kycDocs.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{doc.userName}</p>
                        <p className="text-xs text-muted-foreground">{doc.userEmail} — {doc.docType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo(doc.submittedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {kycStatusBadge(doc.status)}
                        {doc.status === "pending" && (
                          <div className="flex gap-1.5">
                            <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => api.patch(`/admin/kyc-documents/${doc.id}`, { status: "verified" }).then(() => qc.invalidateQueries({ queryKey: ["admin-kyc"] }))}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-rose-400 border-rose-500/30"
                              onClick={() => api.patch(`/admin/kyc-documents/${doc.id}`, { status: "rejected", reviewNote: "Documents unclear" }).then(() => qc.invalidateQueries({ queryKey: ["admin-kyc"] }))}>
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions */}
        <TabsContent value="transactions">
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {transactions.slice(0, 50).map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground capitalize">{tx.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(tx.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${["deposit", "trade_profit"].includes(tx.type) ? "text-profit" : "text-loss"}`}>
                        {["deposit", "trade_profit"].includes(tx.type) ? "+" : "-"}
                        {tx.currency} {Number(tx.amount).toFixed(2)}
                      </p>
                      <Badge variant="outline" className={`text-[10px] mt-0.5 ${tx.status === "completed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : tx.status === "pending" ? "bg-amber-500/15 text-amber-400 border-amber-500/20" : "bg-rose-500/15 text-rose-400 border-rose-500/20"}`}>
                        {tx.status}
                      </Badge>
                      {tx.type === "withdrawal" && tx.status === "pending" && (
                        <div className="flex gap-1.5 justify-end mt-2">
                          <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => reviewWithdrawal.mutate({ txId: tx.id, status: "completed" })}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-rose-400 border-rose-500/30"
                            onClick={() => reviewWithdrawal.mutate({ txId: tx.id, status: "failed" })}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && <div className="p-10 text-center text-muted-foreground text-sm">No transactions yet</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards">
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Card Requests ({cards.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {cards.map((card: any) => (
                  <div key={card.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{card.cardholderName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{card.cardTier} {card.cardType} · {timeAgo(card.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] ${card.status === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : card.status === "declined" ? "bg-rose-500/15 text-rose-400 border-rose-500/20" : "bg-amber-500/15 text-amber-400 border-amber-500/20"}`}>
                        {card.status}
                      </Badge>
                      {card.status === "pending" && (
                        <>
                          <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateCardStatus.mutate({ cardId: card.id, status: "active" })}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-rose-400 border-rose-500/30" onClick={() => updateCardStatus.mutate({ cardId: card.id, status: "declined" })}>
                            Decline
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {cards.length === 0 && <div className="p-10 text-center text-muted-foreground text-sm">No card requests yet</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
