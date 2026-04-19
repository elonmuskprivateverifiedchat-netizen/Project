import { useState } from "react";
import { useLocation } from "wouter";
import { Lock, Eye, EyeOff, Shield, User, Bell, KeyRound, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useUser } from "@/hooks/useApi";

export default function Settings() {
  const { toast } = useToast();
  const { data: user } = useUser();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "", newPin: "" });

  const setpw = (k: keyof typeof pwForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPwForm(f => ({ ...f, [k]: e.target.value }));

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      toast({ title: "All fields required", variant: "destructive" }); return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast({ title: "New passwords do not match", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
        ...(pwForm.newPin && { newPin: pwForm.newPin }),
      });
      toast({ title: "Password changed successfully" });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "", newPin: "" });
    } catch (err: any) {
      toast({ title: "Failed to change password", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your security and account preferences</p>
      </div>

      {/* Profile summary */}
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User size={18} className="text-primary" />
            <CardTitle className="text-base">Profile Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground">Full Name</p><p className="font-medium">{user?.fullName}</p></div>
          <div><p className="text-muted-foreground">Username</p><p className="font-medium">@{user?.username}</p></div>
          <div><p className="text-muted-foreground">Email</p><p className="font-medium">{user?.email}</p></div>
          <div><p className="text-muted-foreground">Country</p><p className="font-medium">{user?.country}</p></div>
          <div>
            <p className="text-muted-foreground">KYC Status</p>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              user?.kycStatus === "verified" ? "bg-emerald-500/15 text-emerald-400" :
              user?.kycStatus === "pending" ? "bg-amber-500/15 text-amber-400" :
              "bg-rose-500/15 text-rose-400"
            }`}>
              {user?.kycStatus === "verified" ? <CheckCircle size={10} /> : <Shield size={10} />}
              {user?.kycStatus ?? "unverified"}
            </span>
          </div>
          <div>
            <p className="text-muted-foreground">Security Type</p>
            <p className="font-medium capitalize">{user?.securityType ?? "seed"} phrase</p>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-primary" />
            <CardTitle className="text-base">Change Password</CardTitle>
          </div>
          <CardDescription>Update your account password and login PIN</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password / Seed Phrase / Wallet Key</Label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="Enter current credentials"
                  value={pwForm.currentPassword}
                  onChange={setpw("currentPassword")}
                  className="pl-9 pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" placeholder="New password" value={pwForm.newPassword}
                  onChange={setpw("newPassword")} required />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" placeholder="Confirm password" value={pwForm.confirmPassword}
                  onChange={setpw("confirmPassword")} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Login PIN (optional)</Label>
              <div className="relative">
                <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" placeholder="New 6-digit PIN (leave blank to keep current)"
                  value={pwForm.newPin} onChange={setpw("newPin")} className="pl-9" maxLength={8} />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security notice */}
      <Card className="border-card-border bg-amber-500/5 border-amber-500/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Shield size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">Security Notice</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your seed phrase or wallet key code is the master credential for your account. 
                Never share it with anyone. XpressProFX staff will never ask for your seed phrase.
                Store it securely offline — it cannot be recovered if lost.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
