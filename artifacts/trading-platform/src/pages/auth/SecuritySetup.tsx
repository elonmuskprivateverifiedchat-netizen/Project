import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { TrendingUp, Shield, Key, Eye, EyeOff, Copy, CheckCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { setAuth } from "@/lib/auth";

export default function SecuritySetup() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const userId = params.get("userId") || "";
  const { toast } = useToast();

  const [step, setStep] = useState(0); // 0=choose type, 1=set PIN, 2=show credentials
  const [securityType, setSecurityType] = useState<"seed" | "key">("seed");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [credentials, setCredentials] = useState<{ seedPhrase?: string; walletKeyCode?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      toast({ title: "PIN must be at least 4 digits", variant: "destructive" });
      return;
    }
    if (pin !== confirmPin) {
      toast({ title: "PINs do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data: any = await api.post("/auth/setup-security", {
        userId,
        securityType,
        loginPin: pin,
      });
      setCredentials({ seedPhrase: data.seedPhrase, walletKeyCode: data.walletKeyCode });
      setStep(2);
    } catch (err: any) {
      toast({ title: "Setup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function copyCredential() {
    const text = credentials?.seedPhrase || credentials?.walletKeyCode || "";
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied to clipboard!", description: "Store this securely — it cannot be recovered." });
    });
  }

  function handleContinue() {
    if (!confirmed) {
      toast({ title: "Please confirm you've saved your credentials", variant: "destructive" });
      return;
    }
    // Set as authenticated (no token from setup, navigate to login)
    toast({ title: "Setup complete!", description: "Please sign in with your credentials." });
    navigate("/auth/login");
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
            <p className="text-sm text-muted-foreground">Security Setup</p>
          </div>
        </div>

        <Card className="border-card-border shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center">
              {step === 0 ? "Choose Security Type" : step === 1 ? "Create Login PIN" : "Save Your Credentials"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === 0 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Choose how you want to secure your account. This credential is required to sign in.
                </p>
                <div className="grid gap-3">
                  <button
                    onClick={() => { setSecurityType("seed"); setStep(1); }}
                    className={`p-4 rounded-xl border-2 text-left transition-colors ${
                      securityType === "seed" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Shield size={16} className="text-primary" />
                      </div>
                      <span className="font-semibold text-foreground">24-Word Seed Phrase</span>
                    </div>
                    <p className="text-xs text-muted-foreground">A unique phrase of 24 words that acts as your master key. Widely used in crypto security.</p>
                  </button>
                  <button
                    onClick={() => { setSecurityType("key"); setStep(1); }}
                    className="p-4 rounded-xl border-2 border-border hover:border-primary/50 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                        <Key size={16} className="text-blue-400" />
                      </div>
                      <span className="font-semibold text-foreground">Wallet Key Code</span>
                    </div>
                    <p className="text-xs text-muted-foreground">A unique alphanumeric key code for simpler security. Easier to manage but slightly less secure.</p>
                  </button>
                </div>
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleSetup} className="space-y-4">
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/15 text-sm text-muted-foreground">
                  <p>Security type: <strong className="text-foreground capitalize">{securityType === "seed" ? "24-Word Seed Phrase" : "Wallet Key Code"}</strong></p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Create Login PIN</Label>
                  <p className="text-xs text-muted-foreground">This PIN will be required on every login (4-8 digits)</p>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showPin ? "text" : "password"}
                      placeholder="Enter PIN (4-8 digits)"
                      value={pin}
                      onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                      className="pl-9 pr-10"
                      maxLength={8}
                      minLength={4}
                      required
                    />
                    <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Confirm PIN</Label>
                  <Input
                    type="password"
                    placeholder="Repeat PIN"
                    value={confirmPin}
                    onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    maxLength={8}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11" disabled={loading}>
                  {loading ? "Generating..." : "Generate Security Credentials"}
                </Button>
                <button type="button" onClick={() => setStep(0)} className="w-full text-sm text-muted-foreground hover:text-foreground text-center">
                  ← Change security type
                </button>
              </form>
            )}

            {step === 2 && credentials && (
              <div className="space-y-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <p className="text-sm font-semibold text-amber-400 mb-1">⚠️ Critical: Save this now!</p>
                  <p className="text-xs text-muted-foreground">
                    This is your only chance to copy your {securityType === "seed" ? "seed phrase" : "wallet key"}. 
                    It cannot be recovered if lost. Store it offline in a safe place.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Your {securityType === "seed" ? "Seed Phrase" : "Wallet Key Code"}</Label>
                    <Button variant="ghost" size="sm" onClick={copyCredential} className="h-7 text-xs gap-1">
                      {copied ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <div className="p-4 bg-muted rounded-xl border border-border font-mono text-sm break-all text-foreground leading-relaxed">
                    {credentials.seedPhrase || credentials.walletKeyCode}
                  </div>
                </div>

                {credentials.seedPhrase && (
                  <div className="grid grid-cols-4 gap-2">
                    {credentials.seedPhrase.split(" ").map((word, i) => (
                      <div key={i} className="bg-muted/50 rounded-lg px-2 py-1.5 text-center">
                        <span className="text-[10px] text-muted-foreground block">{i + 1}</span>
                        <span className="text-xs font-mono font-semibold text-foreground">{word}</span>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={e => setConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-sm text-muted-foreground">
                    I have saved my {securityType === "seed" ? "seed phrase" : "wallet key code"} in a secure location and understand it cannot be recovered.
                  </span>
                </label>

                <Button onClick={handleContinue} className="w-full bg-primary hover:bg-primary/90 h-11">
                  <CheckCircle size={16} className="mr-2" /> Complete Setup & Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
