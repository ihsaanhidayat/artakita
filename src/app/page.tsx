"use client";
import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { tokenizeInput, classifyFromPatterns, learnFromTransaction } from "@/lib/aiEngine";
import { motion, AnimatePresence } from "framer-motion";
import { Home as HomeIcon, BarChart3, Landmark, MoreHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

import { useAuth }    from "@/hooks/useAuth";
import { useFinData } from "@/hooks/useFinData";
import { useWallets } from "@/hooks/useWallets";

import { parseFlexibleNumber } from "@/lib/utils";
import { NAV, HOME, APP_TAGLINE, LOGIN, FORM, TOAST, MORE, WALLET, SAVINGS } from "@/lib/constants";

import HomeTab    from "@/components/tabs/HomeTab";
import StatsTab   from "@/components/tabs/StatsTab";
import FinanceTab, { type FinanceSubPage } from "@/components/tabs/FinanceTab";
import MoreTab from "@/components/tabs/MoreTab";
import type { ContextKey, ContextPreview, DebtPreview, RecurringPreview, SavingsPreview, AssetPreview } from "@/components/QuickCommandBar";

import EditTrxModal       from "@/components/modals/EditTrxModal";
import AddUserModal       from "@/components/modals/AddUserModal";
import ForcePasswordModal from "@/components/modals/ForcePasswordModal";
import WalletModal        from "@/components/modals/WalletModal";

import Toast           from "@/components/Toast";
import QuickCommandBar from "@/components/QuickCommandBar";
import AdminDashboard  from "@/components/AdminDashboard";

import type {
  UseAuthReturn, ActiveWallet, UserCategory, AiKeyword,
  UserPattern, Budget, SavingsGoal, NewGoalData, DateRange,
  Notification, AddUserModalState, EditTrxModalState,
} from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = "home" | "stats" | "finance" | "more";

interface NavItem { id: TabId; label: string; Icon: React.ElementType; }

// ── Nav config ────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: "home",    label: NAV.HOME    as string, Icon: HomeIcon     },
  { id: "stats",   label: NAV.STATS   as string, Icon: BarChart3    },
  { id: "finance", label: NAV.FINANCE as string, Icon: Landmark     },
  { id: "more",    label: NAV.MORE    as string, Icon: MoreHorizontal },
];

// ── Seed user patterns ────────────────────────────────────────────────────────

async function seedUserPatterns(userId: string): Promise<void> {
  try {
    const stopWords = new Set(["beli","bayar","untuk","ke","di","dari","dan","atau","dengan","yang","nya","ini","itu"]);
    const { data: trxs } = await supabase
      .from("transactions").select("note, category")
      .eq("user_id", userId).not("note", "is", null).not("category", "is", null);
    const { data: cats } = await supabase
      .from("user_categories").select("id, name").eq("user_id", userId);
    if (!trxs?.length || !cats?.length) return;

    const catMap: Record<string, string> = Object.fromEntries(
      (cats as { id: string; name: string }[]).map(c => [c.name.toLowerCase(), c.id])
    );
    const freqMap: Record<string, number> = {};
    const phraseCatCount: Record<string, Set<string>> = {};

    for (const trx of trxs as { note: string; category: string }[]) {
      const catId = catMap[trx.category?.toLowerCase()];
      if (!catId) continue;
      const cleanNote = trx.note.toLowerCase().trim();
      const words = cleanNote.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
      const phrases = new Set([cleanNote, ...words]);
      for (let i = 0; i < words.length - 1; i++) phrases.add(words[i] + " " + words[i + 1]);
      for (const phrase of phrases) {
        const key = phrase + "__" + catId;
        freqMap[key] = (freqMap[key] ?? 0) + 1;
        if (!phraseCatCount[phrase]) phraseCatCount[phrase] = new Set();
        phraseCatCount[phrase].add(catId);
      }
    }

    for (const phrase of Object.keys(phraseCatCount)) {
      const catSet = phraseCatCount[phrase];
      if (catSet.size <= 1) continue;
      const catFreqs: Record<string, number> = {};
      for (const [key, freq] of Object.entries(freqMap)) {
        if (key.startsWith(phrase + "__")) {
          const cId = key.split("__").pop()!;
          catFreqs[cId] = freq;
        }
      }
      const sorted = Object.entries(catFreqs).sort((a, b) => b[1] - a[1]);
      const topFreq = sorted[0]?.[1] ?? 0;
      const secondFreq = sorted[1]?.[1] ?? 0;
      if (topFreq < secondFreq * 3) {
        for (const cId of catSet) delete freqMap[phrase + "__" + cId];
      } else {
        for (let i = 1; i < sorted.length; i++) delete freqMap[phrase + "__" + sorted[i][0]];
      }
    }

    const upserts = Object.entries(freqMap).map(([key, freq]) => {
      const sep = key.lastIndexOf("__");
      return { user_id: userId, phrase: key.slice(0, sep), category_id: key.slice(sep + 2), frequency: freq };
    });

    for (let i = 0; i < upserts.length; i += 50) {
      await supabase.from("user_patterns")
        .upsert(upserts.slice(i, i + 50), { onConflict: "user_id,phrase,category_id" });
    }
  } catch {}
}

