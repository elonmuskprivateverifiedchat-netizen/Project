import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, TrendingUp, Users, Store, Wallet, ShoppingCart,
  HeadphonesIcon, Menu, X, Bell, MessageSquare, Shield, CreditCard,
  Zap, Settings, LogOut, Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUser, useP2PNotifications } from "@/hooks/useApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getToken, clearAuth } from "@/lib/auth";
import SupportChat from "@/components/SupportChat";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
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

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const { data: p2pNotifications = [] } = useP2PNotifications();

  useEffect(() => {
    if (!getToken()) {
      navigate("/auth/login");
    }
  }, [navigate]);

  async function handleLogout() {
    try {
      await api.post("/auth/logout", {});
    } catch (_) {}
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-sidebar border-r border-sidebar-border flex flex-col transform transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <TrendingUp size={16} className="text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground tracking-tight">EXPRESSPRO101</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = path === "/" ? location === "/" : location.startsWith(path);
            return (
              <Link
                key={path}
                href={path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <Icon size={17} />
                <span className="flex-1">{label}</span>
                {path === "/p2p" && p2pUnread > 0 && (
                  <Badge className="w-4 h-4 p-0 text-[9px] flex items-center justify-center bg-primary text-primary-foreground">
                    {p2pUnread}
                  </Badge>
                )}
                {path === "/kyc" && user?.kycStatus === "pending" && (
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                )}
                {path === "/kyc" && user?.kycStatus === "unverified" && (
                  <div className="w-2 h-2 rounded-full bg-rose-400" />
                )}
              </Link>
            );
          })}

        </nav>

        {/* User info at bottom */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{user?.fullName ?? "Loading..."}</p>
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  user?.kycStatus === "verified" ? "bg-emerald-400" :
                  user?.kycStatus === "pending" ? "bg-amber-400" : "bg-rose-400"
                }`} />
                <span className="text-xs text-muted-foreground">
                  {user?.kycStatus === "verified" ? "KYC Verified" :
                   user?.kycStatus === "pending" ? "KYC Pending" : "Unverified"}
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
          >
            <Settings size={15} />
            <span>Settings</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-400/10 transition-colors"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 gap-4 sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>

          <div className="flex-1" />

          {/* KYC banner */}
          {user?.kycStatus === "unverified" && (
            <Link href="/kyc" className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs text-amber-400 hover:bg-amber-500/15 transition-colors">
              <Shield size={12} />
              Verify Identity
            </Link>
          )}

          {/* Notification bell */}
          <Link href="/notifications">
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={18} />
              {totalUnread > 0 && (
                <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 text-[9px] flex items-center justify-center bg-primary text-primary-foreground">
                  {totalUnread > 9 ? "9+" : totalUnread}
                </Badge>
              )}
            </Button>
          </Link>

          {/* User avatar + name */}
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground leading-none">{user?.username ?? "..."}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user?.role || "user"}</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Floating support chat button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {supportOpen && (
          <div className="w-80 h-96 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <SupportChat onClose={() => setSupportOpen(false)} embedded />
          </div>
        )}
        <Button
          onClick={() => setSupportOpen(!supportOpen)}
          className="w-12 h-12 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {supportOpen ? <X size={20} /> : <MessageSquare size={20} />}
        </Button>
      </div>
    </div>
  );
}
