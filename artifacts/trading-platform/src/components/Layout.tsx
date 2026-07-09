import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, TrendingUp, Users, Store, Wallet, ShoppingCart,
  HeadphonesIcon, Menu, X, Bell, MessageSquare, Shield, CreditCard,
  Zap, Settings, LogOut, Gift, TrendingDown, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUser, useP2PNotifications, useWallets } from "@/hooks/useApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getToken, clearAuth } from "@/lib/auth";
import { useForexRates } from "@/hooks/useForexRates";
import SupportChat from "@/components/SupportChat";
import { formatCurrency } from "@/lib/format";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/trading", label: "Trading", icon: TrendingUp },
  { path: "/demo", label: "Demo Trading", icon: Zap },
  { path: "/managers", label: "Managers", icon: Users },
  { path: "/p2p", label: "P2P Market", icon: Store },
  { path: "/programs", label: "Programs", icon: Gift },
  { path: "/wallet", label: "Wallet", icon: Wallet },
  { path: "/buy", label: "Buy Crypto", icon: ShoppingCart },
  { path: "/cards", label: "Cards", icon: CreditCard },
  { path: "/kyc", label: "KYC Verify", icon: Shield },
  { path: "/support", label: "Support", icon: HeadphonesIcon },
];

const TICKER_PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD", "ETH/USD"];