// ── Login Screen ──────────────────────────────────────────────────────────────

const LoginScreen = memo(function LoginScreen({ auth }: { auth: UseAuthReturn }) {
  return (
    <main className="w-full max-w-lg mx-auto min-h-screen flex flex-col items-center justify-center p-6 ds-bg-0">
      <div className="ds-aurora-page-glow" aria-hidden="true" />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="w-full ds-aurora-card p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black ds-aurora-text tracking-tight mb-1">ArtaKita.</h1>
          <p className="text-caption font-bold ds-t3 uppercase tracking-[0.3em]">{APP_TAGLINE as string}</p>
        </div>
        <form onSubmit={e => void auth.handleLogin(e)} className="space-y-4">
          <div>
            <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-1.5 ml-1">{LOGIN.USERNAME_LABEL as string}</label>
            <input type="text" required autoFocus value={auth.authUsername}
              onChange={e => auth.setAuthUsername(e.target.value)}
              placeholder={LOGIN.USERNAME_HINT as string}
              className="w-full ds-bg-0 border ds-border rounded-2xl py-3.5 px-4 text-sm font-bold ds-t1 outline-none transition-all ds-t2"
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "color-mix(in srgb, var(--a1) 60%, transparent)"; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = ""; }} />
          </div>
          <div>
            <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-1.5 ml-1">{LOGIN.PASSWORD_LABEL as string}</label>
            <input type="password" required value={auth.authPassword}
              onChange={e => auth.setAuthPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full ds-bg-0 border ds-border rounded-2xl py-3.5 px-4 text-sm font-bold ds-t1 outline-none transition-all"
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "color-mix(in srgb, var(--a1) 60%, transparent)"; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = ""; }} />
          </div>
          <AnimatePresence>
            {auth.authError && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs font-bold text-center py-2.5 rounded-xl"
                style={{ color: "var(--a3)", background: "color-mix(in srgb, var(--a3) 10%, transparent)" }}>
                {auth.authError}
              </motion.p>
            )}
          </AnimatePresence>
          <button type="submit" disabled={auth.isAuthLoading || auth.isLocked}
            className="w-full py-3.5 mt-2 active:scale-95 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))", boxShadow: "0 4px 20px color-mix(in srgb, var(--a1) 30%, transparent), 0 0 40px color-mix(in srgb, var(--a2) 15%, transparent)" }}>
            {auth.isAuthLoading ? LOGIN.LOADING as string : LOGIN.SUBMIT as string}
          </button>
        </form>
      </motion.div>
    </main>
  );
});

// ── Wallet Loader ─────────────────────────────────────────────────────────────

const WalletLoader = memo(function WalletLoader() {
  return (
    <main className="w-full max-w-lg mx-auto min-h-screen flex items-center justify-center ds-bg-0">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" />
        <p className="text-label font-black ds-t3 uppercase tracking-widest">{FORM.LOADING_DATA as string}</p>
      </div>
    </main>
  );
});

// ── Main Page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE_DISPLAY = 15;

