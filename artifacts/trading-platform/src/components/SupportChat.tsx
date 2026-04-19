import { useState, useRef, useEffect } from "react";
import { Send, X, HeadphonesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMessages, useSendMessage } from "@/hooks/useApi";
import { timeAgo } from "@/lib/format";

interface Props {
  onClose?: () => void;
  embedded?: boolean;
  ticketId?: string;
  context?: "support" | "manager" | "p2p";
  contextId?: string;
}

export default function SupportChat({ onClose, embedded, ticketId, context = "support", contextId }: Props) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: messages = [], refetch } = useMessages(context, ticketId || contextId);
  const send = useSendMessage();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText("");
    await send.mutateAsync({ content, context, contextId: ticketId || contextId });
    setTimeout(() => refetch(), 3500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-primary/10 border-b border-border">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <HeadphonesIcon size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">XpressProFX Support</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onClose}>
            <X size={14} />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-xs py-8">
            <HeadphonesIcon size={28} className="mx-auto mb-2 opacity-40" />
            <p>How can we help you today?</p>
          </div>
        )}
        {messages.map((msg: any) => (
          <div key={msg.id} className={`flex gap-2 ${msg.isFromUser ? "flex-row-reverse" : "flex-row"}`}>
            <Avatar className="w-6 h-6 flex-shrink-0">
              <AvatarFallback className={`text-[10px] font-bold ${msg.isFromUser ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                {msg.isFromUser ? "ME" : msg.senderName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className={`max-w-[75%] ${msg.isFromUser ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
              <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                msg.isFromUser
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              }`}>
                {msg.content}
              </div>
              <span className="text-[10px] text-muted-foreground px-1">{timeAgo(msg.createdAt)}</span>
            </div>
          </div>
        ))}
        {send.isPending && (
          <div className="flex gap-2 flex-row">
            <Avatar className="w-6 h-6 flex-shrink-0">
              <AvatarFallback className="text-[10px] font-bold bg-muted text-muted-foreground">NT</AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
              <div className="flex gap-1 items-center h-4">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-border flex gap-2">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
          className="text-sm h-9"
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
        />
        <Button size="icon" className="h-9 w-9 flex-shrink-0" onClick={handleSend} disabled={!text.trim() || send.isPending}>
          <Send size={14} />
        </Button>
      </div>
    </div>
  );
}
