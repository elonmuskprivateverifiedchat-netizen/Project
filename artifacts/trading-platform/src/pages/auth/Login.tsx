import { useState } from "react";
import { useLocation } from "wouter";
import { TrendingUp, Eye, EyeOff, Mail, Lock, ArrowRight, Shield, Hash, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { setAuth } from "@/lib/auth";

type Step = "login" | "admin-email" | "admin-otp";

const TRUST_BADGES = [
  "256-bit TLS Encryption",
  "FCA Regulated Standards",
  "Segregated Client Funds",
];

export default function Login() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("login");
  const [showCred, setShowCred] = useState(false);

  const nextPath = (() => {
    const params = new URLSearchParams(location.split("?")[1] ?? "");
    const n = params.get("next");
    return n && n.startsWith("/") ? n : "/dashboard";
  })();

  const [form, setForm] = useState({ email: "", securityCredential: "", loginPin: "" });
  const [adminRepEmail, setAdminRepEmail] = useState("");
  const [adminOtp, setAdminOtp] = useState("");
  const [pendingAdminRepEmail, setPendingAdminRepEmail] = useState("");
  const [showAdminFields, setShowAdminFields] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleUserLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.securityCredential) {
      toast({ title: "Email and security credential are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data: any = await api.post("/auth/login", {
        email: form.email.trim().toLowerCase(),
        securityCredential: form.securityCredential.trim(),
        loginPin: form.loginPin.trim() || undefined,
      });
      setAuth(data.token, data.user.id, data.user.role);
      toast({ title: "Signed in successfully", description: `Welcome back, ${data.user.fullName}!` });
      navigate(nextPath);
    } catch (err: any) {
      toast({ title: "Sign in failed", description: err.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.securityCredential || !form.loginPin) {
      toast({ title: "All fields required for admin access", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data: any = await api.post("/auth/admin-step1", {
        email: form.email.trim().toLowerCase(),
        securityCredential: form.securityCredential.trim(),
        loginCode: form.loginPin.trim(),
        adminEmail: adminRepEmail.trim().toLowerCase(),
      });
      setPendingAdminRepEmail(adminRepEmail.trim().toLowerCase());
      toast({ title: "Verification code sent", description: data.message });
      setStep("admin-otp");
    } catch (err: any) {
      toast({ title: "Admin access denied", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminStep2(e: React.FormEvent) {
    e.preventDefault();
    if (!adminOtp || adminOtp.length < 4) {
      toast({ title: "Enter the 4-digit verification code", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data: any = await api.post("/auth/admin-step2", {
        adminEmail: pendingAdminRepEmail,
        code: adminOtp.trim(),
      });
      setAuth(data.token, data.user.id, "admin");
      window.sessionStorage.setItem("xpfx_is_admin", "true");
      toast({ title: "Admin access granted", description: "Welcome to the XpressProFX control panel." });
      navigate("/c-panel");
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setLoading(true);
    try {
      const data: any = await api.get("/auth/demo");
      setAuth(data.token, data.user.id, data.user.role);
      toast({ title: "Demo account ready!", description: "Welcome! Explore XpressProFX risk-free." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Demo unavailable", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">

        {/* ── Brand mark ── */}
        <div className="flex flex-col items-center gap-3 pb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp size={20} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">XpressProFX</h1>
              <p className="text-[11px] text-muted-foreground">Professional Forex Trading Platform</p>
            </div>
          </div>
        </div>

        {/* ── Regular Login ── */}
        {step === "login" && (
          <Card className="border-card-border shadow-2xl">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-[15px] font-semibold text-foreground">Sign In to Your Account</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Enter your registered credentials to access your portfolio</p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <form onSubmit={showAdminFields ? handleAdminStep1 : handleUserLogin} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Email Address</Label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={set("email")}
                      className="pl-8 h-9 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px]">{showAdminFields ? "Security Credential" : "Seed Phrase / Wallet Key"}</Label>
                  {!showAdminFields && (
                    <p className="text-[10px] text-muted-foreground">Enter your 24-word seed phrase or wallet key code</p>
                  )}
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                    <textarea
                      placeholder={showAdminFields ? "Seed phrase or private key..." : "word1 word2 word3 ... or EXP-XXXX..."}
                      value={form.securityCredential}
                      onChange={e => setForm(f => ({ ...f, securityCredential: e.target.value }))}
                      className="w-full pl-8 pr-4 py-2 min-h-[80px] bg-input border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px]">{showAdminFields ? "Login Code" : "Login PIN"} <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <div className="relative">
                    {showAdminFields
                      ? <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      : <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    }
                    <Input
                      type={showCred ? "text" : "password"}
                      placeholder={showAdminFields ? "Enter login code" : "4–6 digit PIN"}
                      value={form.loginPin}
                      onChange={set("loginPin")}
                      className="pl-8 pr-9 h-9 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCred(!showCred)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCred ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Admin rep email */}
                {showAdminFields && (
                  <div className="space-y-1.5 p-3 bg-rose-500/5 border border-rose-500/15 rounded-lg">
                    <Label className="text-rose-400 text-[12px] flex items-center gap-1.5">
                      <Shield size={12} />Admin Representative Email
                    </Label>
                    <Input
                      type="email"
                      placeholder="your-admin@email.com"
                      value={adminRepEmail}
                      onChange={e => setAdminRepEmail(e.target.value)}
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-10 bg-primary hover:bg-primary/90 text-sm font-semibold mt-1"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : showAdminFields ? "Send Verification Code" : "Sign In"}
                  {!loading && <ArrowRight size={15} className="ml-2" />}
                </Button>

                <button
                  type="button"
                  className="w-full text-[10px] text-muted-foreground/25 hover:text-muted-foreground/50 py-0.5 transition-colors"
                  onClick={() => setShowAdminFields(!showAdminFields)}
                >
                  {showAdminFields ? "Switch to user login" : "·"}
                </button>
              </form>

              <div className="mt-4 space-y-2 text-center text-[12px] text-muted-foreground">
                <p>
                  <a href="/auth/forgot-password" className="text-primary hover:underline font-medium">Forgot password?</a>
                </p>
                <p>
                  New to XpressProFX?{" "}
                  <a href="/auth/register" className="text-primary hover:underline font-medium">Create account</a>
                </p>
              </div>

              {/* Demo section */}
              <div className="mt-4 p-3 bg-primary/5 border border-primary/15 rounded-lg">
                <p className="text-[11px] text-primary font-semibold text-center mb-2">Explore with a Demo Account</p>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={loading}
                  className="w-full text-[12px] text-primary hover:text-primary/80 font-semibold py-2 border border-primary/30 rounded bg-primary/8 hover:bg-primary/12 transition-colors disabled:opacity-50"
                >
                  {loading ? "Loading..." : "$10,000 Demo — No Sign-Up Required"}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Admin OTP ── */}
        {step === "admin-otp" && (
          <Card className="border-rose-500/20 shadow-2xl">
            <CardHeader className="pb-3 pt-5">
              <div className="flex flex-col items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-rose-500/12 flex items-center justify-center">
                  <Shield size={20} className="text-rose-400" />
                </div>
                <CardTitle className="text-[15px] font-semibold text-center">Admin Two-Factor Verification</CardTitle>
                <p className="text-[12px] text-muted-foreground text-center">
                  A 4-digit code was sent to <strong className="text-foreground">{pendingAdminRepEmail}</strong>
                </p>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <form onSubmit={handleAdminStep2} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Verification Code</Label>
                  <Input
                    type="text"
                    placeholder="0000"
                    value={adminOtp}
                    onChange={e => setAdminOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                    className="text-center text-2xl num tracking-widest h-13"
                    autoFocus
                    required
                  />
                  <p className="text-[10px] text-muted-foreground text-center">Code expires in 30 minutes</p>
                </div>
                <Button
                  type="submit"
                  className="w-full h-10 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Access Admin Panel"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep("login"); setAdminOtp(""); }}
                  className="w-full text-[12px] text-muted-foreground hover:text-foreground text-center py-1 transition-colors"
                >
                  ← Back to login
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Trust badges ── */}
        <div className="flex items-center justify-center gap-0 divide-x divide-border rounded-lg border border-border bg-card/50">
          {TRUST_BADGES.map(badge => (
            <div key={badge} className="flex items-center gap-1.5 px-3 py-2 flex-1 justify-center">
              <CheckCircle size={10} className="text-primary flex-shrink-0" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{badge}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-[10px] text-muted-foreground/60">
          © 2024 XpressProFX. All rights reserved. For support, contact{" "}
          <a href="mailto:support@xpressprofx.com" className="text-primary/70 hover:text-primary">support@xpressprofx.com</a>
        </p>
      </div>
    </div>
  );
}