export default function Home() {
  const auth = useAuth();

  // ── UI State ──────────────────────────────────────────────────────────────
  const [mounted, setMounted]       = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("arta_theme");
      return saved !== null ? saved === "dark" : true;
    } catch { return true; }
  });
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window === "undefined") return "home";
    try {
      const saved = sessionStorage.getItem("arta_last_tab");
      return (saved && ["home","stats","finance","more"].includes(saved)) ? saved as TabId : "home";
    } catch { return "home"; }
  });

  const [financeSubPage, setFinanceSubPage] = useState<FinanceSubPage>(null);

  // ── Wallet ────────────────────────────────────────────────────────────────
  const { wallets, addWallet } = useWallets();
  const [activeWallet, setActiveWallet] = useState<ActiveWallet | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("arta_active_wallet");
      return saved ? JSON.parse(saved) as ActiveWallet : null;
    } catch { return null; }
  });
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isNewWalletOpen, setIsNewWalletOpen]     = useState(false);

  // ── Financial Data ────────────────────────────────────────────────────────
  const {
    balance, transactions, allTransactions,
    addTransaction, deleteTransaction, updateTransaction,
    hasMore, loadMore, isLoading,
    isOnline, isSyncing, pendingCount,
  } = useFinData(activeWallet?.id ?? null);

  // ── AI & Role ─────────────────────────────────────────────────────────────
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [aiKeywords,     setAiKeywords]     = useState<AiKeyword[]>([]);
  const [userPatterns,   setUserPatterns]   = useState<UserPattern[]>([]);
  const [isSmartLoading, setIsSmartLoading] = useState(false);
  const [isAdmin,        setIsAdmin]        = useState(false);
  const [isRoleLoading,  setIsRoleLoading]  = useState(true);

  // ── Display / Filter ─────────────────────────────────────────────────────
  const [pageDisplayCount, setPageDisplayCount] = useState(PAGE_SIZE_DISPLAY);
  const [typeFilter,       setTypeFilter]       = useState<"all" | "income" | "expense">("all");
  const [categoryFilter,   setCategoryFilter]   = useState<string>(HOME.ALL_CATEGORIES as string);
  const [searchQuery,      setSearchQuery]      = useState("");
  const [dateRange,        setDateRange]        = useState<DateRange>({ from: "", to: "" });
  const [allBudgets,       setAllBudgets]       = useState<Budget[]>([]);

  // ── Goals ─────────────────────────────────────────────────────────────────
  const [goals,              setGoals]              = useState<SavingsGoal[]>([]);
  const [isNewGoalOpen,      setIsNewGoalOpen]      = useState(false);
  const [newGoalData,        setNewGoalData]        = useState<NewGoalData>({ name: "", target: "", current: "" });
  const [isDirtyGoal,        setIsDirtyGoal]        = useState(false);
  const [activeGoalInput,    setActiveGoalInput]    = useState<string | null>(null);
  const [flexibleSavingsAmt, setFlexibleSavingsAmt] = useState("");
  const [financeRefreshKey,  setFinanceRefreshKey]  = useState(0);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [editTrxModal, setEditTrxModal] = useState<EditTrxModalState>({ isOpen: false, data: null });
  const [newWalletName, setNewWalletName] = useState("");
  const [addUserModal, setAddUserModal]   = useState<AddUserModalState>({ isOpen: false, username: "", password: "", isLoading: false });

  // ── Notification ──────────────────────────────────────────────────────────
  const [notification, setNotification] = useState<Notification>({ isOpen: false, message: "", type: "error" });
  const showNotification = useCallback((message: string, type: "error" | "success" = "error"): void => {
    setNotification({ isOpen: true, message, type });
    setTimeout(() => setNotification(p => ({ ...p, isOpen: false })), 4000);
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (typeof window !== "undefined") try { sessionStorage.setItem("arta_last_tab", activeTab); } catch {}
  }, [activeTab]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelectorAll(".overflow-y-auto").forEach(el => { (el as HTMLElement).scrollTop = 0; });
  }, [activeTab]);

  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) { html.classList.add("dark"); html.classList.remove("light-mode"); }
    else { html.classList.remove("dark"); html.classList.add("light-mode"); }
    localStorage.setItem("arta_theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    if (!auth.session?.user?.id) return;
    const uid = auth.session.user.id;

    const fetchAll = async (): Promise<void> => {
      // Phase 1: role check only — unlocks the dashboard as fast as possible
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", uid).single();
      if ((profile as { role?: string } | null)?.role === "admin") setIsAdmin(true);
      setIsRoleLoading(false);

      // Phase 2: AI/category data — loads in background, dashboard already visible
      const [{ data: cats }, { data: keys }, { data: ptData }] = await Promise.all([
        supabase.from("user_categories").select("*").order("name", { ascending: true }),
        supabase.from("ai_keywords").select("*").limit(1000),
        supabase.from("user_patterns")
          .select("phrase, frequency, typical_amount, category_id, user_categories(id, name)")
          .eq("user_id", uid)
          .order("frequency", { ascending: false })
          .limit(300),
      ]);
      if (cats) setUserCategories(cats as UserCategory[]);
      if (keys) setAiKeywords(keys as AiKeyword[]);
      if (!ptData?.length) {
        setTimeout(() => { void seedUserPatterns(uid); }, 1000);
      }
      if (ptData) {
        setUserPatterns((ptData as unknown as Array<{
          phrase: string; frequency: number; typical_amount: number | null;
          category_id: string; user_categories: { id: string; name: string } | null;
        }>).map(p => ({
          phrase: p.phrase, category_id: p.category_id,
          name: p.user_categories?.name ?? null,
          frequency: p.frequency, typical_amount: p.typical_amount ?? null,
        })));
      }

      setTimeout(async () => {
        try {
          const { count } = await supabase.from("ai_keywords").select("*", { count: "exact", head: true });
          if ((count ?? 0) > 20) return;
          const { data: trxs } = await supabase
            .from("transactions").select("note, category, type")
            .eq("type", "expense").not("category", "eq", "Lainnya").limit(500);
          if (!trxs?.length) return;

          const stopWords = new Set(["beli","bayar","untuk","ke","di","dari","dan","atau","dengan","yang"]);
          const catMap2: Record<string, string> = {};
          (cats as UserCategory[] ?? []).forEach(c => { catMap2[c.name.toLowerCase()] = c.id; });

          const uniqueCats = [...new Set((trxs as { category: string }[]).map(t => t.category).filter(Boolean))];
          for (const catName of uniqueCats) {
            if (!catMap2[catName.toLowerCase()]) {
              const { data: nc } = await supabase
                .from("user_categories")
                .upsert([{ name: catName }], { onConflict: "name", ignoreDuplicates: true })
                .select("id, name").single();
              if (nc) catMap2[(nc as UserCategory).name.toLowerCase()] = (nc as UserCategory).id;
            }
          }

          const toInsert: { category_id: string; keyword: string }[] = [];
          for (const trx of trxs as { note: string; category: string }[]) {
            const catId = catMap2[trx.category?.toLowerCase()];
            if (!catId) continue;
            const words = (trx.note ?? "")
              .toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/)
              .filter(w => w.length > 2 && !stopWords.has(w));
            for (const word of words) toInsert.push({ category_id: catId, keyword: word });
          }

          if (toInsert.length) {
            for (let i = 0; i < toInsert.length; i += 50) {
              await supabase.from("ai_keywords").upsert(toInsert.slice(i, i + 50), { onConflict: "category_id,keyword", ignoreDuplicates: true });
            }
            const { data: freshKeys } = await supabase.from("ai_keywords").select("*").limit(1000);
            if (freshKeys) setAiKeywords(freshKeys as AiKeyword[]);
          }
        } catch (err) { console.error("AI mining error:", (err as Error).message); }
      }, 2000);
    };

    void fetchAll();
    // Fallback: ensure loading screen is always cleared even if profile query fails
    const timeout = setTimeout(() => setIsRoleLoading(false), 3000);
    return () => clearTimeout(timeout);
  // auth.session?.user?.id is stable across token refreshes — avoids re-running 3 queries every ~30 min
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.session?.user?.id]);

  useEffect(() => {
    if (activeWallet || isAdmin) return;
    if (wallets.length > 0) {
      const first: ActiveWallet = { id: wallets[0].id, name: wallets[0].name };
      setActiveWallet(first);
      localStorage.setItem("arta_active_wallet", JSON.stringify(first));
    }
  }, [wallets, activeWallet, isAdmin]);

  useEffect(() => {
    if (!activeWallet) return;
    localStorage.setItem("arta_active_wallet", JSON.stringify(activeWallet));
  }, [activeWallet]);

  useEffect(() => {
    const fetch = async (): Promise<void> => {
      const { data } = await supabase.from("budgets").select("*").eq("month_year", new Date().toISOString().slice(0, 7));
      if (data) setAllBudgets(data as Budget[]);
    };
    void fetch();
  }, []);

  useEffect(() => {
    if (activeTab !== "finance" && activeTab !== "more") return;
    const fetch = async (): Promise<void> => {
      const { data } = await supabase.from("savings_goals").select("*").order("created_at", { ascending: true });
      if (data) setGoals(data as SavingsGoal[]);
    };
    void fetch();
  }, [activeTab, financeRefreshKey]);

  // ── Derived Data ──────────────────────────────────────────────────────────

  const transactionsThisMonth = allTransactions ?? [];

  const existingCategories = useMemo(() =>
    [...new Set((allTransactions ?? []).map(t => t.category).filter(Boolean))].sort(),
    [allTransactions]
  );

  const dynamicCategories = useMemo(() =>
    [HOME.ALL_CATEGORIES as string, ...existingCategories],
    [existingCategories]
  );

  useEffect(() => { setPageDisplayCount(PAGE_SIZE_DISPLAY); }, [typeFilter, categoryFilter, searchQuery, dateRange]);

  const allFilteredTransactions = useMemo(() => {
    return transactionsThisMonth.filter(t => {
      const matchType = typeFilter === "all" ? true : typeFilter === "income" ? t.type === "income" : (t.type === "expense" || !t.type);
      const matchCat = categoryFilter === (HOME.ALL_CATEGORIES as string) ? true : t.category === categoryFilter;
      const sl = searchQuery.toLowerCase();
      const matchSearch = !searchQuery || t.note.toLowerCase().includes(sl) || t.category.toLowerCase().includes(sl);
      let matchTime = true;
      if (t.created_at && dateRange.from && dateRange.to) {
        const trxDate = new Date(t.created_at);
        const from = new Date(dateRange.from);
        const to   = new Date(dateRange.to); to.setHours(23, 59, 59, 999);
        matchTime = trxDate >= from && trxDate <= to;
      }
      return matchType && matchCat && matchSearch && matchTime;
    });
  }, [transactionsThisMonth, typeFilter, categoryFilter, searchQuery, dateRange]);

  const filteredTransactions = useMemo(() =>
    allFilteredTransactions.slice(0, pageDisplayCount),
    [allFilteredTransactions, pageDisplayCount]
  );

  const pageHasMore = pageDisplayCount < allFilteredTransactions.length;
  const pageLoadMore = useCallback(() => setPageDisplayCount(p => p + PAGE_SIZE_DISPLAY), []);

  const filteredIncome = useMemo(() =>
    allFilteredTransactions.filter(t => t.type === "income").reduce((a, c) => a + Number(c.amount), 0),
    [allFilteredTransactions]
  );
  const filteredExpense = useMemo(() =>
    allFilteredTransactions.filter(t => t.type === "expense" || !t.type).reduce((a, c) => a + Number(c.amount), 0),
    [allFilteredTransactions]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSaveTrxEdit = useCallback(async (updatedData: {
    id: string; note: string; category: string; amount: number; created_at?: string;
  }): Promise<void> => {
    if (!updatedData?.note || !updatedData?.amount || !updatedData?.category) return;
    try {
      await updateTransaction(updatedData.id, updatedData.note, updatedData.category, updatedData.amount, updatedData.created_at);
      setEditTrxModal({ isOpen: false, data: null });
      showNotification("Transaksi berhasil diubah!", "success");
    } catch (err) {
      showNotification("Gagal mengubah: " + (err as Error).message, "error");
    }
  }, [updateTransaction, showNotification]);

  const handleCreateWallet = useCallback(async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!newWalletName.trim()) return;
    try {
      const result = await addWallet(newWalletName);
      if (result) {
        setIsNewWalletOpen(false);
        setNewWalletName("");
        setActiveWallet({ id: result.id, name: result.name });
      }
    } catch (err) {
      showNotification("Gagal membuat rekening: " + (err as Error).message, "error");
    }
  }, [addWallet, newWalletName, showNotification]);

  const classifyCategory = useCallback((note: string): string | null => {
    const stopWords = new Set(["beli","bayar","untuk","ke","di","dari","dan","atau","dengan","yang","nya","ini","itu"]);
    const words = note.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
    const scoreMap: Record<string, number> = {};
    for (const word of words) {
      for (const kw of aiKeywords) {
        if (!kw.keyword) continue;
        const kwLow = kw.keyword.toLowerCase();
        const score = word === kwLow ? 3 : word.includes(kwLow) ? 2 : (kwLow.includes(word) && word.length > 2) ? 1 : 0;
        if (score > 0) scoreMap[kw.category_id] = (scoreMap[kw.category_id] ?? 0) + score * (kw.frequency ?? 1);
      }
    }
    const best = Object.entries(scoreMap).sort((a, b) => b[1] - a[1])[0];
    if (!best) return null;
    const cat = userCategories.find(c => c.id === best[0]);
    if (!cat?.name) return null;
    return cat.name.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }, [aiKeywords, userCategories]);

  const handleSmartSubmit = useCallback(async (
    command: string, receiptFile: File | null = null, customDate: string | null = null
  ): Promise<void> => {
    if (!command?.trim()) return;
    setIsSmartLoading(true);
    try {
      let raw = command.trim();
      let type: "income" | "expense" = "expense";
      if (/^in\s+/i.test(raw)) { type = "income"; raw = raw.replace(/^in\s+/i, ""); }
      else if (/^out\s+/i.test(raw)) { raw = raw.replace(/^out\s+/i, ""); }

      const { amount, note: parsedNote } = tokenizeInput(raw);
      let finalNote = parsedNote || raw;

      if (!amount || amount <= 0) { showNotification(TOAST.FORMAT_ERROR as string, "error"); return; }

      let category   = "Lainnya";
      let categoryId: string | null = null;

      const posIdx = finalNote.toLowerCase().indexOf(" pos ");
      if (posIdx !== -1) {
        const catName = finalNote.slice(posIdx + 5).trim();
        finalNote = finalNote.slice(0, posIdx).trim();
        category = catName.replace(/\b\w/g, c => c.toUpperCase());
        categoryId = userCategories.find(c => c.name.toLowerCase() === category.toLowerCase())?.id ?? null;
      } else {
        const result = classifyFromPatterns(finalNote, userPatterns, userCategories);
        if (result.categoryName) {
          category   = result.categoryName;
          categoryId = result.categoryId;
        } else {
          const legacy = classifyCategory(finalNote);
          if (legacy) {
            category   = legacy;
            categoryId = userCategories.find(c => c.name.toLowerCase() === legacy.toLowerCase())?.id ?? null;
          }
        }
      }

      finalNote = finalNote.charAt(0).toUpperCase() + finalNote.slice(1);
      const dateToUse = customDate ?? null;

      await addTransaction(finalNote, amount, category, type, receiptFile, dateToUse);
      showNotification(TOAST.TRX_ADDED as string, "success");

      if (categoryId && activeWallet?.user_id) {
        const uid = activeWallet.user_id;
        setTimeout(async () => {
          await learnFromTransaction(supabase, uid, finalNote.toLowerCase(), categoryId!, 1, amount);
          const { data } = await supabase
            .from("user_patterns")
            .select("phrase, frequency, typical_amount, category_id, user_categories(id, name)")
            .eq("user_id", uid).order("frequency", { ascending: false }).limit(300);
          if (data) {
            setUserPatterns((data as unknown as Array<{
              phrase: string; frequency: number; typical_amount: number | null;
              category_id: string; user_categories: { id: string; name: string } | null;
            }>).map(p => ({
              phrase: p.phrase, category_id: p.category_id,
              name: p.user_categories?.name ?? null,
              frequency: p.frequency, typical_amount: p.typical_amount ?? null,
            })));
          }
        }, 300);
      }
    } catch (err) {
      showNotification(TOAST.FAIL_PREFIX as string + (err as Error).message, "error");
    } finally {
      setIsSmartLoading(false);
    }
  }, [classifyCategory, addTransaction, showNotification, userPatterns, userCategories, activeWallet]);

  const handleAddGoal = useCallback(async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!newGoalData.name.trim() || !newGoalData.target) return;
    const { data, error } = await supabase
      .from("savings_goals")
      .insert([{ name: newGoalData.name, target_amount: parseFlexibleNumber(newGoalData.target), current_amount: parseFlexibleNumber(newGoalData.current) }])
      .select();
    if (!error && data) {
      setGoals(p => [...p, (data as SavingsGoal[])[0]]);
      setIsNewGoalOpen(false);
      setNewGoalData({ name: "", target: "", current: "" });
      setIsDirtyGoal(false);
    }
  }, [newGoalData]);

  const handleContextSubmit = useCallback(async (context: ContextKey, preview: ContextPreview): Promise<void> => {
    const walletId = activeWallet?.id;
    const userId   = auth.session?.user?.id;
    if (!walletId || !userId) return;
    let error: { message: string } | null = null;
    switch (context) {
      case "debts": {
        const d = preview as DebtPreview;
        ({ error } = await supabase.from("debts").insert([{ person_name: d.person, amount: d.amount, initial_amount: d.amount, type: d.type, wallet_id: walletId, user_id: userId, status: "unpaid", due_date: null }]));
        break;
      }
      case "recurring": {
        const r = preview as RecurringPreview;
        ({ error } = await supabase.from("recurring_transactions").insert([{ note: r.note, amount: r.amount, category: r.category, type: r.type, frequency: r.frequency, next_run_date: new Date().toISOString().slice(0, 10), wallet_id: walletId, user_id: userId, is_active: true }]));
        break;
      }
      case "savings": {
        const s = preview as SavingsPreview;
        const { data: newGoal, error: savErr } = await supabase.from("savings_goals").insert([{ name: s.name, target_amount: s.target_amount, current_amount: 0 }]).select().single();
        error = savErr;
        if (!savErr && newGoal) setGoals(p => [...p, newGoal as SavingsGoal]);
        break;
      }
      case "assets": {
        const a = preview as AssetPreview;
        ({ error } = await supabase.from("assets").insert([{ name: a.name, price: a.price, condition: a.condition, store_name: null, purchase_date: null, notes: null, photo_url: null, wallet_id: walletId, user_id: userId }]));
        break;
      }
    }
    if (error) { showNotification("Gagal menyimpan: " + error.message, "error"); return; }
    showNotification("Berhasil ditambah!", "success");
    setFinanceRefreshKey(k => k + 1);
  }, [activeWallet, auth.session, showNotification]);

  const handleModifySavings = useCallback(async (id: string, currentAmt: number, mode: "add" | "subtract" | "reset"): Promise<void> => {
    let nextAmt = 0;
    if (mode !== "reset") {
      const parsed = parseFlexibleNumber(flexibleSavingsAmt);
      if (parsed <= 0) { showNotification(SAVINGS.INVALID_AMOUNT as string, "error"); return; }
      nextAmt = mode === "add" ? Number(currentAmt) + parsed : Math.max(0, Number(currentAmt) - parsed);
    }
    const { error } = await supabase.from("savings_goals").update({ current_amount: nextAmt }).eq("id", id);
    if (!error) {
      setGoals(p => p.map(g => g.id === id ? { ...g, current_amount: nextAmt } : g));
      setFlexibleSavingsAmt("");
      setActiveGoalInput(null);
    }
  }, [flexibleSavingsAmt, showNotification]);

  const handleCreateNewUser = useCallback(async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setAddUserModal(p => ({ ...p, isLoading: true }));
    try {
      const res = await fetch("/api/admin/add-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: addUserModal.username, password: addUserModal.password }),
      });
      const resData = await res.json() as { error?: string };
      if (!res.ok) throw new Error(resData.error ?? "Unknown error");
      showNotification(`Akses untuk @${addUserModal.username} berhasil dibuat!`, "success");
      setAddUserModal({ isOpen: false, username: "", password: "", isLoading: false });
    } catch (err) {
      showNotification(TOAST.FAIL_PREFIX as string + (err as Error).message, "error");
      setAddUserModal(p => ({ ...p, isLoading: false }));
    }
  }, [addUserModal, showNotification]);

  const handleFinanceTabClick = useCallback((): void => {
    if (activeTab === "finance") setFinanceSubPage(null);
    else { setActiveTab("finance"); setFinanceSubPage(null); }
  }, [activeTab]);

  // ── Render guards ─────────────────────────────────────────────────────────

  if (auth.isAuthLoading && !auth.session) {
    return (
      <div className="min-h-screen">
        <main className="w-full max-w-lg mx-auto min-h-screen flex flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-light tracking-[-1px]" style={{ color: "var(--text-1)" }}>ArtaKita.</h1>
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (!auth.session) return <div className="min-h-screen"><LoginScreen auth={auth} /></div>;
  if (isRoleLoading) return <div className="min-h-screen"><WalletLoader /></div>;

  if (isAdmin) {
    return (
      <div className="min-h-screen">
        <main className="w-full max-w-lg mx-auto relative min-h-screen ds-bg-0">
          <Toast isOpen={notification.isOpen} message={notification.message} type={notification.type} />
          <div className="pt-8 px-3 pb-24">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-[26px] font-light tracking-[-1.5px] leading-none ds-t1">Pusat Kendali</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="ds-live-dot" />
                  <p className="text-caption font-black tracking-[0.14em] uppercase ds-aurora-text">Superadmin</p>
                </div>
              </div>
              <button onClick={auth.handleLogout} className="px-3 py-1.5 font-black text-label uppercase tracking-widest rounded-xl border active:scale-95 transition-all shrink-0"
                style={{ background: "color-mix(in srgb, var(--a3) 10%, transparent)", borderColor: "color-mix(in srgb, var(--a3) 25%, transparent)", color: "var(--a3)" }}>
                {MORE.LOGOUT_SHORT as string}
              </button>
            </div>
            <AdminDashboard onNotify={showNotification} />
          </div>
        </main>
      </div>
    );
  }

  if (!activeWallet && !isRoleLoading) {
    if (wallets.length === 0) {
      return (
        <div className="min-h-screen">
          <main className="w-full max-w-lg mx-auto min-h-screen flex flex-col items-center justify-center p-6">
            <div className="w-full p-8 rounded-[32px] text-center" style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "color-mix(in srgb, var(--a1) 12%, transparent)" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--a1)" }}><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>
              </div>
              <h2 className="text-xl font-light tracking-tight mb-2" style={{ color: "var(--text-1)" }}>{WALLET.SETUP_TITLE as string}</h2>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--text-2)" }}>{WALLET.SETUP_DESC as string}</p>
              <form onSubmit={e => void handleCreateWallet(e)} className="space-y-3">
                <input type="text" required placeholder={WALLET.NAME_HINT as string} value={newWalletName}
                  onChange={e => setNewWalletName(e.target.value)}
                  className="w-full ds-bg-0 border ds-border rounded-2xl py-3.5 px-4 text-sm font-bold ds-t1 outline-none focus:border-[var(--a1)] transition-all placeholder:opacity-40" />
                <button type="submit" className="w-full py-3.5 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all"
                  style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))" }}>
                  {WALLET.CREATE as string}
                </button>
              </form>
              <button onClick={auth.handleLogout} className="mt-4 text-xs font-bold ds-t3 hover:text-fuchsia-400 transition-colors">
                {MORE.LOGOUT_SHORT as string}
              </button>
            </div>
          </main>
        </div>
      );
    }
    return <div className="min-h-screen"><WalletLoader /></div>;
  }
  if (!activeWallet) return <div className="min-h-screen"><WalletLoader /></div>;

  // ── Main App ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <main className="w-full max-w-lg mx-auto relative min-h-screen overflow-x-hidden ds-bg-0">

        <div className="ds-aurora-page-glow" aria-hidden="true" />

        <Toast isOpen={notification.isOpen} message={notification.message} type={notification.type} position="bottom" />

        <ForcePasswordModal
          isOpen={auth.forcePasswordModal.isOpen}
          newPassword={auth.forcePasswordModal.newPassword}
          setNewPassword={val => auth.setForcePasswordModal(p => ({ ...p, newPassword: val }))}
          onSubmit={() => void auth.handleForceChangePassword()}
          isLoading={auth.isAuthLoading}
          error={auth.authError}
        />

        <AddUserModal
          isOpen={addUserModal.isOpen}
          data={addUserModal}
          setData={setAddUserModal}
          onSubmit={e => void handleCreateNewUser(e)}
          onClose={() => setAddUserModal({ isOpen: false, username: "", password: "", isLoading: false })}
        />

        <AnimatePresence mode="wait" initial={false}>
          {activeTab === "home" && (
            <HomeTab key="home"
              session={auth.session}
              isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}
              activeWallet={activeWallet}
              onOpenWalletModal={() => setIsWalletModalOpen(true)}
              balance={balance}
              filteredIncome={filteredIncome} filteredExpense={filteredExpense}
              typeFilter={typeFilter} setTypeFilter={setTypeFilter}
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
              dynamicCategories={dynamicCategories}
              dateRange={dateRange} setDateRange={setDateRange}
              filteredTransactions={filteredTransactions}
              transactions={transactions}
              mounted={mounted}
              allBudgets={allBudgets}
              transactionsThisMonth={transactionsThisMonth}
              hasMore={pageHasMore} loadMore={pageLoadMore}
              totalCount={allFilteredTransactions.length}
              isLoading={isLoading} isOnline={isOnline} pendingCount={pendingCount} isSyncing={isSyncing}
              onEditTransaction={trx => setEditTrxModal({ isOpen: true, data: { ...trx } })}
              onSaveTransaction={handleSaveTrxEdit}
              onDeleteTransaction={trx => void deleteTransaction(trx.id)}
            />
          )}
          {activeTab === "stats" && (
            <StatsTab key="stats"
              filteredTransactions={transactionsThisMonth}
              transactions={allTransactions}
              balance={balance}
              activeWallet={activeWallet}
            />
          )}
          {activeTab === "finance" && (
            <FinanceTab key="finance"
              activeWallet={activeWallet} balance={balance}
              subPage={financeSubPage} setSubPage={setFinanceSubPage}
              onNotify={showNotification} financeRefreshKey={financeRefreshKey}
              goals={goals}
              isNewGoalOpen={isNewGoalOpen} setIsNewGoalOpen={setIsNewGoalOpen}
              newGoalData={newGoalData}
              setNewGoalData={d => { setNewGoalData(d); setIsDirtyGoal(true); }}
              isDirtyGoal={isDirtyGoal}
              handleAddGoal={e => void handleAddGoal(e)}
              activeGoalInput={activeGoalInput} setActiveGoalInput={setActiveGoalInput}
              flexibleSavingsAmt={flexibleSavingsAmt} setFlexibleSavingsAmt={setFlexibleSavingsAmt}
              handleModifySavings={(id, amt, mode) => void handleModifySavings(id, amt, mode)}
              onDeleteGoal={async id => {
                await supabase.from("savings_goals").delete().eq("id", id);
                setGoals(p => p.filter(g => g.id !== id));
              }}
            />
          )}
          {activeTab === "more" && (
            <MoreTab key="more"
              isAdmin={isAdmin} activeWallet={activeWallet} transactions={transactions}
              handleLogout={auth.handleLogout} onNotify={showNotification}
              onOpenAddUser={() => setAddUserModal({ isOpen: true, username: "", password: "", isLoading: false })}
            />
          )}
        </AnimatePresence>

        <WalletModal
          isOpen={isWalletModalOpen} onClose={() => setIsWalletModalOpen(false)}
          wallets={wallets} activeWallet={activeWallet} session={auth.session}
          onSelectWallet={w => { setActiveWallet(w); setIsWalletModalOpen(false); }}
          onAddWallet={() => { setIsWalletModalOpen(false); setIsNewWalletOpen(true); }}
          onNotify={showNotification}
        />

        <AnimatePresence>
          {isNewWalletOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsNewWalletOpen(false)}
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 20 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="fixed inset-x-4 top-[50%] -translate-y-[50%] z-[101] max-w-sm mx-auto ds-bg-1 rounded-[32px] shadow-2xl border ds-border p-6">
                <h2 className="text-lg font-light tracking-tight mb-2 ds-t1">{WALLET.SETUP_TITLE as string}</h2>
                <p className="text-sm mb-5 leading-relaxed ds-t3">{WALLET.SETUP_DESC as string}</p>
                <form onSubmit={e => void handleCreateWallet(e)} className="space-y-3">
                  <input type="text" required autoFocus placeholder={WALLET.NAME_HINT as string} value={newWalletName}
                    onChange={e => setNewWalletName(e.target.value)}
                    className="w-full ds-bg-0 border ds-border rounded-2xl py-3.5 px-4 text-sm font-bold ds-t1 outline-none focus:border-[var(--a1)] transition-all placeholder:opacity-40" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsNewWalletOpen(false)}
                      className="flex-1 py-3.5 ds-bg-3 ds-t2 text-xs font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95">
                      {FORM.CANCEL as string}
                    </button>
                    <button type="submit" className="flex-1 py-3.5 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95"
                      style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))" }}>
                      {WALLET.CREATE as string}
                    </button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <EditTrxModal
          isOpen={editTrxModal.isOpen} data={editTrxModal.data}
          onSubmit={handleSaveTrxEdit}
          onClose={() => setEditTrxModal(p => ({ ...p, isOpen: false }))}
          existingCategories={existingCategories}
        />

        <nav className="fixed bottom-0 left-0 right-0 z-[9999] ds-nav pb-safe">
          <div className="w-full max-w-lg mx-auto flex items-center px-1 pt-1 pb-1" style={{ height: 64 }}>

            {NAV_ITEMS.slice(0, 2).map(({ id, label, Icon }) => {
              const isActive = activeTab === id;
              return (
                <motion.button key={id} onClick={() => setActiveTab(id)} whileTap={{ scale: 0.88 }}
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full outline-none"
                  style={{ WebkitTapHighlightColor: "transparent" }}>
                  {isActive && (
                    <motion.div layoutId="navActive" className="absolute w-12 h-9 rounded-2xl"
                      style={{ background: "color-mix(in srgb,var(--a1) 10%,transparent)" }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                  )}
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.6} className="relative z-10" style={{ color: isActive ? "var(--a1)" : "var(--text-3)" }} />
                  <span className="text-2xs font-black uppercase tracking-widest relative z-10" style={{ color: isActive ? "var(--a1)" : "var(--text-3)" }}>{label}</span>
                </motion.button>
              );
            })}

            <div className="flex items-center justify-center flex-1">
              {auth.session && mounted && (
                <QuickCommandBar
                  onProcessTransaction={handleSmartSubmit}
                  userPatterns={userPatterns}
                  isSmartLoading={isSmartLoading}
                  aiKeywords={aiKeywords}
                  userCategories={userCategories}
                  session={auth.session}
                  currentContext={activeTab === "finance" && financeSubPage && ["debts","recurring","savings","assets"].includes(financeSubPage) ? financeSubPage as ContextKey : null}
                  onContextSubmit={handleContextSubmit}
                />
              )}
            </div>

            {NAV_ITEMS.slice(2).map(({ id, label, Icon }) => {
              const isActive = activeTab === id;
              return (
                <motion.button key={id} onClick={() => { if (id === "finance") handleFinanceTabClick(); else setActiveTab(id); }}
                  whileTap={{ scale: 0.88 }} className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full outline-none"
                  style={{ WebkitTapHighlightColor: "transparent" }}>
                  {isActive && (
                    <motion.div layoutId="navActive" className="absolute w-12 h-9 rounded-2xl"
                      style={{ background: "color-mix(in srgb,var(--a1) 10%,transparent)" }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                  )}
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.6} className="relative z-10" style={{ color: isActive ? "var(--a1)" : "var(--text-3)" }} />
                  <span className="text-2xs font-black uppercase tracking-widest relative z-10" style={{ color: isActive ? "var(--a1)" : "var(--text-3)" }}>{label}</span>
                </motion.button>
              );
            })}

          </div>
        </nav>

      </main>
    </div>
  );
}
