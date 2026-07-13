import { create } from 'zustand';

interface WalletState {
  id: string;
  userId: string;
  pendingCashback: number;
  approvedCashback: number;
  lockedCashback: number;
  withdrawableCashback: number;
  refundBalance: number;
  lastUpdated: string;
}

interface TransactionState {
  id: string;
  walletId: string;
  orderId: string | null;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  status: string;
  description: string | null;
  timestamp: string;
}

interface WalletStore {
  wallet: WalletState | null;
  transactions: TransactionState[];
  loading: boolean;
  fetchWallet: (userId?: string) => Promise<void>;
  fetchTransactions: (userId?: string) => Promise<void>;
}

export const useWallet = create<WalletStore>((set) => ({
  wallet: null,
  transactions: [],
  loading: false,

  fetchWallet: async (userId) => {
    set({ loading: true });
    try {
      const url = userId ? `/api/wallet?user_id=${userId}` : '/api/wallet';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        set({ wallet: data });
      }
    } catch (e) {
      console.error("Failed to fetch wallet status", e);
    } finally {
      set({ loading: false });
    }
  },

  fetchTransactions: async (userId) => {
    try {
      const url = userId ? `/api/wallet/transactions?user_id=${userId}` : '/api/wallet/transactions';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        set({ transactions: data });
      }
    } catch (e) {
      console.error("Failed to fetch transactions logs", e);
    }
  }
}));
