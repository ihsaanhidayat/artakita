"use client";
import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home as HomeIcon, BarChart3,
  Landmark, MoreHorizontal, X
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// Hooks
import { useAuth }    from "@/hooks/useAuth";
import { useFinData } from "@/hooks/useFinData";
import { useWallets } from "@/hooks/useWallets";

// Utils
import { parseFlexibleNumber, getRecentMonths } from "@/lib/utils";
import { NAV } from "@/lib/constants";

// Tab components
import HomeTab      from "@/components/tabs/HomeTab";
import StatsTab     from "@/components/tabs/StatsTab";
import FinanceTab   from "@/components/tabs/FinanceTab";
import MoreTab      from "@/components/tabs/MoreTab";

// Modal components
import EditTrxModal       from "@/components/modals/EditTrxModal";
import NewWalletModal     from "@/components/modals/NewWalletModal";
import AddUserModal       from "@/components/modals/AddUserModal";
import ForcePasswordModal from "@/components/modals/ForcePasswordModal";
import WalletModal        from "@/components/modals/WalletModal";

// Shared components
import Toast       from "@/components/Toast";
import DeleteModal from "@/components/DeleteModal";
import QuickCommandBar    from "@/components/QuickCommandBar";
import UserManagement    from "@/components/UserManagement";

// ── Nav items — 4 tab statis ──────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "home",    label: NAV.HOME,    Icon: HomeIcon  },
  { id: "stats",   label: NAV.STATS,   Icon: BarChart3 },
  { id: "finance", label: NAV.FINANCE, Icon: Landmark  },
  { id: "more",    label: NAV.MORE,    Icon: MoreHorizontal },
];

