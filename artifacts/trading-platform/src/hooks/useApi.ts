import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useUser() {
  return useQuery({ queryKey: ["user"], queryFn: () => api.get<any>("/users/me") });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { fullName?: string; phone?: string; country?: string }) =>
      api.patch<any>("/users/me", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user"] }),
  });
}

export function useWallets() {
  return useQuery({ queryKey: ["wallets"], queryFn: () => api.get<any[]>("/wallets"), refetchInterval: 5000 });
}

export function useTransactions() {
  return useQuery({ queryKey: ["transactions"], queryFn: () => api.get<any[]>("/wallets/transactions") });
}

export function useConnectWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { method: string; value: string; walletType: string; label?: string }) =>
      api.post<any>("/wallets/connect", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["connected-wallets"] });
    },
  });
}

export function useConnectedWallets() {
  return useQuery({ queryKey: ["connected-wallets"], queryFn: () => api.get<any[]>("/wallets/connected") });
}

export function useTrades() {
  return useQuery({ queryKey: ["trades"], queryFn: () => api.get<any[]>("/trades"), refetchInterval: 5000 });
}

export function useSocialWallet() {
  return useQuery({ queryKey: ["social-wallet"], queryFn: () => api.get<any>("/trades/social-wallet") });
}

export function useProgramStatus() {
  return useQuery({ queryKey: ["program-status"], queryFn: () => api.get<any>("/programs/status"), refetchInterval: 15000 });
}

export function useActivateAiBotSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<any>("/programs/ai-bot/subscribe", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["program-status"] }),
  });
}

export function useReleaseFunds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tradeId: string) => api.post<any>(`/trades/${tradeId}/release`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trades"] });
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["social-wallet"] });
    },
  });
}

export function useManagers() {
  return useQuery({ queryKey: ["managers"], queryFn: () => api.get<any[]>("/managers") });
}

export function useSelectedManager() {
  return useQuery({ queryKey: ["selected-manager"], queryFn: () => api.get<any>("/managers/selected") });
}

export function useSelectManager() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (managerId: string) => api.post<any>("/managers/selected", { managerId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["selected-manager"] });
      qc.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useMessages(context?: string, contextId?: string) {
  const params = new URLSearchParams();
  if (context) params.set("context", context);
  if (contextId) params.set("contextId", contextId);
  return useQuery({
    queryKey: ["messages", context, contextId],
    queryFn: () => api.get<any[]>(`/messages?${params.toString()}`),
    refetchInterval: 5000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { content: string; context: string; contextId?: string }) =>
      api.post<any>("/messages", body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", vars.context] });
    },
  });
}

export function useP2PListings(type?: string, asset?: string) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (asset) params.set("asset", asset);
  return useQuery({
    queryKey: ["p2p-listings", type, asset],
    queryFn: () => api.get<any[]>(`/p2p/listings?${params.toString()}`),
  });
}

export function useP2POrders() {
  return useQuery({ queryKey: ["p2p-orders"], queryFn: () => api.get<any[]>("/p2p/orders"), refetchInterval: 5000 });
}

export function useCreateP2POrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { listingId: string; amount: number }) =>
      api.post<any>("/p2p/orders", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["p2p-orders"] });
      qc.invalidateQueries({ queryKey: ["p2p-notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useP2PVendorStatus() {
  return useQuery({ queryKey: ["p2p-vendor-status"], queryFn: () => api.get<any>("/p2p/vendor/status") });
}

export function useRegisterP2PVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<any>("/p2p/vendor/register", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["p2p-vendor-status"] });
      qc.invalidateQueries({ queryKey: ["user"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useCreateP2PListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.post<any>("/p2p/listings", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["p2p-listings"] }),
  });
}

export function useP2PNotifications() {
  return useQuery({ queryKey: ["p2p-notifications"], queryFn: () => api.get<any[]>("/p2p/notifications"), refetchInterval: 10000 });
}

export function useP2PChat(orderId: string) {
  return useQuery({
    queryKey: ["p2p-chat", orderId],
    queryFn: () => api.get<any[]>(`/p2p/orders/${orderId}/chat`),
    refetchInterval: 3000,
    enabled: !!orderId,
  });
}

export function useSendP2PChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, message, senderName }: { orderId: string; message: string; senderName?: string }) =>
      api.post<any>(`/p2p/orders/${orderId}/chat`, { message, senderName }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["p2p-chat", vars.orderId] });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      api.patch<any>(`/p2p/orders/${orderId}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["p2p-orders"] });
    },
  });
}

export function useSubmitProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, proofUrl }: { orderId: string; proofUrl: string }) =>
      api.post<any>(`/p2p/orders/${orderId}/proof`, { proofUrl }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["p2p-orders"] });
      qc.invalidateQueries({ queryKey: ["p2p-notifications"] });
    },
  });
}

export function useAssets() {
  return useQuery({ queryKey: ["assets"], queryFn: () => api.get<any[]>("/assets/catalog") });
}

export function usePurchaseAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { assetId: string; amount: number; paymentMethod: string }) =>
      api.post<any>("/assets/purchase", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useSupportTickets() {
  return useQuery({ queryKey: ["tickets"], queryFn: () => api.get<any[]>("/support/tickets") });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { subject: string; message: string; priority: string }) =>
      api.post<any>("/support/tickets", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });
}

// KYC
export function useKycStatus() {
  return useQuery({ queryKey: ["kyc"], queryFn: () => api.get<any>("/kyc/status") });
}

export function useSubmitKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { docType: string; docUrl: string }) =>
      api.post<any>("/kyc/submit", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kyc"] });
      qc.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

// Notifications
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<any[]>("/notifications"),
    refetchInterval: 15000,
  });
}

// Cards
export function useCards() {
  return useQuery({ queryKey: ["cards"], queryFn: () => api.get<any[]>("/cards"), refetchInterval: 6000 });
}

export function useRequestCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.post<any>("/cards/request", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cards"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Bank accounts
export function useBankAccounts() {
  return useQuery({ queryKey: ["bank-accounts"], queryFn: () => api.get<any[]>("/bank/accounts") });
}

export function useAddBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.post<any>("/bank/accounts", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank-accounts"] }),
  });
}

export function useDeleteBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<any>(`/bank/accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank-accounts"] }),
  });
}

// Finance
export function useDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { amount: number; method: string; currency?: string }) =>
      api.post<any>("/bank/deposit", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { amount: number; accountId?: string; connectedWalletId?: string; sourceConnectedWalletId?: string; destinationConnectedWalletId?: string; currency?: string; sourceWalletType?: string; destinationType?: string; gasFeeEth?: number }) =>
      api.post<any>("/bank/withdraw", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useReferralInfo() {
  return useQuery({ queryKey: ["referral-info"], queryFn: () => api.get<any>("/referrals/info") });
}

export function useClaimReferralBonus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<any>("/referrals/claim", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["referral-info"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
