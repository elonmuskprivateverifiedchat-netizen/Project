import { Gift, CalendarClock, TrendingUp, Wallet, Bot, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useActivateAiBotSubscription, useProgramStatus, useSocialWallet, useWallets } from "@/hooks/useApi";
import { formatCurrency } from "@/lib/format";

export default function Programs() {
  const { data: socialWallet } = useSocialWallet();
  const { data: wallets = [] } = useWallets();
  const { data: programStatus } = useProgramStatus();
  const activateBot = useActivateAiBotSubscription();
  const social = wallets.find((w: any) => w.type === "social");
  const trialEnds = programStatus?.aiBot?.trialEndsAt ? new Date(programStatus.aiBot.trialEndsAt).toLocaleDateString() : "Pending setup";
  const maintenanceDue = programStatus?.maintenance?.dueAt ? new Date(programStatus.maintenance.dueAt).toLocaleDateString() : "Pending setup";
  const graceEnds = programStatus?.maintenance?.graceEndsAt ? new Date(programStatus.maintenance.graceEndsAt).toLocaleDateString() : "Pending setup";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Gift size={24} className="text-primary" /> Special Profit Programs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Weekend and limited-time company programs for eligible users.</p>
      </div>

      <Card className="border-card-border bg-gradient-to-br from-primary/10 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>WWW — Weekly Weekend Wins</span>
            <Badge variant="outline" className="badge-active">Weekend Program</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            WWW is a weekend-focused trading program. Deposits and earned gains remain visible in the social trading wallet while active, then eligible completed gains are moved to the main wallet after the program cycle.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-card/80 rounded-xl border border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-2"><Wallet size={13} /> Program Balance</p>
              <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(social?.balance ?? 0, social?.currency ?? "USDT")}</p>
            </div>
            <div className="p-4 bg-card/80 rounded-xl border border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-2"><TrendingUp size={13} /> Earned / Gained</p>
              <p className="text-xl font-bold text-profit mt-1">{formatCurrency(socialWallet?.pendingProfits ?? 0, "USDT")}</p>
            </div>
            <div className="p-4 bg-card/80 rounded-xl border border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-2"><CalendarClock size={13} /> Cycle</p>
              <p className="text-xl font-bold text-foreground mt-1">Weekend</p>
            </div>
          </div>
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-300">
            Completed program earnings are released to the main account wallet after the fixed trading time and representative/program verification.
          </div>
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link href="/trading">View Trading Activity</Link>
          </Button>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot size={16} className="text-primary" /> AI Trading Bot Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Every account starts with 3 months of free AI bot guidance. After the trial, continued bot trading guidance requires an active subscription.</p>
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3">
              <span className="text-sm text-muted-foreground">Trial Status</span>
              <Badge variant="outline" className={programStatus?.aiBot?.active ? "badge-active" : "badge-pending"}>
                {programStatus?.aiBot?.status === "active" ? "Subscription Active" : programStatus?.aiBot?.active ? "Trial Active" : "Trial Expired"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Trial ends: {trialEnds}</p>
            {!programStatus?.aiBot?.active && (
              <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => activateBot.mutate()} disabled={activateBot.isPending}>
                Activate Bot Subscription
              </Button>
            )}
          </CardContent>
        </Card>
        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock size={16} className="text-amber-400" /> Monthly Maintenance Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Monthly maintenance and at least one compulsory trade keep account services active. A 14-day grace period applies before account trading features are locked.</p>
            <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
              <span className="text-sm text-amber-300">Account Trading</span>
              <Badge variant="outline" className={programStatus?.maintenance?.tradingLocked ? "badge-danger" : programStatus?.maintenance?.overdue ? "badge-pending" : "badge-active"}>
                {programStatus?.maintenance?.tradingLocked ? "Locked" : programStatus?.maintenance?.overdue ? "Grace Period" : "Active"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="rounded-lg border border-border p-3">Maintenance due<br /><span className="text-foreground">{maintenanceDue}</span></div>
              <div className="rounded-lg border border-border p-3">Grace ends<br /><span className="text-foreground">{graceEnds}</span></div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3">
              <span className="text-sm text-muted-foreground">Compulsory trade</span>
              <Badge variant="outline" className={programStatus?.maintenance?.compulsoryTradeComplete ? "badge-active" : "badge-pending"}>
                {programStatus?.maintenance?.compulsoryTradeComplete ? "Completed" : "Required"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}