// ── Login Screen ──────────────────────────────────────────────────────────────
const LoginScreen = memo(function LoginScreen({ auth }) {
  return (
    <main className="w-full max-w-lg mx-auto min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full bg-white dark:bg-[#121827] p-8 rounded-[32px] shadow-2xl border border-gray-100 dark:border-gray-800"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-1">
            ArtaKita.
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">
            Artaku Artamu
          </p>
        </div>

        <form onSubmit={auth.handleLogin} className="space-y-4">
          <div>
            <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
              Username / Email
            </label>
            <input
              type="text" required autoFocus
              value={auth.authUsername || ""}
              onChange={e => auth.setAuthUsername(e.target.value)}
              placeholder="Masukkan username atau email"
              className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl py-3.5 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all placeholder-gray-300 dark:placeholder-gray-700"
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
              Kata Sandi
            </label>
            <input
              type="password" required
              value={auth.authPassword || ""}
              onChange={e => auth.setAuthPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl py-3.5 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all placeholder-gray-300 dark:placeholder-gray-700"
            />
          </div>

          <AnimatePresence>
            {auth.authError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs font-bold text-red-500 text-center bg-red-500/10 py-2.5 rounded-xl"
              >
                {auth.authError}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={auth.isAuthLoading || auth.isLocked}
            className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50"
          >
            {auth.isAuthLoading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </motion.div>
    </main>
  );
});

// ── Wallet Loader ─────────────────────────────────────────────────────────────
const WalletLoader = memo(function WalletLoader() {
  return (
    <main className="w-full max-w-lg mx-auto min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Memuat data...</p>
      </div>
    </main>
  );
});

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {

  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = useAuth();

  // ── UI State ──────────────────────────────────────────────────────────────
  const [mounted, setMounted]       = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab]   = useState(() => {
    if (typeof window === "undefined") return "home";
    const saved = sessionStorage.getItem("arta_last_tab");
    // Finance sub-page tidak boleh jadi landing saat refresh
    return saved && ["home","stats","finance","more"].includes(saved) ? saved : "home";
  });

  // Finance sub-page state — dikelola di sini agar tap nav Finance bisa reset
  const [financeSubPage, setFinanceSubPage] = useState(null); // null = rows, string = sub-page

  // ── Wallet ────────────────────────────────────────────────────────────────
  const { wallets, addWallet } = useWallets();
  const [activeWallet, setActiveWallet] = useState(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  // ── Financial Data ────────────────────────────────────────────────────────
  const {
    balance, transactions, allTransactions,
    addTransaction, deleteTransaction, updateTransaction,
    hasMore, loadMore, isLoading,
    isOnline, isSyncing, pendingCount,
  } = useFinData(activeWallet?.id ?? null);

  // ── AI & Role ─────────────────────────────────────────────────────────────
  const [userCategories, setUserCategories] = useState([]);
  const [aiKeywords,     setAiKeywords]     = useState([]);
  const [isSmartLoading, setIsSmartLoading] = useState(false);
  const [isAdmin,        setIsAdmin]        = useState(false);
  const [isRoleLoading,  setIsRoleLoading]  = useState(true);

  // ── Filter ────────────────────────────────────────────────────────────────
  const [typeFilter,       setTypeFilter]       = useState("all");
  const [categoryFilter,   setCategoryFilter]   = useState("Semua");
  const [searchQuery,      setSearchQuery]      = useState("");
  const [quickTimeFilter,  setQuickTimeFilter]  = useState("month");
  const [dateRange,        setDateRange]        = useState({ from: "", to: "" });
  const [selectedMonth,    setSelectedMonth]    = useState(() => new Date().toISOString().slice(0, 7));
  const [recentMonths]                          = useState(getRecentMonths);
  const [allBudgets,       setAllBudgets]       = useState([]);

  // ── Goals ─────────────────────────────────────────────────────────────────
  const [goals,               setGoals]               = useState([]);
  const [isNewGoalOpen,       setIsNewGoalOpen]       = useState(false);
  const [newGoalData,         setNewGoalData]         = useState({ name: "", target: "", current: "" });
  const [goalDeleteModal,     setGoalDeleteModal]     = useState({ isOpen: false, goalId: null, goalName: "" });
  const [activeGoalInput,     setActiveGoalInput]     = useState(null);
  const [flexibleSavingsAmt,  setFlexibleSavingsAmt]  = useState("");

  // ── Modals ────────────────────────────────────────────────────────────────
  const [editTrxModal,       setEditTrxModal]       = useState({ isOpen: false, data: null });
  const [newWalletName,      setNewWalletName]      = useState("");
  const [isNewWalletOpen,    setIsNewWalletOpen]    = useState(false);
  const [isDeleteModalOpen,  setIsDeleteModalOpen]  = useState(false);
  const [itemToDelete,       setItemToDelete]       = useState(null);
  const [goalDeleteOpen,     setGoalDeleteOpen]     = useState(false);
  const [addUserModal,       setAddUserModal]       = useState({ isOpen: false, username: "", password: "", isLoading: false });

  // ── Notification ──────────────────────────────────────────────────────────
  const [notification, setNotification] = useState({ isOpen: false, message: "", type: "error" });

  const showNotification = useCallback((message, type = "error") => {
    setNotification({ isOpen: true, message, type });
    setTimeout(() => setNotification(p => ({ ...p, isOpen: false })), 4000);
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { setMounted(true); }, []);

  // Persist tab
  useEffect(() => {
    if (typeof window !== "undefined") sessionStorage.setItem("arta_last_tab", activeTab);
  }, [activeTab]);

  // Reset scroll saat pindah tab
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelectorAll(".overflow-y-auto").forEach(el => { el.scrollTop = 0; });
    // Reset finance sub-page saat tap nav finance lagi
  }, [activeTab]);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // AI brain + role
  useEffect(() => {
    if (!auth.session?.user?.id) return;
    const uid = auth.session.user.id;

    const fetchAll = async () => {
      const [{ data: cats }, { data: keys }, { data: profile }] = await Promise.all([
        supabase.from("user_categories").select("*").order("name", { ascending: true }),
        supabase.from("ai_keywords").select("*"),
        supabase.from("profiles").select("role").eq("id", uid).single(),
      ]);
      if (cats) setUserCategories(cats);
      if (keys) setAiKeywords(keys);
      if (profile?.role === "admin") setIsAdmin(true);
      setIsRoleLoading(false);

      // ── AI Mining background — mine seluruh transaksi jika keywords sedikit ──
      setTimeout(async () => {
        try {
          const { count } = await supabase
            .from("ai_keywords").select("*", { count: "exact", head: true });
          if ((count || 0) > 20) return; // sudah cukup, skip

          const { data: trxs } = await supabase
            .from("transactions")
            .select("note, category, type")
            .eq("type", "expense")
            .not("category", "eq", "Lainnya")
            .limit(500);
          if (!trxs?.length) return;

          const stopWords = new Set(["beli","bayar","untuk","ke","di","dari","dan","atau","dengan","yang"]);
          const catMap    = {};
          (cats || []).forEach(c => { catMap[c.name.toLowerCase()] = c.id; });

          // Buat kategori yang belum ada
          const uniqueCats = [...new Set(trxs.map(t => t.category).filter(Boolean))];
          for (const catName of uniqueCats) {
            if (!catMap[catName.toLowerCase()]) {
              const { data: nc } = await supabase
                .from("user_categories")
                .upsert([{ name: catName }], { onConflict: "name", ignoreDuplicates: true })
                .select("id, name").single();
              if (nc) catMap[nc.name.toLowerCase()] = nc.id;
            }
          }

          // Mining keywords
          const toInsert = [];
          for (const trx of trxs) {
            const catId = catMap[trx.category?.toLowerCase()];
            if (!catId) continue;
            const words = (trx.note || "")
              .toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/)
              .filter(w => w.length > 2 && !stopWords.has(w));
            for (const word of words) {
              toInsert.push({ category_id: catId, keyword: word });
            }
          }

          if (toInsert.length) {
            // Batch upsert agar tidak duplikat
            const chunks = [];
            for (let i = 0; i < toInsert.length; i += 50) chunks.push(toInsert.slice(i, i+50));
            for (const chunk of chunks) {
              await supabase.from("ai_keywords").upsert(chunk, { onConflict: "category_id,keyword", ignoreDuplicates: true });
            }
            const { data: freshKeys } = await supabase.from("ai_keywords").select("*");
            if (freshKeys) setAiKeywords(freshKeys);
          }
        } catch (err) {
          console.error("AI mining error:", err.message);
        }
      }, 2000); // delay 2 detik agar tidak blocking UI
    };
    fetchAll();
    // Fallback: jika fetch gagal, tetap lanjutkan setelah 3 detik
    const timeout = setTimeout(() => setIsRoleLoading(false), 3000);
    return () => clearTimeout(timeout);
  }, [auth.session]);

  // Active wallet dari localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("arta_active_wallet");
    if (saved) {
      try { setActiveWallet(JSON.parse(saved)); } catch {}
    }
  }, []);

  // Fallback: pakai wallet pertama jika belum ada yang aktif
  useEffect(() => {
    if (activeWallet || isAdmin) return;
    if (wallets.length > 0) {
      const first = { id: wallets[0].id, name: wallets[0].name };
      setActiveWallet(first);
      localStorage.setItem("arta_active_wallet", JSON.stringify(first));
    }
    // TIDAK auto-create — user baru tanpa wallet akan lihat layar setup
  }, [wallets, activeWallet, isAdmin]);

  // Persist active wallet
  useEffect(() => {
    if (!activeWallet) return;
    localStorage.setItem("arta_active_wallet", JSON.stringify(activeWallet));
  }, [activeWallet]);

  // Budgets
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("budgets").select("*").eq("month_year", selectedMonth);
      if (data) setAllBudgets(data);
    };
    fetch();
  }, [selectedMonth]);

  // Goals
  useEffect(() => {
    if (activeTab !== "more") return;
    const fetch = async () => {
      const { data } = await supabase.from("savings_goals").select("*").order("created_at", { ascending: true });
      if (data) setGoals(data);
    };
    fetch();
  }, [activeTab]);

  // ── Derived Data ──────────────────────────────────────────────────────────
  const transactionsThisMonth = useMemo(() =>
    (allTransactions || []).filter(t => t.created_at?.startsWith(selectedMonth)),
    [allTransactions, selectedMonth]
  );

  const existingCategories = useMemo(() =>
    [...new Set((allTransactions || []).map(t => t.category).filter(Boolean))].sort(),
    [allTransactions]
  );

  const dynamicCategories = useMemo(() =>
    ["Semua", ...existingCategories],
    [existingCategories]
  );

  const filteredTransactions = useMemo(() => {
    return transactionsThisMonth.filter(t => {
      // Tipe
      const matchType = typeFilter === "all" ? true
        : typeFilter === "income"  ? t.type === "income"
        : (t.type === "expense" || !t.type);

      // Kategori
      const matchCat = categoryFilter === "Semua" ? true : t.category === categoryFilter;

      // Search
      const sl = searchQuery.toLowerCase();
      const matchSearch = !searchQuery ||
        t.note.toLowerCase().includes(sl) ||
        t.category.toLowerCase().includes(sl);

      // Waktu
      let matchTime = true;
      if (t.created_at) {
        const trxDate = new Date(t.created_at);
        const today   = new Date();

        if (dateRange.from && dateRange.to) {
          // Custom date range override quick filter
          const from = new Date(dateRange.from);
          const to   = new Date(dateRange.to);
          to.setHours(23, 59, 59, 999);
          matchTime = trxDate >= from && trxDate <= to;
        } else if (quickTimeFilter === "today") {
          matchTime = trxDate.toDateString() === today.toDateString();
        } else if (quickTimeFilter === "week") {
          const pastWeek = new Date(today);
          pastWeek.setDate(today.getDate() - 7);
          matchTime = trxDate >= pastWeek && trxDate <= today;
        }
      }

      return matchType && matchCat && matchSearch && matchTime;
    });
  }, [transactionsThisMonth, typeFilter, categoryFilter, searchQuery, quickTimeFilter, dateRange]);

  const filteredIncome = useMemo(() =>
    filteredTransactions.filter(t => t.type === "income").reduce((a, c) => a + Number(c.amount), 0),
    [filteredTransactions]
  );
  const filteredExpense = useMemo(() =>
    filteredTransactions.filter(t => t.type === "expense" || !t.type).reduce((a, c) => a + Number(c.amount), 0),
    [filteredTransactions]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSaveTrxEdit = useCallback(async (updatedData) => {
    if (!updatedData?.note || !updatedData?.amount || !updatedData?.category) return;
    try {
      await updateTransaction(
        updatedData.id,
        updatedData.note,
        updatedData.category,
        updatedData.amount,
        updatedData.created_at
      );
      setEditTrxModal({ isOpen: false, data: null });
      showNotification("Transaksi berhasil diubah!", "success");
    } catch (err) {
      showNotification("Gagal mengubah: " + err.message, "error");
    }
  }, [updateTransaction, showNotification]);

  const handleCreateWallet = useCallback(async e => {
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
      showNotification("Gagal membuat rekening: " + err.message, "error");
    }
  }, [addWallet, newWalletName, showNotification]);

  // ── AI classify helper ────────────────────────────────────────────────────
  const classifyCategory = useCallback((note) => {
    // Bersihkan stop words, split jadi kata-kata
    const stopWords = new Set(["beli","bayar","untuk","ke","di","dari","dan","atau","dengan","yang"]);
    const words     = note.toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 1 && !stopWords.has(w));

    // Cari match di aiKeywords — case insensitive, partial match
    for (const word of words) {
      const match = aiKeywords.find(k =>
        k.keyword && word.includes(k.keyword.toLowerCase())
      );
      if (match) {
        const cat = userCategories.find(c => c.id === match.category_id);
        if (cat) return cat.name;
      }
    }
    // Coba reverse — keyword contains word
    for (const word of words) {
      const match = aiKeywords.find(k =>
        k.keyword && k.keyword.toLowerCase().includes(word)
      );
      if (match) {
        const cat = userCategories.find(c => c.id === match.category_id);
        if (cat) return cat.name;
      }
    }
    return null;
  }, [aiKeywords, userCategories]);

  // ── Simpan keyword ke DB background ───────────────────────────────────────
  const learnKeyword = useCallback(async (note, categoryName) => {
    try {
      const stopWords = new Set(["beli","bayar","untuk","ke","di","dari","dan","atau","dengan","yang"]);
      const words     = note.toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

      // Pastikan kategori ada
      let { data: catData } = await supabase
        .from("user_categories").select("id").ilike("name", categoryName).single();
      if (!catData) {
        const { data: newCat } = await supabase
          .from("user_categories")
          .insert([{ name: categoryName }])
          .select("id").single();
        catData = newCat;
      }
      if (!catData) return;

      // Upsert semua kata — tidak duplikat
      for (const word of words) {
        await supabase.from("ai_keywords").upsert(
          [{ category_id: catData.id, keyword: word }],
          { onConflict: "category_id,keyword", ignoreDuplicates: true }
        );
      }

      // Refresh keywords di state
      const { data: fresh } = await supabase.from("ai_keywords").select("*");
      if (fresh) setAiKeywords(fresh);
    } catch (err) {
      console.error("learnKeyword error:", err.message);
    }
  }, []);

  const handleSmartSubmit = useCallback(async (command, receiptFile = null, customDate = null) => {
    if (!command.trim()) return;
    setIsSmartLoading(true);
    try {
      const clean = command.toLowerCase().trim();
      let type    = "expense";
      let text    = clean;

      if (clean.startsWith("in "))  { type = "income";  text = clean.slice(3).trim(); }
      else if (clean.startsWith("out ")) { text = clean.slice(4).trim(); }

      const match = text.match(/^([\d.,]+(?:k|rb|ribu|m|jt|juta)?)\s+(.+)$/i);
      if (!match) { showNotification("Format salah! Cth: 50k makan siang", "error"); return; }

      const amount   = parseFlexibleNumber(match[1]);
      let rawNote    = match[2].trim();
      let category   = "Lainnya";
      let finalNote  = rawNote;

      // Manual pos — case insensitive
      const posIdx = rawNote.toLowerCase().indexOf(" pos ");
      if (posIdx !== -1) {
        finalNote        = rawNote.slice(0, posIdx).trim();
        const targetCat  = rawNote.slice(posIdx + 5).trim();
        category         = targetCat.charAt(0).toUpperCase() + targetCat.slice(1);
        // Belajar di background
        setTimeout(() => learnKeyword(finalNote, category), 300);
      } else {
        // AI auto-classify — cari dari keywords
        const found = classifyCategory(rawNote);
        if (found) category = found;
      }

      finalNote = finalNote.charAt(0).toUpperCase() + finalNote.slice(1);
      await addTransaction(finalNote, amount, category, type, receiptFile, customDate);
      showNotification("Transaksi berhasil dicatat! ✨", "success");
    } catch (err) {
      showNotification("Gagal: " + err.message, "error");
    } finally {
      setIsSmartLoading(false);
    }
  }, [classifyCategory, learnKeyword, addTransaction, showNotification]);

  const handleAddGoal = useCallback(async e => {
    e.preventDefault();
    if (!newGoalData.name.trim() || !newGoalData.target) return;
    const { data, error } = await supabase
      .from("savings_goals")
      .insert([{
        name:           newGoalData.name,
        target_amount:  parseFlexibleNumber(newGoalData.target),
        current_amount: parseFlexibleNumber(newGoalData.current),
      }])
      .select();
    if (!error && data) {
      setGoals(p => [...p, data[0]]);
      setIsNewGoalOpen(false);
      setNewGoalData({ name: "", target: "", current: "" });
    }
  }, [newGoalData]);

  const handleModifySavings = useCallback(async (id, currentAmt, mode) => {
    let nextAmt = 0;
    if (mode !== "reset") {
      const parsed = parseFlexibleNumber(flexibleSavingsAmt);
      if (parsed <= 0) { showNotification("Masukkan nominal yang valid", "error"); return; }
      nextAmt = mode === "add" ? Number(currentAmt) + parsed : Math.max(0, Number(currentAmt) - parsed);
    }
    const { error } = await supabase.from("savings_goals").update({ current_amount: nextAmt }).eq("id", id);
    if (!error) {
      setGoals(p => p.map(g => g.id === id ? { ...g, current_amount: nextAmt } : g));
      setFlexibleSavingsAmt("");
      setActiveGoalInput(null);
    }
  }, [flexibleSavingsAmt, showNotification]);

  const handleCreateNewUser = useCallback(async e => {
    e.preventDefault();
    setAddUserModal(p => ({ ...p, isLoading: true }));
    try {
      const res  = await fetch("/api/admin/add-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: addUserModal.username, password: addUserModal.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showNotification(`Akses untuk @${addUserModal.username} berhasil dibuat!`, "success");
      setAddUserModal({ isOpen: false, username: "", password: "", isLoading: false });
    } catch (err) {
      showNotification("Gagal: " + err.message, "error");
      setAddUserModal(p => ({ ...p, isLoading: false }));
    }
  }, [addUserModal, showNotification]);

  // Nav Finance tap → reset ke rows
  const handleFinanceTabClick = useCallback(() => {
    if (activeTab === "finance") {
      setFinanceSubPage(null); // kembali ke 4 rows
    } else {
      setActiveTab("finance");
      setFinanceSubPage(null);
    }
  }, [activeTab]);

  // ── App class ─────────────────────────────────────────────────────────────
  const appClass = `min-h-screen transition-colors duration-300 ${isDarkMode ? "dark bg-[#0a0f1c]" : "bg-gray-50"}`;

  // ── Render guards ─────────────────────────────────────────────────────────
  if (!auth.session) return <div className={appClass}><LoginScreen auth={auth} /></div>;

  // Tunggu role check selesai
  if (isRoleLoading) return <div className={appClass}><WalletLoader /></div>;

  // Admin → SELALU ke halaman User Management, tidak pernah ke app utama
  if (isAdmin) {
    return (
      <div className={appClass}>
        <main className="w-full max-w-lg mx-auto relative min-h-screen bg-white dark:bg-black">
          <Toast isOpen={notification.isOpen} message={notification.message} type={notification.type} />
          <div className="pt-8 px-3 pb-32">
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-6">
              Manajemen Pengguna
            </h2>
            <UserManagement onNotify={showNotification} />
          </div>
          {/* Logout */}
          <div className="fixed bottom-6 left-0 right-0 max-w-lg mx-auto px-4">
            <button
              onClick={auth.handleLogout}
              className="w-full py-3.5 bg-red-500/10 border border-red-500/20 text-red-500 font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
            >
              Keluar dari Akun
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Non-admin tanpa wallet
  if (!activeWallet && !isRoleLoading) {
    // Jika wallets sudah di-fetch tapi kosong → layar setup
    if (wallets.length === 0) {
      return (
        <div className={appClass}>
          <main className="w-full max-w-lg mx-auto min-h-screen flex flex-col items-center justify-center p-6">
            <div className="w-full bg-white dark:bg-[#121827] p-8 rounded-[32px] shadow-2xl border border-gray-100 dark:border-gray-800 text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                Buat Rekening Pertama
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                Selamat datang! Buat rekening untuk mulai mencatat keuangan kamu.
              </p>
              <form onSubmit={handleCreateWallet} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Nama rekening (Cth: BSI Ihsan)"
                  value={newWalletName}
                  onChange={e => setNewWalletName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl py-3.5 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all placeholder-gray-400"
                />
                <button
                  type="submit"
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-500/30 transition-all"
                >
                  Buat Rekening
                </button>
              </form>
              <button
                onClick={auth.handleLogout}
                className="mt-4 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
              >
                Keluar
              </button>
            </div>
          </main>
        </div>
      );
    }
    return <div className={appClass}><WalletLoader /></div>;
  }
  if (!activeWallet) return <div className={appClass}><WalletLoader /></div>;

  return (
    <div className={appClass}>
      <main className="w-full max-w-lg mx-auto relative min-h-screen overflow-x-hidden bg-white dark:bg-black">

        {/* ── Toast — posisi bawah dekat QuickCommandBar ── */}
        <Toast
          isOpen={notification.isOpen}
          message={notification.message}
          type={notification.type}
          position="bottom"
        />

        {/* ── Force Password Modal ── */}
        <ForcePasswordModal
          isOpen={auth.forcePasswordModal.isOpen}
          newPassword={auth.forcePasswordModal.newPassword}
          setNewPassword={val => auth.setForcePasswordModal(p => ({ ...p, newPassword: val }))}
          onSubmit={auth.handleForceChangePassword}
          isLoading={auth.isAuthLoading}
          error={auth.authError}
        />

        {/* ── Add User Modal ── */}
        <AddUserModal
          isOpen={addUserModal.isOpen}
          data={addUserModal}
          setData={setAddUserModal}
          onSubmit={handleCreateNewUser}
          onClose={() => setAddUserModal({ isOpen: false, username: "", password: "", isLoading: false })}
        />

        {/* ── Tab content ── */}
        <AnimatePresence mode="wait" initial={false}>

          {activeTab === "home" && (
            <HomeTab
              key="home"
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
              activeWallet={activeWallet}
              onOpenWalletModal={() => setIsWalletModalOpen(true)}
              balance={balance}
              filteredIncome={filteredIncome}
              filteredExpense={filteredExpense}
              typeFilter={typeFilter}         setTypeFilter={setTypeFilter}
              searchQuery={searchQuery}       setSearchQuery={setSearchQuery}
              categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
              dynamicCategories={dynamicCategories}
              dateRange={dateRange}           setDateRange={setDateRange}
              selectedMonth={selectedMonth}   setSelectedMonth={setSelectedMonth}
              recentMonths={recentMonths}
              filteredTransactions={filteredTransactions}
              transactions={transactions}
              mounted={mounted}
              allBudgets={allBudgets}
              transactionsThisMonth={transactionsThisMonth}
              hasMore={hasMore}
              loadMore={loadMore}
              isLoading={isLoading}
              isOnline={isOnline}
              pendingCount={pendingCount}
              isSyncing={isSyncing}
              onEditTransaction={trx => setEditTrxModal({ isOpen: true, data: { ...trx } })}
              onDeleteTransaction={trx => { setItemToDelete(trx); setIsDeleteModalOpen(true); }}
            />
          )}

          {activeTab === "stats" && (
            <StatsTab
              key="stats"
              filteredTransactions={transactionsThisMonth}
              transactions={transactionsThisMonth}
              selectedMonth={selectedMonth}
              balance={balance}
            />
          )}

          {activeTab === "finance" && (
            <FinanceTab
              key="finance"
              activeWallet={activeWallet}
              balance={balance}
              subPage={financeSubPage}
              setSubPage={setFinanceSubPage}
              onNotify={showNotification}
              goals={goals}
              setGoals={setGoals}
              isNewGoalOpen={isNewGoalOpen}
              setIsNewGoalOpen={setIsNewGoalOpen}
              newGoalData={newGoalData}
              setNewGoalData={setNewGoalData}
              handleAddGoal={handleAddGoal}
              activeGoalInput={activeGoalInput}
              setActiveGoalInput={setActiveGoalInput}
              flexibleSavingsAmt={flexibleSavingsAmt}
              setFlexibleSavingsAmt={setFlexibleSavingsAmt}
              handleModifySavings={handleModifySavings}
              triggerDeleteGoal={id => setGoalDeleteModal({ isOpen: true, goalId: id, goalName: goals.find(g => g.id === id)?.name || "" })}
            />
          )}

          {activeTab === "more" && (
            <MoreTab
              key="more"
              isAdmin={isAdmin}
              activeWallet={activeWallet}
              transactions={transactions}
              handleLogout={auth.handleLogout}
              onNotify={showNotification}
              onOpenAddUser={() => setAddUserModal({ isOpen: true, username: "", password: "", isLoading: false })}
            />
          )}

        </AnimatePresence>

        {/* ── QuickCommandBar ── */}
        {activeTab === "home" && (
          <QuickCommandBar
            onProcessTransaction={handleSmartSubmit}
            isSmartLoading={isSmartLoading}
            aiKeywords={aiKeywords}
            userCategories={userCategories}
          />
        )}

        {/* ── Wallet Modal ── */}
        <WalletModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          wallets={wallets}
          activeWallet={activeWallet}
          session={auth.session}
          onSelectWallet={w => {
            setActiveWallet(w);
            setIsWalletModalOpen(false);
          }}
          onAddWallet={() => { setIsWalletModalOpen(false); setIsNewWalletOpen(true); }}
          onNotify={showNotification}
        />

        {/* ── New Wallet Modal ── */}
        <NewWalletModal
          isOpen={isNewWalletOpen}
          name={newWalletName}
          setName={setNewWalletName}
          onSubmit={handleCreateWallet}
          onClose={() => { setIsNewWalletOpen(false); setNewWalletName(""); }}
        />

        {/* ── Edit Transaction Modal ── */}
        <EditTrxModal
          isOpen={editTrxModal.isOpen}
          data={editTrxModal.data}
          onSubmit={handleSaveTrxEdit}
          onClose={() => setEditTrxModal(p => ({ ...p, isOpen: false }))}
          existingCategories={existingCategories}
        />

        {/* ── Delete Transaction Modal ── */}
        <DeleteModal
          isOpen={isDeleteModalOpen}
          title="Hapus Transaksi?"
          message="Tindakan ini permanen dan tidak dapat dibatalkan."
          onConfirm={() => {
            if (itemToDelete) deleteTransaction(itemToDelete.id);
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
          }}
          onCancel={() => setIsDeleteModalOpen(false)}
        />

        {/* ── Delete Goal Modal ── */}
        <DeleteModal
          isOpen={goalDeleteModal.isOpen}
          title="Hapus Target Impian?"
          message={<>Target <strong>"{goalDeleteModal.goalName}"</strong> akan dihapus permanen.</>}
          confirmLabel="Hapus Target"
          onConfirm={async () => {
            if (goalDeleteModal.goalId) {
              await supabase.from("savings_goals").delete().eq("id", goalDeleteModal.goalId);
              setGoals(p => p.filter(g => g.id !== goalDeleteModal.goalId));
            }
            setGoalDeleteModal({ isOpen: false, goalId: null, goalName: "" });
          }}
          onCancel={() => setGoalDeleteModal({ isOpen: false, goalId: null, goalName: "" })}
        />

        {/* ── Bottom Navigation ── */}
        <nav className="fixed bottom-0 left-0 right-0 z-[9999] bg-white/85 dark:bg-[#0a0f1c]/95 backdrop-blur-xl border-t border-gray-200/80 dark:border-gray-800/80 pb-safe">
          <div className="w-full max-w-lg mx-auto flex justify-around items-end px-2 pt-2 pb-2">
            {NAV_ITEMS.map(({ id, label, Icon }) => {
              const isActive = activeTab === id;
              return (
                <motion.button
                  key={id}
                  onClick={() => {
                    if (id === "finance") handleFinanceTabClick();
                    else setActiveTab(id);
                  }}
                  whileTap={{ scale: 0.88 }}
                  className="flex flex-col items-center gap-1 relative flex-1 py-1 outline-none"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  {/* Active indicator — pill di belakang icon */}
                  {isActive && (
                    <motion.div
                      layoutId="navActive"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-8 bg-blue-500/10 dark:bg-blue-500/15 rounded-2xl"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}

                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.7}
                    className={`relative z-10 transition-colors duration-200 ${
                      isActive ? "text-blue-500" : "text-gray-400 dark:text-gray-500"
                    }`}
                  />
                  <span className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-200 ${
                    isActive ? "text-blue-500" : "text-gray-400 dark:text-gray-500"
                  }`}>
                    {label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </nav>

      </main>
    </div>
  );
}
