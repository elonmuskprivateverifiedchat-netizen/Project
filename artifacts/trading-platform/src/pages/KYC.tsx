import { useState } from "react";
import {
  Shield, CheckCircle, Clock, AlertCircle, Upload, FileText,
  User, CreditCard, Home, Lock, ChevronRight, Info, BadgeCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const DOC_TYPES = [
  { value: "national_id",       label: "National ID Card",    icon: CreditCard, step: 1, required: true  },
  { value: "passport",          label: "Passport",            icon: User,       step: 1, required: false },
  { value: "drivers_license",   label: "Driver's License",    icon: FileText,   step: 1, required: false },
  { value: "proof_of_address",  label: "Proof of Address",    icon: Home,       step: 2, required: true  },
  { value: "selfie_with_id",    label: "Selfie with ID",      icon: User,       step: 3, required: true  },
];

const WIZARD_STEPS = [
  {
    id: 1,
    label: "Identity",
    description: "Government-issued photo ID",
    docTypes: ["national_id", "passport", "drivers_license"],
    requiredOne: true,
  },
  {
    id: 2,
    label: "Address",
    description: "Proof of residential address",
    docTypes: ["proof_of_address"],
    requiredOne: true,
  },
  {
    id: 3,
    label: "Selfie",
    description: "Live photo holding your ID",
    docTypes: ["selfie_with_id"],
    requiredOne: true,
  },
  {
    id: 4,
    label: "Review",
    description: "Under compliance review",
    docTypes: [],
    requiredOne: false,
  },
];

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; Icon: any }> = {
    unverified: { label: "Unverified",    className: "bg-muted text-muted-foreground border-border",            Icon: AlertCircle  },
    pending:    { label: "Under Review",  className: "bg-amber-500/15 text-amber-400 border-amber-500/20",      Icon: Clock        },
    verified:   { label: "Verified",      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", Icon: CheckCircle  },
    rejected:   { label: "Rejected",      className: "bg-rose-500/15 text-rose-400 border-rose-500/20",         Icon: AlertCircle  },
  };
  const c = config[status] || config.unverified;
  const Icon = c.Icon;
  return (
    <Badge variant="outline" className={`gap-1.5 text-sm px-3 py-1 ${c.className}`}>
      <Icon size={14} /> {c.label}
    </Badge>
  );
}

