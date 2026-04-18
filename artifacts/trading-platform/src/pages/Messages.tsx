import { useSearch } from "wouter";
import { MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import SupportChat from "@/components/SupportChat";

export default function Messages() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const context = (params.get("context") as "manager" | "p2p" | "support") || "manager";
  const contextId = params.get("contextId") ?? undefined;

  const contextLabel: Record<string, string> = {
    manager: "Account Manager",
    p2p: "P2P Trade Chat",
    support: "Support Chat",
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {contextLabel[context] ?? "Chat"}
        </p>
      </div>

      <Card className="border-card-border h-[600px] overflow-hidden flex flex-col">
        <SupportChat context={context} contextId={contextId} />
      </Card>
    </div>
  );
}
