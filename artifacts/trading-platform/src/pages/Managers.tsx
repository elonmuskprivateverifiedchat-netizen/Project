import { useState } from "react";
import { Star, MessageSquare, CheckCircle, TrendingUp, Users, Clock, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useManagers, useSelectedManager, useSelectManager } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Managers() {
  const { data: managers = [], isLoading } = useManagers();
  const { data: selectedData } = useSelectedManager();
  const selectManager = useSelectManager();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<any>(null);

  const currentManager = selectedData?.manager;

  const handleSelect = async (managerId: string) => {
    await selectManager.mutateAsync(managerId);
    toast({ title: "Manager selected!", description: "Your account manager has been updated." });
    setSelected(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Account Managers</h1>
        <p className="text-muted-foreground text-sm mt-1">Choose a professional to manage your trading portfolio</p>
      </div>

      {currentManager && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                  {currentManager.name.split(" ").map((n: string) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{currentManager.name}</p>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">Your Manager</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{currentManager.title} · {currentManager.specialization}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation("/messages?context=manager")}
              >
                <MessageSquare size={14} className="mr-2" />
                Message
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-card-border"><CardContent className="p-5"><Skeleton className="h-48 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {managers.map((m: any) => {
            const isCurrent = currentManager?.id === m.id;
            const initials = m.name.split(" ").map((n: string) => n[0]).join("");
            return (
              <Card
                key={m.id}
                className={`border-card-border hover:border-primary/40 transition-all cursor-pointer ${isCurrent ? "border-primary/40 bg-primary/5" : ""}`}
                onClick={() => setSelected(m)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-foreground">{m.name}</p>
                        {isCurrent && <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">Your Manager</Badge>}
                        {!m.available && <Badge variant="outline" className="text-[10px] text-muted-foreground">Unavailable</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.title}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-muted/40 rounded-lg p-2 text-center">
                      <p className="text-xs font-bold text-profit">{m.performance}%</p>
                      <p className="text-[10px] text-muted-foreground">Returns</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-2 text-center">
                      <p className="text-xs font-bold text-foreground">{m.winRate}%</p>
                      <p className="text-[10px] text-muted-foreground">Win Rate</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-2 text-center">
                      <p className="text-xs font-bold text-foreground">{m.experience}y</p>
                      <p className="text-[10px] text-muted-foreground">Exp.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">
                      {m.specialization}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users size={10} />
                      {m.totalClients} clients
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{m.bio}</p>

                  <div className="flex gap-2">
                    {!isCurrent && m.available && (
                      <Button
                        size="sm"
                        className="flex-1 bg-primary hover:bg-primary/90"
                        onClick={e => { e.stopPropagation(); handleSelect(m.id); }}
                        disabled={selectManager.isPending}
                      >
                        <CheckCircle size={13} className="mr-1.5" />
                        Select Manager
                      </Button>
                    )}
                    {isCurrent && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={e => { e.stopPropagation(); setLocation("/messages?context=manager"); }}
                      >
                        <MessageSquare size={13} className="mr-1.5" />
                        Message
                      </Button>
                    )}
                    {!m.available && !isCurrent && (
                      <Button size="sm" variant="outline" className="flex-1 opacity-50" disabled>Unavailable</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Manager detail modal */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg bg-card border-card-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {selected.name.split(" ").map((n: string) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-foreground">{selected.name}</p>
                  <p className="text-sm text-muted-foreground font-normal">{selected.title}</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-profit">{selected.performance}%</p>
                  <p className="text-[10px] text-muted-foreground">Returns</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{selected.winRate}%</p>
                  <p className="text-[10px] text-muted-foreground">Win Rate</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{selected.experience}</p>
                  <p className="text-[10px] text-muted-foreground">Years Exp.</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{selected.totalClients}</p>
                  <p className="text-[10px] text-muted-foreground">Clients</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Strategy</p>
                <p className="text-sm font-medium text-foreground">{selected.strategy}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Specialization</p>
                <p className="text-sm text-foreground">{selected.specialization}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">About</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{selected.bio}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail size={14} />
                {selected.contactEmail}
              </div>
              <div className="flex gap-3 pt-2">
                {currentManager?.id !== selected.id && selected.available && (
                  <Button
                    className="flex-1 bg-primary hover:bg-primary/90"
                    onClick={() => handleSelect(selected.id)}
                    disabled={selectManager.isPending}
                  >
                    <CheckCircle size={14} className="mr-2" />
                    Select This Manager
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setSelected(null); setLocation("/messages?context=manager"); }}
                >
                  <MessageSquare size={14} className="mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