function formatRate(pair: string, price: number): string {
  if (!price) return "—";
  if (pair.includes("JPY")) return price.toFixed(3);
  if (pair.includes("BTC") || pair.includes("ETH"))
    return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (pair.includes("XAU")) return price.toFixed(2);
  return price.toFixed(5);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const { data: wallets = [] } = useWallets();
  const { data: p2pNotifications = [] } = useP2PNotifications();
  const { rates, connected } = useForexRates();

  if (!getToken()) {
    navigate("/auth/login");
    return null;
  }

  async function handleLogout() {
    try { await api.post("/auth/logout", {}); } catch (_) {}
    clearAuth();
    queryClient.clear();
    navigate("/auth/login");
  }

  const { data: globalNotifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<any[]>("/notifications"),
    refetchInterval: 15000,
  });

  const p2pUnread = p2pNotifications.filter((n: any) => !n.read).length;
  const globalUnread = globalNotifications.filter((n: any) => !n.read).length;
  const totalUnread = p2pUnread + globalUnread;

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "EP";

  const mainWallet = wallets.find((w: any) => w.type === "main");
  const totalEquity = wallets.reduce((s: number, w: any) => s + Number(w.balance || 0), 0);

  const tickerRates = rates.filter(r => TICKER_PAIRS.includes(r.pair));

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-56 bg-sidebar border-r border-sidebar-border flex flex-col transform transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <TrendingUp size={14} className="text-primary-foreground" />
          </div>
          <span className="font-bold text-[15px] text-foreground tracking-tight">XpressProFX</span>
        </div>

        {/* Account balance summary */}
        <div className="mx-3 mt-3 p-3 rounded-lg bg-primary/8 border border-primary/15">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
            Portfolio Equity
          </p>
          <p className="num text-lg font-bold text-foreground leading-none">
            {totalEquity > 0 ? formatCurrency(totalEquity) : "—"}
          </p>
          {mainWallet && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Available: <span className="num text-foreground">{formatCurrency(mainWallet.balance)}</span>
            </p>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.startsWith(path);
            return (
              <Link
                key={path}
                href={path}
                onClick={() => setSidebarOpen(false)}
                className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-r-full" />
                )}
                <Icon size={15} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {path === "/p2p" && p2pUnread > 0 && (
                  <Badge className="w-4 h-4 p-0 text-[9px] flex items-center justify-center bg-primary text-primary-foreground">
                    {p2pUnread}
                  </Badge>
                )}
                {path === "/kyc" && user?.kycStatus === "pending" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
                {path === "/kyc" && user?.kycStatus === "unverified" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-2.5 border-t border-sidebar-border space-y-0.5">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-md">
            <Avatar className="w-7 h-7 flex-shrink-0">
              <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground truncate leading-none">{user?.fullName ?? "Loading..."}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  user?.kycStatus === "verified" ? "bg-emerald-400" :
                  user?.kycStatus === "pending" ? "bg-amber-400" : "bg-rose-400"
                }`} />
                <span className="text-[10px] text-muted-foreground">
                  {user?.kycStatus === "verified" ? "KYC Verified" :
                   user?.kycStatus === "pending" ? "KYC Pending" : "Unverified"}
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
          >
            <Settings size={14} />
            <span>Settings</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] text-rose-400 hover:bg-rose-400/10 transition-colors"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="h-12 border-b border-border bg-sidebar/80 backdrop-blur-sm flex items-center px-4 gap-3 sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </Button>

          {/* Live ticker strip */}
          <div className="hidden lg:flex items-center gap-0 flex-1 overflow-x-auto scrollbar-none">
            {tickerRates.length === 0 ? (
              <span className="text-[11px] text-muted-foreground px-2">Connecting market data...</span>
            ) : (
              tickerRates.map(r => {
                const up = r.change24h >= 0;
                return (
                  <div key={r.pair} className="flex items-center gap-2 px-3 py-1 border-r border-border last:border-r-0 flex-shrink-0">
                    <span className="text-[11px] font-semibold text-foreground">{r.pair}</span>
                    <span className="num text-[11px] text-foreground">{formatRate(r.pair, r.price)}</span>
                    <span className={`num text-[10px] flex items-center gap-0.5 ${up ? "ticker-up" : "ticker-down"}`}>
                      {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                      {up ? "+" : ""}{r.change24h.toFixed(2)}%
                    </span>
                  </div>
                );
              })
            )}
            <div className="flex items-center gap-1 px-3 flex-shrink-0">
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-muted-foreground"}`} />
              <span className="text-[10px] text-muted-foreground">{connected ? "Live" : "..."}</span>
            </div>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            {/* KYC banner */}
            {user?.kycStatus === "unverified" && (
              <Link href="/kyc" className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/25 rounded text-[11px] text-amber-400 hover:bg-amber-500/15 transition-colors">
                <Shield size={11} />
                Verify KYC
              </Link>
            )}

            {/* Quick deposit */}
            <Link href="/wallet">
              <Button size="sm" className="h-7 text-[11px] px-2.5 bg-primary hover:bg-primary/90 hidden sm:flex">
                + Deposit
              </Button>
            </Link>

            {/* Notification bell */}
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <Bell size={16} />
                {totalUnread > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 p-0 text-[8px] flex items-center justify-center bg-primary text-primary-foreground">
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* User avatar */}
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-[12px] font-semibold text-foreground leading-none">{user?.username ?? "..."}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{user?.role || "user"}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile ticker — shown below header */}
        <div className="lg:hidden flex items-center gap-0 border-b border-border bg-sidebar/50 overflow-x-auto scrollbar-none px-1">
          {tickerRates.slice(0, 4).map(r => {
            const up = r.change24h >= 0;
            return (
              <div key={r.pair} className="flex items-center gap-1.5 px-2.5 py-1.5 border-r border-border last:border-r-0 flex-shrink-0">
                <span className="text-[10px] font-semibold text-foreground">{r.pair}</span>
                <span className="num text-[10px] text-foreground">{formatRate(r.pair, r.price)}</span>
                <span className={`num text-[9px] ${up ? "ticker-up" : "ticker-down"}`}>
                  {up ? "+" : ""}{r.change24h.toFixed(2)}%
                </span>
              </div>
            );
          })}
          <div className="flex items-center gap-1 px-2 flex-shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-muted-foreground"}`} />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Floating support chat */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {supportOpen && (
          <div className="w-80 h-96 bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <SupportChat onClose={() => setSupportOpen(false)} embedded />
          </div>
        )}
        <Button
          onClick={() => setSupportOpen(!supportOpen)}
          className="w-11 h-11 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {supportOpen ? <X size={18} /> : <MessageSquare size={18} />}
        </Button>
      </div>
    </div>
  );
}