function StepIndicator({
  stepNum, label, description, status,
}: {
  stepNum: number; label: string; description: string;
  status: "done" | "active" | "locked";
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center min-w-0">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
        status === "done"   ? "bg-emerald-500 border-emerald-500 text-white" :
        status === "active" ? "bg-primary/20 border-primary text-primary" :
                              "bg-muted/30 border-border text-muted-foreground"
      }`}>
        {status === "done" ? <CheckCircle size={18} /> :
         status === "locked" ? <Lock size={14} /> :
         <span className="text-sm font-semibold">{stepNum}</span>}
      </div>
      <div>
        <p className={`text-xs font-medium ${
          status === "done" ? "text-emerald-400" :
          status === "active" ? "text-foreground" :
          "text-muted-foreground"
        }`}>{label}</p>
        <p className="text-[10px] text-muted-foreground hidden sm:block">{description}</p>
      </div>
    </div>
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
      toast({ title: "Document submitted", description: "We'll review within 1–3 business days." });
      setDocUrl("");
    },
    onError: (err: any) => toast({ title: "Submission failed", description: err.message, variant: "destructive" }),
  });

  function simulateUpload() {
    setUploading(true);
    setTimeout(() => {
      setDocUrl(`https://storage.xpressprofx.com/kyc/${Date.now()}-${docType}.jpg`);
      setUploading(false);
      toast({ title: "Document ready", description: "Click Submit Document to proceed." });
    }, 1800);
  }

  const kycStatus   = kycData?.kycStatus || "unverified";
  const documents: any[] = kycData?.documents || [];
  const submittedTypes = documents.map((d: any) => d.docType);

  function stepStatus(ws: (typeof WIZARD_STEPS)[number]): "done" | "active" | "locked" {
    if (ws.id === 4) {
      return kycStatus === "pending" || kycStatus === "verified" ? "done" : "locked";
    }
    const docsDone = ws.docTypes.some(t => submittedTypes.includes(t));
    if (docsDone) return "done";
    const prevSteps = WIZARD_STEPS.filter(s => s.id < ws.id && s.id < 4);
    const prevDone = prevSteps.every(ps => ps.docTypes.some(t => submittedTypes.includes(t)));
    return prevDone ? "active" : "locked";
  }

  const activeStep = WIZARD_STEPS.find(ws => stepStatus(ws) === "active") ?? WIZARD_STEPS[0];
  const availableDocTypes = DOC_TYPES.filter(d => activeStep.docTypes.includes(d.value));

  const allStepsDone = WIZARD_STEPS.slice(0, 3).every(ws => stepStatus(ws) === "done");
  const isVerified = kycStatus === "verified";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield size={22} className="text-primary" />
            Identity Verification
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete KYC to unlock full trading limits and withdrawal capabilities.
          </p>
        </div>
        <StatusBadge status={kycStatus} />
      </div>

      {/* Progress Wizard */}
      <Card className="border-card-border bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <CardContent className="p-6">
          <div className="flex items-start justify-between relative">
            {/* Connecting line */}
            <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-border" />
            <div
              className="absolute top-5 left-[10%] h-0.5 bg-emerald-500 transition-all duration-500"
              style={{
                width: `${Math.min(
                  (WIZARD_STEPS.filter(ws => stepStatus(ws) === "done").length / (WIZARD_STEPS.length - 1)) * 80,
                  80
                )}%`,
              }}
            />
            {WIZARD_STEPS.map(ws => (
              <StepIndicator
                key={ws.id}
                stepNum={ws.id}
                label={ws.label}
                description={ws.description}
                status={stepStatus(ws)}
              />
            ))}
          </div>

          {/* Status message */}
          <div className="mt-5 pt-4 border-t border-border/50">
            {isVerified ? (
              <div className="flex items-center gap-3 text-sm">
                <BadgeCheck size={18} className="text-emerald-400 shrink-0" />
                <span className="text-emerald-400 font-medium">
                  Account fully verified — all trading limits and withdrawal features are unlocked.
                </span>
              </div>
            ) : kycStatus === "pending" ? (
              <div className="flex items-center gap-3 text-sm">
                <Clock size={16} className="text-amber-400 shrink-0" />
                <span className="text-muted-foreground">
                  Your documents are under review. Compliance checks typically take{" "}
                  <span className="text-foreground font-medium">1–3 business days</span>.
                </span>
              </div>
            ) : allStepsDone ? (
              <div className="flex items-center gap-3 text-sm">
                <Info size={16} className="text-primary shrink-0" />
                <span className="text-muted-foreground">
                  All documents submitted — awaiting compliance review.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm">
                <Info size={16} className="text-primary shrink-0" />
                <span className="text-muted-foreground">
                  Complete step{" "}
                  <span className="text-foreground font-medium">{activeStep.id} of 3</span>:{" "}
                  {activeStep.description}.
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — Submit document */}
        {!isVerified && !allStepsDone && (
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload size={16} className="text-primary" />
                Step {activeStep.id}: {activeStep.label} Document
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{activeStep.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Document type selector */}
              <div className="space-y-2">
                <Label className="text-sm">Document Type</Label>
                {availableDocTypes.length > 1 ? (
                  <Select value={docType} onValueChange={v => { setDocType(v); setDocUrl(""); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDocTypes.map(d => (
                        <SelectItem key={d.value} value={d.value}>
                          <div className="flex items-center gap-2">
                            <d.icon size={14} />
                            {d.label}
                            {submittedTypes.includes(d.value) && (
                              <Badge variant="outline" className="text-[10px] ml-1 border-emerald-500/30 text-emerald-400">
                                ✓ Submitted
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : availableDocTypes.length === 1 ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border text-sm text-foreground">
                    {(() => { const d = availableDocTypes[0]; const Icon = d.icon; return <><Icon size={14} className="text-primary" />{d.label}</>; })()}
                  </div>
                ) : null}
              </div>

              {/* Upload zone */}
              <div className="space-y-2">
                <Label className="text-sm">Upload File</Label>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Upload document"
                  onKeyDown={e => e.key === "Enter" && !docUrl && !uploading && simulateUpload()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    docUrl
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-border hover:border-primary/50 hover:bg-primary/5"
                  }`}
                  onClick={!docUrl && !uploading ? simulateUpload : undefined}
                >
                  {docUrl ? (
                    <div>
                      <CheckCircle size={30} className="mx-auto mb-2 text-emerald-400" />
                      <p className="text-sm text-emerald-400 font-medium">Document ready to submit</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click below to complete this step, or click here to re-upload
                      </p>
                      <button
                        className="text-xs text-primary underline mt-2"
                        onClick={e => { e.stopPropagation(); setDocUrl(""); }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : uploading ? (
                    <div>
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Uploading securely…</p>
                    </div>
                  ) : (
                    <div>
                      <Upload size={28} className="mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Click to upload document</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG, or PDF — Max 10 MB</p>
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={() => {
                  const targetDoc = availableDocTypes.find(d => d.value === docType) ?? availableDocTypes[0];
                  submitDoc.mutate({ docType: targetDoc?.value ?? docType, docUrl });
                }}
                disabled={!docUrl || submitDoc.isPending}
                className="w-full"
              >
                {submitDoc.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Submitting…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Submit Document <ChevronRight size={16} />
                  </span>
                )}
              </Button>

              <p className="text-[11px] text-muted-foreground text-center">
                Documents are encrypted with AES-256 and processed under FCA compliance standards.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Verified success panel */}
        {isVerified && (
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-8 text-center">
              <BadgeCheck size={48} className="mx-auto mb-4 text-emerald-400" />
              <h3 className="text-lg font-semibold text-emerald-400 mb-2">Identity Verified</h3>
              <p className="text-sm text-muted-foreground">
                Your account is fully verified under FCA compliance standards.
                All trading limits and withdrawal features are unlocked.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Pending review panel */}
        {!isVerified && allStepsDone && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-8 text-center">
              <Clock size={40} className="mx-auto mb-4 text-amber-400" />
              <h3 className="text-lg font-semibold text-amber-400 mb-2">Under Review</h3>
              <p className="text-sm text-muted-foreground">
                All documents submitted. Our compliance team will review your application within
                <span className="text-foreground font-medium"> 1–3 business days</span>.
                You'll receive an email notification once verified.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Submitted documents list */}
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              Submitted Documents
              {documents.length > 0 && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {documents.length} file{documents.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-10">
                <FileText size={32} className="mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No documents submitted yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start with Step 1 to the left — upload a government-issued photo ID
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents.map((doc: any) => {
                  const docMeta = DOC_TYPES.find(d => d.value === doc.docType);
                  const Icon = docMeta?.icon || FileText;
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon size={14} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{docMeta?.label || doc.docType}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(doc.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
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

      {/* Requirements checklist */}
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield size={16} className="text-primary" />
            Verification Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {[
              {
                title: "Step 1 — Photo ID",
                items: ["National ID Card", "Passport (any country)", "Driver's License"],
                icon: CreditCard,
                note: "Submit ONE of the above",
                stepId: 1,
              },
              {
                title: "Step 2 — Proof of Address",
                items: ["Bank statement (last 3 months)", "Utility bill (last 3 months)", "Council tax / government letter"],
                icon: Home,
                note: "Address must match registration",
                stepId: 2,
              },
              {
                title: "Step 3 — Selfie",
                items: ["Clear photo of your face", "Holding your photo ID", "Good lighting, no filters"],
                icon: User,
                note: "Live selfie only — no screenshots",
                stepId: 3,
              },
            ].map(({ title, items, icon: Icon, note, stepId }) => {
              const ws = WIZARD_STEPS.find(s => s.id === stepId)!;
              const done = stepStatus(ws) === "done";
              return (
                <div
                  key={title}
                  className={`p-4 rounded-xl border transition-colors ${
                    done ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-muted/10"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${done ? "bg-emerald-500" : "bg-muted"}`}>
                      {done ? <CheckCircle size={12} className="text-white" /> : <Icon size={12} className="text-muted-foreground" />}
                    </div>
                    <span className={`text-xs font-semibold ${done ? "text-emerald-400" : "text-foreground"}`}>{title}</span>
                  </div>
                  <ul className="space-y-1.5 mb-3">
                    {items.map(item => (
                      <li key={item} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-muted-foreground border-t border-border/50 pt-2">{note}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Compliance trust strip */}
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-3 px-6 bg-muted/10 rounded-xl border border-border/50">
        {[
          { label: "AES-256 Encrypted",    icon: Lock        },
          { label: "FCA Compliant",         icon: Shield      },
          { label: "GDPR Protected",        icon: BadgeCheck  },
          { label: "SOC 2 Certified",       icon: CheckCircle },
        ].map(({ label, icon: Icon }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon size={12} className="text-primary" />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
