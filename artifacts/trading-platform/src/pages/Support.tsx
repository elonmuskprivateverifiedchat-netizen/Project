import { useState } from "react";
import { HeadphonesIcon, Plus, MessageSquare, Instagram, Facebook, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupportTickets, useCreateTicket } from "@/hooks/useApi";
import { timeAgo } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import SupportChat from "@/components/SupportChat";

const statusMeta: Record<string, { label: string; class: string }> = {
  open: { label: "Open", class: "badge-active" },
  in_progress: { label: "In Progress", class: "badge-pending" },
  resolved: { label: "Resolved", class: "badge-completed" },
  closed: { label: "Closed", class: "bg-muted text-muted-foreground border-border" },
};

const priorityMeta: Record<string, { label: string; class: string }> = {
  low: { label: "Low", class: "bg-muted text-muted-foreground border-border" },
  medium: { label: "Medium", class: "badge-pending" },
  high: { label: "High", class: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  urgent: { label: "Urgent", class: "bg-rose-500/15 text-rose-400 border-rose-500/20" },
};

const socialLinks = [
  { label: "Instagram", href: "https://instagram.com/xpressprofx", icon: Instagram },
  { label: "X", href: "https://x.com/xpressprofx", icon: MessageSquare },
  { label: "Telegram", href: "https://t.me/xpressprofx", icon: Send },
  { label: "WhatsApp", href: "https://wa.me/10000000000", icon: HeadphonesIcon },
  { label: "Facebook", href: "https://facebook.com/xpressprofx", icon: Facebook },
];

export default function Support() {
  const { data: tickets = [], isLoading } = useSupportTickets();
  const createTicket = useCreateTicket();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [form, setForm] = useState({ subject: "", message: "", priority: "medium" });

  const handleCreate = async () => {
    if (!form.subject.trim() || !form.message.trim()) return;
    await createTicket.mutateAsync(form);
    toast({ title: "Ticket created!", description: "Our support team will respond shortly." });
    setShowCreate(false);
    setForm({ subject: "", message: "", priority: "medium" });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support Center</h1>
          <p className="text-muted-foreground text-sm mt-1">Get help from our expert support team</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90">
          <Plus size={15} className="mr-2" />
          New Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live chat */}
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare size={16} className="text-primary" />
              Live Chat Support
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-96">
              <SupportChat context="support" />
            </div>
          </CardContent>
        </Card>

        {/* Tickets */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">My Tickets</h2>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-card-border"><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <HeadphonesIcon size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No support tickets yet</p>
              <Button className="mt-3 bg-primary" size="sm" onClick={() => setShowCreate(true)}>
                Open a Ticket
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {tickets.map((ticket: any) => {
                const status = statusMeta[ticket.status] ?? statusMeta.open;
                const priority = priorityMeta[ticket.priority] ?? priorityMeta.medium;
                return (
                  <Card
                    key={ticket.id}
                    className="border-card-border hover:border-primary/30 cursor-pointer transition-colors"
                    onClick={() => setActiveTicket(ticket)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{ticket.subject}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] ${status.class}`}>{status.label}</Badge>
                            <Badge variant="outline" className={`text-[10px] ${priority.class}`}>{priority.label}</Badge>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] text-muted-foreground">{timeAgo(ticket.createdAt)}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {ticket.messages.length} message{ticket.messages.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Official Social Support Channels</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {socialLinks.map(({ label, href, icon: Icon }) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40">
              <Icon size={14} /> {label}
            </a>
          ))}
        </CardContent>
      </Card>

      {/* Create ticket dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-card-border max-w-md">
          <DialogHeader><DialogTitle>Create Support Ticket</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Subject</Label>
              <Input
                className="mt-1.5"
                placeholder="Brief description of your issue"
                value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <Textarea
                className="mt-1.5 min-h-[100px]"
                placeholder="Describe your issue in detail..."
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              />
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={handleCreate}
              disabled={!form.subject || !form.message || createTicket.isPending}
            >
              Submit Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket detail dialog */}
      <Dialog open={!!activeTicket} onOpenChange={open => !open && setActiveTicket(null)}>
        {activeTicket && (
          <DialogContent className="bg-card border-card-border max-w-lg h-[600px] flex flex-col p-0">
            <div className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
              <DialogTitle className="text-base">{activeTicket.subject}</DialogTitle>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className={`text-[10px] ${(statusMeta[activeTicket.status] ?? statusMeta.open).class}`}>
                  {(statusMeta[activeTicket.status] ?? statusMeta.open).label}
                </Badge>
                <Badge variant="outline" className={`text-[10px] ${(priorityMeta[activeTicket.priority] ?? priorityMeta.medium).class}`}>
                  {(priorityMeta[activeTicket.priority] ?? priorityMeta.medium).label}
                </Badge>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <SupportChat context="support" ticketId={activeTicket.id} />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
