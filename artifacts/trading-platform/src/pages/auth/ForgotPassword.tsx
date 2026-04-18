import { useState } from "react";
import { useLocation } from "wouter";
import { TrendingUp, Mail, Shield, Lock, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

type Step = "email" | "otp" | "reset" | "done";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [form, setForm] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
    newPin: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email) { toast({ title: "Email required", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const data: any = await api.post("/auth/forgot-password", { email: form.email });
      setUserId(data.userId || "");
      if (data._devOtp) setDevOtp(data._devOtp);
      setStep("otp");
      toast({ title: "Reset code sent", description: "Check your email for the verification code." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.otp) { toast({ title: "Code required", variant: "destructive" }); return; }
    setStep("reset");
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.newPassword) { toast({ title: "New password required", variant: "destructive" }); return; }
    if (form.newPassword !== form.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        userId,
        code: form.otp,
        newPassword: form.newPassword,
        ...(form.newPin && { newPin: form.newPin }),
      });
      setStep("done");
    } catch (err: any) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <TrendingUp size={28} className="text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">EXPRESSPRO101</h1>
            <p className="text-sm text-muted-foreground">Account Recovery</p>
          </div>
        </div>

        <Card className="border-card-border shadow-xl">
          {step === "done" ? (
            <CardContent className="pt-8 pb-6 text-center space-y-4">
              <CheckCircle size={48} className="mx-auto text-emerald-400" />
              <h2 className="text-xl font-bold text-foreground">Password Reset</h2>
              <p className="text-sm text-muted-foreground">
                Your password has been reset successfully. You can now sign in with your new credentials.
              </p>
              <Button className="w-full" onClick={() => navigate("/auth/login")}>
                Go to Sign In
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-center">
                  {step === "email" && "Forgot Password"}
                  {step === "otp" && "Enter Reset Code"}
                  {step === "reset" && "Set New Password"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {step === "email" && (
                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Enter your registered email address and we'll send you a reset code.
                    </p>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input type="email" placeholder="your@email.com" value={form.email}
                          onChange={set("email")} className="pl-9" required />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Sending..." : "Send Reset Code"}
                    </Button>
                  </form>
                )}

                {step === "otp" && (
                  <form onSubmit={handleOtpSubmit} className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit code sent to your email.
                    </p>
                    {devOtp && (
                      <div className="p-2 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-xs text-primary text-center">Dev mode code: <span className="font-bold">{devOtp}</span></p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Verification Code</Label>
                      <div className="relative">
                        <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="000000" value={form.otp} onChange={set("otp")}
                          className="pl-9 text-center text-lg tracking-widest" maxLength={6} required />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">Continue</Button>
                  </form>
                )}

                {step === "reset" && (
                  <form onSubmit={handleResetSubmit} className="space-y-4">
                    <p className="text-sm text-muted-foreground">Set a new password for your account.</p>
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input type="password" placeholder="New password" value={form.newPassword}
                          onChange={set("newPassword")} className="pl-9" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm New Password</Label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input type="password" placeholder="Confirm password" value={form.confirmPassword}
                          onChange={set("confirmPassword")} className="pl-9" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>New Login PIN (optional)</Label>
                      <Input type="password" placeholder="New 6-digit PIN" value={form.newPin}
                        onChange={set("newPin")} maxLength={8} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Resetting..." : "Reset Password"}
                    </Button>
                  </form>
                )}

                <div className="mt-4 text-center">
                  <button onClick={() => step === "email" ? navigate("/auth/login") : setStep("email")}
                    className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                    <ArrowLeft size={14} />
                    {step === "email" ? "Back to Sign In" : "Start Over"}
                  </button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
