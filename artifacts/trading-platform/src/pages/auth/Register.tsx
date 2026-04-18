import { useState } from "react";
import { useLocation } from "wouter";
import { TrendingUp, User, Mail, Phone, Globe, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const COUNTRIES = [
  "United Kingdom", "United States", "Canada", "Australia", "Germany", "France", "Netherlands",
  "Singapore", "Japan", "South Africa", "Nigeria", "Kenya", "Ghana", "India", "Brazil",
  "Mexico", "Argentina", "UAE", "Saudi Arabia", "Malaysia", "Indonesia", "Philippines",
  "Thailand", "Vietnam", "Poland", "Sweden", "Norway", "Denmark", "Italy", "Spain",
  "Portugal", "Switzerland", "New Zealand", "Ireland", "Other"
];

const steps = [
  { label: "Personal Info", icon: User },
  { label: "Account Setup", icon: Lock },
  { label: "Verify Email", icon: Mail },
];

export default function Register() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userId, setUserId] = useState("");
  const [otp, setOtp] = useState("");

  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "", username: "", email: "", phone: "", country: "United Kingdom",
    password: "", confirmPassword: "", referralCode: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleStep0(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.username || !form.email || !form.phone || !form.country) {
      toast({ title: "First name, last name, and all required fields must be completed", variant: "destructive" });
      return;
    }
    setStep(1);
  }

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!form.password || !form.confirmPassword) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    if (form.password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data: any = await api.post("/auth/register", {
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        username: form.username,
        email: form.email,
        phone: form.phone,
        country: form.country,
        password: form.password,
        referralCode: form.referralCode || undefined,
      });
      setUserId(data.userId);
      if (data._devOtp) setOtp(data._devOtp);
      toast({ title: "Account created!", description: "Please verify your email." });
      setStep(2);
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      toast({ title: "Enter the 6-digit OTP", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/verify-otp", { userId, code: otp, type: "email_verify" });
      toast({ title: "Email verified!", description: "Now set up your security credentials." });
      navigate(`/auth/security-setup?userId=${userId}`);
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    try {
      await api.post("/auth/resend-otp", { userId, type: "email_verify" });
      toast({ title: "OTP resent", description: "Check your email for the new code." });
    } catch (err: any) {
      toast({ title: "Failed to resend", description: err.message, variant: "destructive" });
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
            <p className="text-sm text-muted-foreground">Create Your Trading Account</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step ? "bg-emerald-500 text-white" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {i < step ? <Check size={14} /> : <Icon size={14} />}
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 w-8 transition-colors ${i < step ? "bg-emerald-500" : "bg-muted"}`} />
                )}
              </div>
            );
          })}
        </div>

        <Card className="border-card-border shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center">{steps[step].label}</CardTitle>
          </CardHeader>
          <CardContent>
            {step === 0 && (
              <form onSubmit={handleStep0} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">First Name *</Label>
                    <Input placeholder="John" value={form.firstName} onChange={set("firstName")} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Middle Name</Label>
                    <Input placeholder="Optional" value={form.middleName} onChange={set("middleName")} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Last Name *</Label>
                    <Input placeholder="Doe" value={form.lastName} onChange={set("lastName")} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Username</Label>
                    <Input placeholder="johndoe" value={form.username} onChange={set("username")} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Email Address</Label>
                  <Input type="email" placeholder="your@email.com" value={form.email} onChange={set("email")} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Phone Number</Label>
                  <Input type="tel" placeholder="+44 7700 900000" value={form.phone} onChange={set("phone")} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Country</Label>
                  <Select value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Referral Code <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                  <Input placeholder="Enter referral code for $500 bonus" value={form.referralCode} onChange={set("referralCode")} />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11">
                  Continue <ArrowRight size={16} className="ml-2" />
                </Button>
              </form>
            )}

            {step === 1 && (
              <form onSubmit={handleStep1} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={set("password")}
                      className="pr-10"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Confirm Password</Label>
                  <Input
                    type="password"
                    placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(0)} className="flex-1 h-11">
                    <ArrowLeft size={16} className="mr-2" /> Back
                  </Button>
                  <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 h-11" disabled={loading}>
                    {loading ? "Creating..." : "Create Account"}
                  </Button>
                </div>
              </form>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/15">
                  <Mail size={32} className="mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    We sent a 6-digit code to <strong className="text-foreground">{form.email}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Code expires in 5 minutes</p>
                </div>
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Verification Code</Label>
                    <Input
                      type="text"
                      placeholder="000000"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      maxLength={6}
                      className="text-center text-lg tracking-widest font-bold"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11" disabled={loading}>
                    {loading ? "Verifying..." : "Verify Email"}
                  </Button>
                </form>
                <button onClick={resendOtp} className="w-full text-sm text-primary hover:underline text-center">
                  Didn't receive code? Resend
                </button>
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <a href="/auth/login" className="text-primary hover:underline font-medium">Sign In</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
