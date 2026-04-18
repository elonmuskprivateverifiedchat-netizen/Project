import { useState } from "react";
import { Shield, CheckCircle, Clock, AlertCircle, Upload, FileText, User, CreditCard, Home } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const DOC_TYPES = [
  { value: "national_id", label: "National ID Card", icon: CreditCard },
  { value: "passport", label: "Passport", icon: User },
  { value: "drivers_license", label: "Driver's License", icon: FileText },
  { value: "proof_of_address", label: "Proof of Address", icon: Home },
  { value: "selfie_with_id", label: "Selfie with ID", icon: User },
];

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; Icon: any }> = {
    unverified: { label: "Unverified", className: "bg-muted text-muted-foreground border-border", Icon: AlertCircle },
    pending: { label: "Under Review", className: "bg-amber-500/15 text-amber-400 border-amber-500/20", Icon: Clock },
    verified: { label: "Verified", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", Icon: CheckCircle },
    rejected: { label: "Rejected", className: "bg-rose-500/15 text-rose-400 border-rose-500/20", Icon: AlertCircle },
  };
  const c = config[status] || config.unverified;
  const Icon = c.Icon;
  return (
    <Badge variant="outline" className={`gap-1.5 text-sm px-3 py-1 ${c.className}`}>
      <Icon size={14} /> {c.label}
    </Badge>
  );
}

export default function KYC() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [docType, setDocType] = useState("national_id");
  const [docUrl, setDocUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: kycData, isLoading } = useQuery({
    queryKey: ["kyc"],
    queryFn: () => api.get<any>("/kyc/status"),
  });

  const submitDoc = useMutation({
    mutationFn: (body: { docType: string; docUrl: string }) => api.post<any>("/kyc/submit", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kyc"] });
      qc.invalidateQueries({ queryKey: ["user"] });
      toast({ title: "Document submitted!", description: "We'll review within 24 hours." });
      setDocUrl("");
    },
    onError: (err: any) => toast({ title: "Submission failed", description: err.message, variant: "destructive" }),
  });

  function simulateUpload() {
    setUploading(true);
    setTimeout(() => {
      // Mock upload URL
      setDocUrl(`https://mock-storage.expresspro101.com/kyc/${Date.now()}-${docType}.jpg`);
      setUploading(false);
      toast({ title: "Document uploaded", description: "Click Submit to complete verification." });
    }, 1500);
  }

  const kycStatus = kycData?.kycStatus || "unverified";
  const documents = kycData?.documents || [];
  const submittedTypes = documents.map((d: any) => d.docType);

  const steps = [
    { label: "Submit Documents", done: documents.length > 0 },
    { label: "Identity Review", done: kycStatus === "verified" || kycStatus === "rejected" },
    { label: "Verified", done: kycStatus === "verified" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield size={24} className="text-primary" /> KYC Verification
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verify your identity to unlock all trading features and increase limits.
        </p>
      </div>

      {/* Status card */}
      <Card className="border-card-border bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Verification Status</p>
              <StatusBadge status={kycStatus} />
              {kycStatus === "pending" && (
                <p className="text-xs text-muted-foreground mt-2">Review typically takes 1-3 business days.</p>
              )}
              {kycStatus === "verified" && (
                <p className="text-xs text-emerald-400 mt-2">Your account is fully verified. All features unlocked!</p>
              )}
            </div>
            {/* Progress steps */}
            <div className="flex items-center gap-2">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                    s.done ? "bg-emerald-500 text-white" : i === 0 ? "bg-primary/30 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {s.done ? <CheckCircle size={14} /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:block ${s.done ? "text-emerald-400" : "text-muted-foreground"}`}>{s.label}</span>
                  {i < steps.length - 1 && <div className={`h-0.5 w-4 ${s.done ? "bg-emerald-500" : "bg-muted"}`} />}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submit document */}
        {kycStatus !== "verified" && (
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload size={16} className="text-primary" /> Submit Document
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(d => (
                      <SelectItem key={d.value} value={d.value}>
                        <div className="flex items-center gap-2">
                          <d.icon size={14} />
                          {d.label}
                          {submittedTypes.includes(d.value) && <Badge variant="outline" className="text-[10px] ml-1">Submitted</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Document File</Label>
                <div
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={!docUrl ? simulateUpload : undefined}
                >
                  {docUrl ? (
                    <div>
                      <CheckCircle size={28} className="mx-auto mb-2 text-emerald-400" />
                      <p className="text-sm text-emerald-400 font-medium">Document ready</p>
                      <p className="text-xs text-muted-foreground mt-1">Click submit to proceed</p>
                    </div>
                  ) : (
                    <div>
                      {uploading ? (
                        <div>
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Uploading...</p>
                        </div>
                      ) : (
                        <div>
                          <Upload size={28} className="mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium text-foreground">Click to upload document</p>
                          <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF — Max 10MB</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={() => submitDoc.mutate({ docType, docUrl })}
                disabled={!docUrl || submitDoc.isPending}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {submitDoc.isPending ? "Submitting..." : "Submit Document"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Submitted documents */}
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText size={16} className="text-primary" /> Submitted Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={32} className="mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No documents submitted yet</p>
                <p className="text-xs text-muted-foreground mt-1">Submit at least one ID document to get verified</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc: any) => {
                  const docMeta = DOC_TYPES.find(d => d.value === doc.docType);
                  const Icon = docMeta?.icon || FileText;
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon size={14} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{docMeta?.label || doc.docType}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(doc.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Requirements info */}
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">KYC Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {[
              { title: "Identity Document", items: ["National ID Card", "Passport", "Driver's License"], icon: CreditCard },
              { title: "Proof of Address", items: ["Bank Statement (3mo)", "Utility Bill (3mo)", "Council Tax Letter"], icon: Home },
              { title: "Selfie Verification", items: ["Clear face photo", "Holding your ID", "Good lighting required"], icon: User },
            ].map(({ title, items, icon: Icon }) => (
              <div key={title} className="p-4 bg-muted/20 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} className="text-primary" />
                  <span className="font-medium text-foreground">{title}</span>
                </div>
                <ul className="space-y-1">
                  {items.map(item => (
                    <li key={item} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-primary/60" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
