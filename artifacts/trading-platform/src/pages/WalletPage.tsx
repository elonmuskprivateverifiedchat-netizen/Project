import { useState } from "react";
import {
  Wallet, Link2, Eye, EyeOff, Copy, ArrowUpRight, ArrowDownRight, AlertTriangle, Plus,
  Building, Trash2, CheckCircle, Download, Key, BookOpen, Hash, Send, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  useWallets, useTransactions, useConnectWallet,
  useBankAccounts, useAddBankAccount, useDeleteBankAccount,
  useDeposit, useWithdraw, useConnectedWallets
} from "@/hooks/useApi";
import { formatCurrency, timeAgo } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const DEPOSIT_METHODS = [
  { value: "bank_wire", label: "Bank Wire Transfer" },
  { value: "credit_card", label: "Credit / Debit Card" },
  { value: "crypto", label: "Cryptocurrency" },
  { value: "paypal", label: "PayPal" },
  { value: "wise", label: "Wise Transfer" },
];

const WALLET_TYPES = [
  { value: "metamask", label: "MetaMask" },
  { value: "trust_wallet", label: "Trust Wallet" },
  { value: "coinbase_wallet", label: "Coinbase Wallet" },
  { value: "phantom", label: "Phantom" },
  { value: "ledger", label: "Ledger" },
  { value: "trezor", label: "Trezor" },
  { value: "other", label: "Other" },
];

const txTypeLabel: Record<string, { label: string; isCredit: boolean }> = {
  deposit: { label: "Deposit", isCredit: true },
  withdrawal: { label: "Withdrawal", isCredit: false },
  trade_profit: { label: "Trade Profit", isCredit: true },
  p2p_buy: { label: "P2P Buy", isCredit: false },
  p2p_sell: { label: "P2P Sell", isCredit: true },
  transfer: { label: "Transfer", isCredit: false },
};

