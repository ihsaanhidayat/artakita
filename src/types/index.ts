import type { Session } from "@supabase/supabase-js";

// ── Database row types ────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  wallet_id: string;
  user_id: string;
  note: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  created_at: string;
  receipt_url: string | null;
  debt_id: string | null;
  _pending?: boolean;
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface ActiveWallet {
  id: string;
  name: string;
  user_id?: string;
}

export interface UserCategory {
  id: string;
  name: string;
  user_id?: string;
}

export interface AiKeyword {
  id: string;
  category_id: string;
  keyword: string;
  frequency: number;
}

export interface UserPattern {
  phrase: string;
  category_id: string;
  name: string | null;
  frequency: number;
  typical_amount: number | null;
}

export interface Budget {
  id: string;
  user_id?: string;
  category_name: string;
  limit_amount: number;
  month_year: string;
}

export interface SavingsGoal {
  id: string;
  user_id?: string;
  name: string;
  target_amount: number;
  current_amount: number;
  created_at?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  must_change_password: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
  banned_until: string | null;
  last_activity_at: string | null;
  activity_today: number;
  activity_week: number;
  activity_month: number;
}

// ── UI state types ────────────────────────────────────────────────────────────

export interface Notification {
  isOpen: boolean;
  message: string;
  type: "error" | "success";
}

export interface ForcePasswordModalState {
  isOpen: boolean;
  newPassword: string;
}

export interface AddUserModalState {
  isOpen: boolean;
  username: string;
  password: string;
  isLoading: boolean;
}

export interface EditTrxModalState {
  isOpen: boolean;
  data: Transaction | null;
}

export interface NewGoalData {
  name: string;
  target: string;
  current: string;
}

export interface DateRange {
  from: string;
  to: string;
}

// ── AI engine types ───────────────────────────────────────────────────────────

export type Confidence = "HIGH" | "MED" | "LOW";

export interface ClassifyResult {
  categoryId: string | null;
  categoryName: string | null;
  confidence: Confidence;
  score?: number;
  isExact?: boolean;
}

export interface TokenizeResult {
  amount: number | null;
  note: string;
  date: Date | null;
}

export interface Suggestion {
  phrase: string;
  categoryId: string | undefined;
  categoryName: string | undefined;
  frequency: number;
}

// ── Hook return types ─────────────────────────────────────────────────────────

export interface UseAuthReturn {
  session: Session | null;
  isAuthLoading: boolean;
  authError: string;
  setAuthError: React.Dispatch<React.SetStateAction<string>>;
  authUsername: string;
  setAuthUsername: React.Dispatch<React.SetStateAction<string>>;
  authPassword: string;
  setAuthPassword: React.Dispatch<React.SetStateAction<string>>;
  isLocked: boolean;
  sessionWarning: boolean;
  extendSession: () => void;
  forcePasswordModal: ForcePasswordModalState;
  setForcePasswordModal: React.Dispatch<React.SetStateAction<ForcePasswordModalState>>;
  handleLogin: (e?: React.FormEvent) => Promise<void>;
  handleLogout: () => void;
  handleForceChangePassword: (e?: React.FormEvent) => Promise<void>;
}

export interface UseFinDataReturn {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  transactions: Transaction[];
  allTransactions: Transaction[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  addTransaction: (
    note: string,
    amount: number,
    category: string,
    trxType?: "income" | "expense",
    receiptFile?: File | null,
    customDate?: string | null
  ) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (
    id: string,
    note: string,
    category: string,
    amount: number,
    created_at?: string
  ) => Promise<void>;
  syncQueue: () => Promise<void>;
  refetch: () => Promise<void>;
}

export interface UseWalletsReturn {
  wallets: Wallet[];
  addWallet: (name: string) => Promise<Wallet | undefined>;
  deleteWallet: (id: string) => Promise<void>;
}

export interface UseOfflineSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  addToQueue: (trx: Omit<Transaction, "id" | "created_at"> & { customDate?: string }) => PendingQueueItem;
  syncQueue: () => Promise<void>;
  updateCache: (transactions: Transaction[]) => void;
  getCached: () => Transaction[];
  clearCache: () => void;
}

export interface PendingQueueItem {
  id: string;
  walletId: string;
  user_id: string;
  note: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  customDate?: string;
  createdAt: string;
}

export interface UseLanguageReturn {
  lang: "id" | "en";
  setLang: (lang: "id" | "en") => void;
  toggleLang: () => void;
  isID: boolean;
  isEN: boolean;
}

// ── Month option ──────────────────────────────────────────────────────────────

export interface MonthOption {
  value: string;
  label: string;
}

// ── Admin API response ────────────────────────────────────────────────────────

export interface AdminVerifySuccess {
  user: import("@supabase/supabase-js").User;
  supabaseAdmin: import("@supabase/supabase-js").SupabaseClient;
}

export interface AdminVerifyError {
  error: string;
  status: number;
}

export type AdminVerifyResult = AdminVerifySuccess | AdminVerifyError;