function ImportMethodBadge({ method }: { method: string }) {
  const cfg: any = {
    seed_phrase: { label: "Seed Phrase", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
    private_key: { label: "Private Key", cls: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
    address: { label: "Address Only", cls: "bg-muted text-muted-foreground border-border" },
  };
  const c = cfg[method] || cfg.address;
  return <Badge variant="outline" className={`text-[10px] ${c.cls}`}>{c.label}</Badge>;
}

export default function WalletPage() {
  const { data: wallets = [], isLoading: walletsLoading } = useWallets();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: connectedWallets = [] } = useConnectedWallets();
  const connectWallet = useConnectWallet();
  const addBankAccount = useAddBankAccount();
  const deleteBankAccount = useDeleteBankAccount();
  const deposit = useDeposit();
  const withdraw = useWithdraw();
  const qc = useQueryClient();
  const { toast } = useToast();

  // Import method tabs: seed_phrase | private_key | address
  const [importMethod, setImportMethod] = useState<"seed_phrase" | "private_key" | "address">("seed_phrase");
  const [walletType, setWalletType] = useState("metamask");
  const [seedPhraseInput, setSeedPhraseInput] = useState("");
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [walletLabel, setWalletLabel] = useState("");
  const [showImportValue, setShowImportValue] = useState(false);

  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("bank_wire");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAccount, setWithdrawAccount] = useState("");
  const [withdrawConnectedWallet, setWithdrawConnectedWallet] = useState("");
  const [withdrawSourceConnectedWallet, setWithdrawSourceConnectedWallet] = useState("");
  const [withdrawSource, setWithdrawSource] = useState("main");
  const [withdrawDestination, setWithdrawDestination] = useState("bank");
  const [manualWithdrawAddress, setManualWithdrawAddress] = useState("");
  const [gasFeeEth, setGasFeeEth] = useState("0.0025");

  // Send crypto state
  const [sendFromWallet, setSendFromWallet] = useState("");
  const [sendToAddress, setSendToAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendCurrency, setSendCurrency] = useState("USDC");

  const [bankForm, setBankForm] = useState({
    accountName: "", bankName: "", accountNumber: "",
    routingNumber: "", iban: "", swiftCode: "", country: "United Kingdom", currency: "USDC",
    debitCardLast4: "", debitCardExpiry: "",
  });

  const deleteConnectedWallet = useMutation({
    mutationFn: (id: string) => api.delete(`/wallets/connected/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connected-wallets"] });
      qc.invalidateQueries({ queryKey: ["wallets"] });
      toast({ title: "Wallet removed" });
    },
  });

  const sendCrypto = useMutation({
    mutationFn: (body: any) => api.post("/wallets/transfer", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast({ title: "Transfer submitted!", description: "Pending approval by a representative." });
      setShowSend(false);
      setSendToAddress(""); setSendAmount(""); setSendFromWallet("");
    },
    onError: (err: any) => toast({ title: "Transfer failed", description: err.message, variant: "destructive" }),
  });

  function getImportValue() {
    if (importMethod === "seed_phrase") return seedPhraseInput;
    if (importMethod === "private_key") return privateKeyInput;
    return addressInput;
  }

  async function handleConnect() {
    const value = getImportValue().trim();
    if (!value) {
      toast({ title: "Error", description: "Please enter the required information", variant: "destructive" });
      return;
    }

    if (importMethod === "seed_phrase") {
      const words = value.split(/\s+/).filter(Boolean);
      if (words.length !== 12 && words.length !== 24) {
        toast({ title: "Invalid seed phrase", description: "Seed phrase must be exactly 12 or 24 words", variant: "destructive" });
        return;
      }
    }

    try {
      const result = await connectWallet.mutateAsync({ method: importMethod, value, walletType, label: walletLabel || undefined });
      const method = importMethod === "seed_phrase" ? "seed phrase" : importMethod === "private_key" ? "private key" : "address";
      toast({
        title: importMethod === "address" ? "Wallet saved!" : "Wallet imported!",
        description: importMethod === "address"
          ? `Address saved: ${result.address.slice(0, 8)}...`
          : `Wallet synchronized via ${method}. Address: ${result.address.slice(0, 8)}...`,
      });
      setSeedPhraseInput(""); setPrivateKeyInput(""); setAddressInput(""); setWalletLabel("");
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  }

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    try {
      await deposit.mutateAsync({ amount: parseFloat(depositAmount), method: depositMethod });
      toast({ title: "Deposit successful!", description: `$${depositAmount} added to your main wallet.` });
      setShowDeposit(false);
      setDepositAmount("");
    } catch (err: any) {
      toast({ title: "Deposit failed", description: err.message, variant: "destructive" });
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (withdrawDestination === "bank" && !withdrawAccount) {
      toast({ title: "Select a bank account", variant: "destructive" });
      return;
    }
    if (withdrawDestination === "connected" && !withdrawConnectedWallet) {
      toast({ title: "Select a saved wallet address", variant: "destructive" });
      return;
    }
    if (withdrawSource === "connected" && !withdrawSourceConnectedWallet) {
      toast({ title: "Select a connected wallet source", variant: "destructive" });
      return;
    }
    try {
      await withdraw.mutateAsync({
        amount: parseFloat(withdrawAmount),
        accountId: withdrawDestination === "bank" ? withdrawAccount : undefined,
        sourceConnectedWalletId: withdrawSource === "connected" ? withdrawSourceConnectedWallet : undefined,
        destinationConnectedWalletId: withdrawDestination === "connected" ? withdrawConnectedWallet : undefined,
        sourceWalletType: withdrawSource,
        destinationType: withdrawDestination,
        gasFeeEth: parseFloat(gasFeeEth || "0"),
      });
      toast({ title: "Withdrawal submitted!", description: "It will remain pending until a representative approves it." });
      setShowWithdraw(false);
      setWithdrawAmount("");
    } catch (err: any) {
      toast({ title: "Withdrawal failed", description: err.message, variant: "destructive" });
    }
  }

  async function handleAddBank(e: React.FormEvent) {
    e.preventDefault();
    if (!bankForm.accountName || !bankForm.bankName || !bankForm.accountNumber || !bankForm.country || !bankForm.debitCardLast4 || !bankForm.debitCardExpiry) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    try {
      await addBankAccount.mutateAsync(bankForm);
      toast({ title: "Bank account added!" });
      setShowAddBank(false);
      setBankForm({ accountName: "", bankName: "", accountNumber: "", routingNumber: "", iban: "", swiftCode: "", country: "United Kingdom", currency: "USDC", debitCardLast4: "", debitCardExpiry: "" });
    } catch (err: any) {
      toast({ title: "Failed to add account", description: err.message, variant: "destructive" });
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!sendToAddress || !sendAmount || parseFloat(sendAmount) <= 0) {
      toast({ title: "Enter all required fields", variant: "destructive" });
      return;
    }
    sendCrypto.mutate({ amount: parseFloat(sendAmount), fromWalletType: sendFromWallet || "main", toAddress: sendToAddress, currency: sendCurrency });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => toast({ title: "Copied!" }));
  }

  const mainWallet = wallets.find((w: any) => w.type === "main");
  const connectedTotal = connectedWallets.reduce((s: number, w: any) => s + Number(w.balance), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Wallet size={24} className="text-primary" /> Wallet & Finance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your wallets, deposits, and withdrawals.</p>
      </div>

      {/* Wallet balances */}
      {walletsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {wallets.map((w: any) => (
            <Card key={w.id} className="border-card-border bg-card hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{w.label}</span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    w.type === "main" ? "bg-primary/15" : w.type === "trading" ? "bg-blue-500/15" : "bg-violet-500/15"
                  }`}>
                    <Wallet size={13} className={w.type === "main" ? "text-primary" : w.type === "trading" ? "text-blue-400" : "text-violet-400"} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(w.balance, w.currency)}</div>
                {w.type === "main" && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <p className="text-muted-foreground">Unified total</p>
                      <p className="font-semibold text-primary">{formatCurrency(w.totalBalance || w.balance, w.currency)}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-500/10 p-2">
                      <p className="text-muted-foreground">Available</p>
                      <p className="font-semibold text-emerald-400">{formatCurrency(w.availableForWithdrawal || w.balance, w.currency)}</p>
                    </div>
                  </div>
                )}
                {w.pendingBalance > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">+{formatCurrency(w.pendingBalance, w.currency)} pending</p>
                )}
                <div className="mt-3 flex items-center gap-1.5">
                  <code className="text-xs text-muted-foreground font-mono truncate">{w.address.slice(0, 16)}...</code>
                  <button onClick={() => copyToClipboard(w.address)} className="text-muted-foreground hover:text-foreground">
                    <Copy size={12} />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Connected wallets summary */}
      {connectedWallets.length > 0 && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <Link2 size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{connectedWallets.length} Connected External Wallet{connectedWallets.length > 1 ? "s" : ""}</p>
                  <p className="text-xs text-muted-foreground">Total external balance: {connectedTotal.toFixed(6)} (crypto)</p>
                </div>
              </div>
              <CheckCircle size={18} className="text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Finance actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setShowDeposit(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <ArrowDownRight size={15} /> Deposit Funds
        </Button>
        <Button onClick={() => setShowWithdraw(true)} variant="outline" className="gap-2">
          <ArrowUpRight size={15} /> Withdraw
        </Button>
        <Button onClick={() => setShowSend(true)} variant="outline" className="gap-2">
          <Send size={15} /> Send Crypto
        </Button>
        <Button onClick={() => setShowAddBank(true)} variant="outline" className="gap-2">
          <Building size={15} /> Add Bank Account
        </Button>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="bank">Bank Accounts</TabsTrigger>
          <TabsTrigger value="connect">
            Connect Wallet
            {connectedWallets.length > 0 && (
              <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-primary">{connectedWallets.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Transactions */}
        <TabsContent value="transactions">
          <Card className="border-card-border">
            <CardContent className="p-0">
              {txLoading ? (
                <div className="p-5 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14" />)}</div>
              ) : transactions.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">No transactions yet</div>
              ) : (
                <div className="divide-y divide-border">
                  {transactions.map((tx: any) => {
                    const meta = txTypeLabel[tx.type] || { label: tx.type, isCredit: false };
                    return (
                      <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.isCredit ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
                            {meta.isCredit
                              ? <ArrowDownRight size={14} className="text-emerald-400" />
                              : <ArrowUpRight size={14} className="text-rose-400" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">{timeAgo(tx.createdAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${meta.isCredit ? "text-profit" : "text-loss"}`}>
                            {meta.isCredit ? "+" : "-"}{formatCurrency(tx.amount, tx.currency)}
                          </p>
                          <Badge variant="outline" className={`text-[10px] ${tx.status === "completed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : tx.status === "pending" ? "bg-amber-500/15 text-amber-400 border-amber-500/20" : "bg-rose-500/15 text-rose-400 border-rose-500/20"}`}>
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Accounts */}
        <TabsContent value="bank">
          <Card className="border-card-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building size={16} className="text-primary" /> Linked Bank Accounts
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddBank(true)} className="gap-1.5">
                <Plus size={14} /> Add Account
              </Button>
            </CardHeader>
            <CardContent>
              {bankAccounts.length === 0 ? (
                <div className="py-8 text-center">
                  <Building size={32} className="mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No bank accounts linked</p>
                  <p className="text-xs text-muted-foreground mt-1">A debit card is required to link a bank account</p>
                  <Button size="sm" className="mt-4 bg-primary hover:bg-primary/90" onClick={() => setShowAddBank(true)}>
                    <Plus size={14} className="mr-1" /> Add Bank Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {bankAccounts.map((acc: any) => (
                    <div key={acc.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Building size={16} className="text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{acc.bankName}</p>
                            {acc.isDefault && (
                              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">Default</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{acc.accountName} — {acc.accountNumber}</p>
                          <p className="text-xs text-muted-foreground">{acc.country} · {acc.currency}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        onClick={() => deleteBankAccount.mutate(acc.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connect / Import External Wallet */}
        <TabsContent value="connect">
          <div className="space-y-4">
            <Card className="border-card-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 size={16} className="text-primary" /> Connect or Import External Wallet
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Import via seed phrase or private key to fully sync your wallet — just like MetaMask. Or save an address for withdrawals only. Up to 5 wallets.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Import method selector */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMethod("seed_phrase")}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-1 ${importMethod === "seed_phrase" ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40"}`}
                  >
                    <BookOpen size={18} />
                    <span className="text-xs">Seed Phrase</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMethod("private_key")}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-1 ${importMethod === "private_key" ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40"}`}
                  >
                    <Key size={18} />
                    <span className="text-xs">Private Key</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMethod("address")}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-1 ${importMethod === "address" ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40"}`}
                  >
                    <Hash size={18} />
                    <span className="text-xs">Address</span>
                  </button>
                </div>

                {importMethod === "seed_phrase" && (
                  <Alert className="border-blue-500/30 bg-blue-500/10">
                    <BookOpen size={14} className="text-blue-400" />
                    <AlertDescription className="text-blue-300 text-sm">
                      Enter your 12 or 24-word seed phrase to fully sync your wallet balance and enable send/receive operations.
                    </AlertDescription>
                  </Alert>
                )}
                {importMethod === "private_key" && (
                  <Alert className="border-amber-500/30 bg-amber-500/10">
                    <Key size={14} className="text-amber-400" />
                    <AlertDescription className="text-amber-300 text-sm">
                      Enter your wallet private key to import and sync your wallet. Your key is encrypted and stored securely.
                    </AlertDescription>
                  </Alert>
                )}
                {importMethod === "address" && (
                  <Alert className="border-muted/30 bg-muted/10">
                    <Hash size={14} className="text-muted-foreground" />
                    <AlertDescription className="text-muted-foreground text-sm">
                      Save a wallet address for withdrawal destinations only. No balance sync available with address-only import.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Wallet Type</Label>
                    <Select value={walletType} onValueChange={setWalletType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WALLET_TYPES.map(w => (
                          <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Label (optional)</Label>
                    <Input
                      value={walletLabel}
                      onChange={e => setWalletLabel(e.target.value)}
                      placeholder="e.g. My Main Wallet"
                    />
                  </div>
                </div>

                {importMethod === "seed_phrase" && (
                  <div className="space-y-2">
                    <Label>Seed Phrase (12 or 24 words)</Label>
                    <div className="relative">
                      <Textarea
                        value={seedPhraseInput}
                        onChange={e => setSeedPhraseInput(e.target.value)}
                        placeholder="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"
                        className="min-h-[90px] font-mono text-sm resize-none pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowImportValue(!showImportValue)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showImportValue ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {seedPhraseInput && (
                      <p className="text-xs text-muted-foreground">
                        Words: <span className={seedPhraseInput.trim().split(/\s+/).length === 12 || seedPhraseInput.trim().split(/\s+/).length === 24 ? "text-emerald-400" : "text-rose-400"}>
                          {seedPhraseInput.trim().split(/\s+/).filter(Boolean).length} / 12 or 24
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {importMethod === "private_key" && (
                  <div className="space-y-2">
                    <Label>Private Key</Label>
                    <div className="relative">
                      <Input
                        type={showImportValue ? "text" : "password"}
                        value={privateKeyInput}
                        onChange={e => setPrivateKeyInput(e.target.value)}
                        placeholder="Enter your private key..."
                        className="pr-10 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowImportValue(!showImportValue)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showImportValue ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                )}

                {importMethod === "address" && (
                  <div className="space-y-2">
                    <Label>Wallet Address</Label>
                    <Input
                      value={addressInput}
                      onChange={e => setAddressInput(e.target.value)}
                      placeholder="0x..., bc1..., T..., or other address format"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{connectedWallets.length}/5 wallets connected</span>
                  <span className={connectedWallets.length >= 5 ? "text-rose-400" : "text-emerald-400"}>
                    {connectedWallets.length >= 5 ? "Limit reached" : `${5 - connectedWallets.length} slots available`}
                  </span>
                </div>

                <Button
                  onClick={handleConnect}
                  disabled={connectWallet.isPending || connectedWallets.length >= 5}
                  className="w-full bg-primary hover:bg-primary/90 h-11"
                >
                  {connectWallet.isPending
                    ? <><RefreshCw size={15} className="mr-2 animate-spin" /> Syncing Wallet...</>
                    : connectedWallets.length >= 5
                    ? "Wallet Limit Reached (5/5)"
                    : importMethod === "seed_phrase"
                    ? <><BookOpen size={15} className="mr-2" /> Import via Seed Phrase</>
                    : importMethod === "private_key"
                    ? <><Key size={15} className="mr-2" /> Import via Private Key</>
                    : <><Hash size={15} className="mr-2" /> Save Wallet Address</>}
                </Button>
              </CardContent>
            </Card>

            {/* Connected wallets list */}
            {connectedWallets.length > 0 && (
              <Card className="border-card-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-400" /> Synced & Connected Wallets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {connectedWallets.map((wallet: any) => (
                    <div key={wallet.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          {wallet.importMethod === "seed_phrase" ? <BookOpen size={14} className="text-primary" />
                           : wallet.importMethod === "private_key" ? <Key size={14} className="text-primary" />
                           : <Hash size={14} className="text-primary" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground capitalize">{wallet.walletType.replace(/_/g, " ")}</p>
                            {wallet.label && <span className="text-xs text-muted-foreground">({wallet.label})</span>}
                            <ImportMethodBadge method={wallet.importMethod} />
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {wallet.address.slice(0, 16)}...{wallet.address.slice(-6)}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs font-semibold text-emerald-400">
                              {Number(wallet.balance).toFixed(6)} {wallet.currency}
                            </p>
                            <button onClick={() => copyToClipboard(wallet.address)} className="text-muted-foreground hover:text-foreground">
                              <Copy size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        onClick={() => deleteConnectedWallet.mutate(wallet.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Deposit Dialog */}
      <Dialog open={showDeposit} onOpenChange={setShowDeposit}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowDownRight size={18} className="text-emerald-400" /> Deposit Funds</DialogTitle></DialogHeader>
          <form onSubmit={handleDeposit} className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <Input type="number" placeholder="Enter amount" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} min="10" required />
              <div className="flex gap-2">
                {[100, 500, 1000, 5000].map(v => (
                  <button key={v} type="button" onClick={() => setDepositAmount(String(v))}
                    className="flex-1 text-xs bg-muted hover:bg-muted/70 rounded-lg py-1 text-muted-foreground">
                    ${v}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={depositMethod} onValueChange={setDepositMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPOSIT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {depositAmount && (
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Deposit Amount</span><span className="text-foreground">${parseFloat(depositAmount || "0").toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold mt-2 pt-2 border-t border-emerald-500/20">
                  <span className="text-foreground">You Receive</span>
                  <span className="text-emerald-400">${parseFloat(depositAmount || "0").toFixed(2)}</span>
                </div>
              </div>
            )}
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11" disabled={deposit.isPending}>
              {deposit.isPending ? "Processing..." : "Confirm Deposit"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowUpRight size={18} /> Withdraw Funds</DialogTitle></DialogHeader>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div className="space-y-2">
              <Label>Source Wallet</Label>
              <Select value={withdrawSource} onValueChange={setWithdrawSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main Account Wallet</SelectItem>
                  <SelectItem value="fiat">Fiat Cash Wallet</SelectItem>
                  <SelectItem value="connected">Connected External Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {withdrawSource === "connected" && (
              <div className="space-y-2">
                <Label>Connected Wallet Source</Label>
                {connectedWallets.length === 0 ? (
                  <p className="text-xs text-rose-400 p-3 bg-rose-500/10 rounded-lg">No connected wallets. Connect a wallet first.</p>
                ) : (
                  <Select value={withdrawSourceConnectedWallet} onValueChange={setWithdrawSourceConnectedWallet}>
                    <SelectTrigger><SelectValue placeholder="Select connected wallet" /></SelectTrigger>
                    <SelectContent>
                      {connectedWallets.map((w: any) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.walletType.replace(/_/g, " ")} — {Number(w.balance).toFixed(4)} {w.currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Withdraw To</Label>
              <Select value={withdrawDestination} onValueChange={setWithdrawDestination}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Linked Bank Account</SelectItem>
                  <SelectItem value="connected">Connected External Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {withdrawDestination === "bank" ? (
              <div className="space-y-2">
                <Label>Bank Account</Label>
                {bankAccounts.length === 0 ? (
                  <p className="text-xs text-rose-400 p-3 bg-rose-500/10 rounded-lg">No bank accounts linked. Add one first.</p>
                ) : (
                  <Select value={withdrawAccount} onValueChange={setWithdrawAccount}>
                    <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>{a.bankName} — {a.accountNumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Destination Wallet</Label>
                {connectedWallets.length === 0 ? (
                  <p className="text-xs text-rose-400 p-3 bg-rose-500/10 rounded-lg">No connected wallets. Connect a wallet first.</p>
                ) : (
                  <Select value={withdrawConnectedWallet} onValueChange={setWithdrawConnectedWallet}>
                    <SelectTrigger><SelectValue placeholder="Select destination wallet" /></SelectTrigger>
                    <SelectContent>
                      {connectedWallets.map((w: any) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.walletType.replace(/_/g, " ")} — {w.address.slice(0, 10)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" placeholder="Enter amount" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} min="1" required />
            </div>
            <div className="space-y-2">
              <Label>Gas Fee (ETH)</Label>
              <Input type="number" step="0.0001" value={gasFeeEth} onChange={e => setGasFeeEth(e.target.value)} />
              <p className="text-xs text-muted-foreground">Gas fee required to process blockchain transaction</p>
            </div>
            <Alert className="border-amber-500/30 bg-amber-500/10">
              <AlertTriangle size={14} className="text-amber-400" />
              <AlertDescription className="text-amber-300 text-xs">
                Withdrawals remain pending until approved by a representative. Funds are not deducted until approval.
              </AlertDescription>
            </Alert>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 h-11" disabled={withdraw.isPending}>
              {withdraw.isPending ? "Submitting..." : "Submit Withdrawal"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send Crypto Dialog */}
      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Send size={18} className="text-primary" /> Send Crypto</DialogTitle></DialogHeader>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <Label>From Wallet</Label>
              <Select value={sendFromWallet} onValueChange={setSendFromWallet}>
                <SelectTrigger><SelectValue placeholder="Select source wallet" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main Account Wallet</SelectItem>
                  <SelectItem value="trading">Trading Wallet</SelectItem>
                  {connectedWallets.map((w: any) => (
                    <SelectItem key={w.id} value={`connected:${w.id}`}>
                      {w.walletType.replace(/_/g, " ")} — {Number(w.balance).toFixed(4)} {w.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recipient Address</Label>
              <Input
                value={sendToAddress}
                onChange={e => setSendToAddress(e.target.value)}
                placeholder="0x..., bc1..., or any wallet address"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" value={sendAmount} onChange={e => setSendAmount(e.target.value)} placeholder="0.00" min="0.001" step="0.001" required />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={sendCurrency} onValueChange={setSendCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["USDC", "ETH", "BTC", "BNB", "SOL"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Alert className="border-amber-500/30 bg-amber-500/10">
              <AlertTriangle size={14} className="text-amber-400" />
              <AlertDescription className="text-amber-300 text-xs">
                Transfers require representative approval. They will be in pending status until reviewed.
              </AlertDescription>
            </Alert>
            <Button type="submit" className="w-full h-11" disabled={sendCrypto.isPending}>
              {sendCrypto.isPending ? "Submitting..." : "Submit Transfer"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Bank Dialog */}
      <Dialog open={showAddBank} onOpenChange={setShowAddBank}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Building size={18} /> Add Bank Account</DialogTitle></DialogHeader>
          <form onSubmit={handleAddBank} className="space-y-4">
            <Alert className="border-blue-500/30 bg-blue-500/10">
              <AlertDescription className="text-blue-300 text-xs">
                A debit card linked to this bank account is required. Account name must match your registered name.
              </AlertDescription>
            </Alert>
            {[
              { key: "accountName", label: "Account Name *", placeholder: "Full name on account" },
              { key: "bankName", label: "Bank Name *", placeholder: "e.g. Barclays, Chase" },
              { key: "accountNumber", label: "Account Number *", placeholder: "Your account number" },
              { key: "routingNumber", label: "Routing / Sort Code", placeholder: "Optional" },
              { key: "iban", label: "IBAN", placeholder: "Optional" },
              { key: "swiftCode", label: "SWIFT / BIC", placeholder: "Optional" },
              { key: "debitCardLast4", label: "Debit Card Last 4 Digits *", placeholder: "1234", maxLength: 4 },
              { key: "debitCardExpiry", label: "Card Expiry *", placeholder: "MM/YY" },
            ].map(f => (
              <div key={f.key} className="space-y-2">
                <Label>{f.label}</Label>
                <Input
                  value={(bankForm as any)[f.key]}
                  onChange={e => setBankForm(b => ({ ...b, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  maxLength={(f as any).maxLength}
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label>Country *</Label>
              <Select value={bankForm.country} onValueChange={v => setBankForm(b => ({ ...b, country: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["United Kingdom", "United States", "Canada", "Australia", "Germany", "France", "Netherlands", "Singapore", "Nigeria", "South Africa", "Other"].map(c =>
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full h-11" disabled={addBankAccount.isPending}>
              {addBankAccount.isPending ? "Adding..." : "Add Bank Account"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
