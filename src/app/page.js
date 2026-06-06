"use client";
import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { tokenizeInput, classifyFromPatterns, learnFromTransaction } from "@/lib/aiEngine";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home as HomeIcon, BarChart3,
  Landmark, MoreHorizontal, X
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// Hooks
import { useAuth } from "@/hooks/useAuth";
import { useFinData } from "@/hooks/useFinData";
import { useWallets } from "@/hooks/useWallets";

// Utils
import { parseFlexibleNumber } from "@/lib/utils";
import { NAV } from "@/lib/constants";

// Tab components
import HomeTab from "@/components/tabs/HomeTab";
import StatsTab from "@/components/tabs/StatsTab";
import FinanceTab from "@/components/tabs/FinanceTab";
import MoreTab from "@/components/tabs/MoreTab";

// Modal components
import EditTrxModal from "@/components/modals/EditTrxModal";
import AddUserModal from "@/components/modals/AddUserModal";
import ForcePasswordModal from "@/components/modals/ForcePasswordModal";
import WalletModal from "@/components/modals/WalletModal";

// Shared components
import Toast from "@/components/Toast";
import DeleteModal from "@/components/DeleteModal";
import QuickCommandBar from "@/components/QuickCommandBar";
import UserManagement from "@/components/UserManagement";

// ── Nav items — 4 tab statis ──────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "home", label: NAV.HOME, Icon: HomeIcon },
  { id: "stats", label: NAV.STATS, Icon: BarChart3 },
  { id: "finance", label: NAV.FINANCE, Icon: Landmark },
  { id: "more", label: NAV.MORE, Icon: MoreHorizontal },
];

// ── Login Screen ──────────────────────────────────────────────────────────────
const LoginScreen = memo(function LoginScreen({ auth }) {
  return (
    <main className="w-full max-w-lg mx-auto min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full bg-white p-8 rounded-[32px] shadow-2xl border ds-border"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black ds-t1 tracking-tight mb-1">
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
              className="w-full ds-bg-0 border ds-border rounded-2xl py-3.5 px-4 text-sm font-bold ds-t1 outline-none focus:border-blue-500 transition-all placeholder-gray-300"
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
              className="w-full ds-bg-0 border ds-border rounded-2xl py-3.5 px-4 text-sm font-bold ds-t1 outline-none focus:border-blue-500 transition-all placeholder-gray-300"
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
    <main className="w-full max-w-lg mx-auto min-h-screen flex items-center justify-center ds-bg-0">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" />
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Memuat data...</p>
      </div>
    </main>
  );
});

// ── Main Page ─────────────────────────────────────────────────────────────────

// ── Seed user_patterns dari transaksi lama ────────────────────────────────────
async function seedUserPatterns(supabase, userId) {
  try {
    const stopWords = new Set(["beli", "bayar", "untuk", "ke", "di", "dari", "dan", "atau", "dengan", "yang", "nya", "ini", "itu"]);
    const { data: trxs } = await supabase
      .from("transactions").select("note, category")
      .eq("user_id", userId).not("note", "is", null).not("category", "is", null);
    const { data: cats } = await supabase
      .from("user_categories").select("id, name").eq("user_id", userId);
    if (!trxs?.length || !cats?.length) return;

    const catMap = Object.fromEntries(cats.map(c => [c.name.toLowerCase(), c.id]));
    // Hitung frekuensi per (phrase, category)
    const freqMap = {};
    // Hitung juga berapa kategori berbeda per phrase (untuk detect ambiguity)
    const phraseCatCount = {}; // phrase → Set of categoryIds

    for (const trx of trxs) {
      const catId = catMap[trx.category?.toLowerCase()];
      if (!catId) continue;
      const cleanNote = trx.note.toLowerCase().trim();
      const words = cleanNote.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
      const phrases = new Set([cleanNote, ...words]);
      for (let i = 0; i < words.length - 1; i++) phrases.add(words[i] + " " + words[i + 1]);
      for (const phrase of phrases) {
        const key = phrase + "__" + catId;
        freqMap[key] = (freqMap[key] || 0) + 1;
        if (!phraseCatCount[phrase]) phraseCatCount[phrase] = new Set();
        phraseCatCount[phrase].add(catId);
      }
    }

    // Hapus phrases yang ambiguous (pernah masuk >1 kategori)
    // kecuali jika salah satu kategori jauh lebih dominan (>= 3x lebih sering)
    for (const phrase of Object.keys(phraseCatCount)) {
      const cats = phraseCatCount[phrase];
      if (cats.size <= 1) continue; // konsisten, aman

      // Hitung total freq per category untuk phrase ini
      const catFreqs = {};
      for (const [key, freq] of Object.entries(freqMap)) {
        if (key.startsWith(phrase + "__")) {
          const catId = key.split("__").pop();
          catFreqs[catId] = freq;
        }
      }

      const sorted = Object.entries(catFreqs).sort((a, b) => b[1] - a[1]);
      const topFreq = sorted[0]?.[1] || 0;
      const secondFreq = sorted[1]?.[1] || 0;

      // Jika top tidak dominan (< 3x lebih sering dari runner-up) → hapus semua
      if (topFreq < secondFreq * 3) {
        for (const catId of cats) {
          delete freqMap[phrase + "__" + catId];
        }
      } else {
        // Top dominan → hapus yang non-top
        for (let i = 1; i < sorted.length; i++) {
          delete freqMap[phrase + "__" + sorted[i][0]];
        }
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
  } catch { }
}

export default function Home() {

  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = useAuth();
  const { sessionWarning, extendSession } = auth;

  // ── UI State ──────────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "home";
    const saved = sessionStorage.getItem("arta_last_tab");
    // Finance sub-page tidak boleh jadi landing saat refresh
    return saved && ["home", "stats", "finance", "more"].includes(saved) ? saved : "home";
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
  const [aiKeywords, setAiKeywords] = useState([]);
  const [userPatterns, setUserPatterns] = useState([]);
  const [isSmartLoading, setIsSmartLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  // ── Pagination display ───────────────────────────────────────────────────
  const [pageDisplayCount, setPageDisplayCount] = useState(15);
  const PAGE_SIZE_DISPLAY = 15;

  // ── Filter ────────────────────────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickTimeFilter, setQuickTimeFilter] = useState("month");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  // selectedMonth dihapus — tampilkan semua transaksi
  const [allBudgets, setAllBudgets] = useState([]);

  // ── Goals ─────────────────────────────────────────────────────────────────
  const [goals, setGoals] = useState([]);
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [newGoalData, setNewGoalData] = useState({ name: "", target: "", current: "" });
  const [isDirtyGoal, setIsDirtyGoal] = useState(false);
  const [goalDeleteModal, setGoalDeleteModal] = useState({ isOpen: false, goalId: null, goalName: "" });
  const [activeGoalInput, setActiveGoalInput] = useState(null);
  const [flexibleSavingsAmt, setFlexibleSavingsAmt] = useState("");

  // ── Modals ────────────────────────────────────────────────────────────────
  const [editTrxModal, setEditTrxModal] = useState({ isOpen: false, data: null });
  const [newWalletName, setNewWalletName] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [goalDeleteOpen, setGoalDeleteOpen] = useState(false);
  const [addUserModal, setAddUserModal] = useState({ isOpen: false, username: "", password: "", isLoading: false });

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
    window.scrollTo({ top: 0, behavior: "instant" }, []);
    document.querySelectorAll(".overflow-y-auto").forEach(el => { el.scrollTop = 0; });
    // Reset finance sub-page saat tap nav finance lagi
  }, [activeTab]);

  // Dark mode
  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add("dark");
      html.classList.remove("light-mode");
    } else {
      html.classList.remove("dark");
      html.classList.add("light-mode");
    }
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

      // Load + seed user_patterns v2
      const { count: ptCount } = await supabase
        .from("user_patterns").select("id", { count: "exact", head: true })
        .eq("user_id", uid);
      if ((ptCount || 0) === 0) {
        // Seed dari transaksi lama — background
        setTimeout(() => seedUserPatterns(supabase, uid), 1000);
      }
      const { data: ptData } = await supabase
        .from("user_patterns")
        .select("phrase, frequency, typical_amount, category_id, user_categories(id, name)")
        .eq("user_id", uid)
        .order("frequency", { ascending: false })
        .limit(300);
      if (ptData) setUserPatterns(ptData.map(p => ({
        phrase: p.phrase,
        category_id: p.category_id,
        name: p.user_categories?.name,
        frequency: p.frequency,
        typical_amount: p.typical_amount || null,
      })));
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

          const stopWords = new Set(["beli", "bayar", "untuk", "ke", "di", "dari", "dan", "atau", "dengan", "yang"]);
          const catMap = {};
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
            for (let i = 0; i < toInsert.length; i += 50) chunks.push(toInsert.slice(i, i + 50));
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
      try { setActiveWallet(JSON.parse(saved)); } catch { }
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
      const { data } = await supabase.from("budgets").select("*").eq("month_year", new Date().toISOString().slice(0, 7));
      if (data) setAllBudgets(data);
    };
    fetch();
  }, []);

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
  // transactionsThisMonth = semua transaksi (filter bulan dihapus)
  const transactionsThisMonth = allTransactions || [];

  const existingCategories = useMemo(() =>
    [...new Set((allTransactions || []).map(t => t.category).filter(Boolean))].sort(),
    [allTransactions]
  );

  const dynamicCategories = useMemo(() =>
    ["Semua", ...existingCategories],
    [existingCategories]
  );

  // Reset display count saat filter berubah
  useEffect(() => {
    setPageDisplayCount(PAGE_SIZE_DISPLAY);
  }, [typeFilter, categoryFilter, searchQuery, dateRange]);

  const allFilteredTransactions = useMemo(() => {
    return transactionsThisMonth.filter(t => {
      // Tipe
      const matchType = typeFilter === "all" ? true
        : typeFilter === "income" ? t.type === "income"
          : (t.type === "expense" || !t.type);

      // Kategori
      const matchCat = categoryFilter === "Semua" ? true : t.category === categoryFilter;

      // Search
      const sl = searchQuery.toLowerCase();
      const matchSearch = !searchQuery ||
        t.note.toLowerCase().includes(sl) ||
        t.category.toLowerCase().includes(sl);

      // Waktu — hanya date range custom
      let matchTime = true;
      if (t.created_at && dateRange.from && dateRange.to) {
        const trxDate = new Date(t.created_at);
        const from = new Date(dateRange.from);
        const to = new Date(dateRange.to);
        to.setHours(23, 59, 59, 999);
        matchTime = trxDate >= from && trxDate <= to;
      }

      return matchType && matchCat && matchSearch && matchTime;
    });
  }, [transactionsThisMonth, typeFilter, categoryFilter, searchQuery, dateRange]);

  // Slice untuk display — pagination di page level
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
    const stopWords = new Set(["beli", "bayar", "untuk", "ke", "di", "dari", "dan", "atau", "dengan", "yang", "nya", "ini", "itu"]);
    // Semua lowercase, bersih
    const words = note.toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 1 && !stopWords.has(w));

    // Score map: { categoryId: score }
    const scoreMap = {};
    for (const word of words) {
      for (const kw of aiKeywords) {
        if (!kw.keyword) continue;
        const kwLow = kw.keyword.toLowerCase(); // selalu lowercase
        const score = word === kwLow ? 3    // exact match
          : word.includes(kwLow) ? 2      // word contains keyword
            : kwLow.includes(word) && word.length > 2 ? 1 // keyword contains word
              : 0;
        if (score > 0) {
          scoreMap[kw.category_id] = (scoreMap[kw.category_id] || 0) +
            score * (kw.frequency || 1); // bobot frekuensi
        }
      }
    }

    // Pilih kategori dengan score tertinggi
    const best = Object.entries(scoreMap).sort((a, b) => b[1] - a[1])[0];
    if (!best) return null;
    const cat = userCategories.find(c => c.id === best[0]);
    if (!cat?.name) return null;
    // Title Case normalize
    return cat.name.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }, [aiKeywords, userCategories]);

  // ── Simpan keyword ke DB background ───────────────────────────────────────
  const learnKeyword = useCallback(async (note, categoryName) => {
    try {
      const stopWords = new Set(["beli", "bayar", "untuk", "ke", "di", "dari", "dan", "atau", "dengan", "yang", "nya", "ini", "itu"]);
      // Semua lowercase tanpa terkecuali
      const normalNote = note.toLowerCase().replace(/[^a-z0-9\s]/g, "");
      const words = normalNote.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
      // Kategori juga normalize: Title Case
      const normalCat = categoryName.trim().toLowerCase()
        .replace(/\w/g, c => c.toUpperCase());

      // Pastikan kategori ada — ilike agar tidak case sensitive
      let { data: catData } = await supabase
        .from("user_categories").select("id, name").ilike("name", normalCat).single();
      if (!catData) {
        const { data: newCat } = await supabase
          .from("user_categories")
          .insert([{ name: normalCat }])
          .select("id, name").single();
        catData = newCat;
      }
      if (!catData) return;

      // Upsert keyword — lowercase, update frekuensi
      for (const word of words) {
        // Cek apakah sudah ada
        const { data: existing } = await supabase
          .from("ai_keywords")
          .select("id, frequency")
          .eq("category_id", catData.id)
          .eq("keyword", word) // sudah lowercase
          .single();

        if (existing) {
          // Update frekuensi
          await supabase.from("ai_keywords")
            .update({ frequency: (existing.frequency || 1) + 1 })
            .eq("id", existing.id);
        } else {
          await supabase.from("ai_keywords")
            .insert([{ category_id: catData.id, keyword: word, frequency: 1 }]);
        }
      }

      // Refresh
      const { data: fresh } = await supabase.from("ai_keywords").select("*");
      if (fresh) setAiKeywords(fresh);
    } catch (err) {
      console.error("learnKeyword error:", err.message);
    }
  }, []);

  const handleSmartSubmit = useCallback(async (command, receiptFile = null, customDate = null) => {
    if (!command?.trim()) return;
    setIsSmartLoading(true);
    try {
      let raw = command.trim();
      let type = "expense";

      if (/^in\s+/i.test(raw)) { type = "income"; raw = raw.replace(/^in\s+/i, ""); }
      else if (/^out\s+/i.test(raw)) { raw = raw.replace(/^out\s+/i, ""); }

      // Smart tokenize — bebas urutan (rokok 25k ATAU 25k rokok)
      const { amount, note: parsedNote, date: parsedDate } = tokenizeInput(raw);
      let finalNote = parsedNote || raw;

      if (!amount || amount <= 0) {
        showNotification("Nominal tidak ditemukan. Cth: rokok 25k", "error");
        return;
      }

      let category = "Lainnya";
      let categoryId = null;

      // Manual pos override
      const posIdx = finalNote.toLowerCase().indexOf(" pos ");
      if (posIdx !== -1) {
        const catName = finalNote.slice(posIdx + 5).trim();
        finalNote = finalNote.slice(0, posIdx).trim();
        category = catName.replace(/\b\w/g, c => c.toUpperCase());
        categoryId = userCategories.find(c => c.name.toLowerCase() === category.toLowerCase())?.id;
      } else {
        // AI v2 — classifyFromPatterns (belajar dari habit user)
        const result = classifyFromPatterns(finalNote, userPatterns, userCategories);
        if (result.categoryName) {
          category = result.categoryName;
          categoryId = result.categoryId;
        } else {
          // Fallback legacy
          const legacy = classifyCategory(finalNote);
          if (legacy) {
            category = legacy;
            categoryId = userCategories.find(c => c.name.toLowerCase() === legacy.toLowerCase())?.id;
          }
        }
      }

      finalNote = finalNote.charAt(0).toUpperCase() + finalNote.slice(1);
      const dateToUse = customDate || (parsedDate ? parsedDate.toISOString() : null);

      await addTransaction(finalNote, amount, category, type, receiptFile, dateToUse);
      showNotification("Transaksi berhasil dicatat! ✨", "success");

      // Learn dari transaksi ini
      if (categoryId && activeWallet?.user_id) {
        const uid = activeWallet.user_id;
        setTimeout(async () => {
          await learnFromTransaction(supabase, uid, finalNote.toLowerCase(), categoryId, 1, amount);
          const { data } = await supabase
            .from("user_patterns")
            .select("phrase, frequency, typical_amount, category_id, user_categories(id, name)")
            .eq("user_id", uid).order("frequency", { ascending: false }).limit(300);
          if (data) setUserPatterns(data.map(p => ({
            phrase: p.phrase, category_id: p.category_id,
            name: p.user_categories?.name, frequency: p.frequency,
            typical_amount: p.typical_amount || null,
          })));
        }, 300);
      }
    } catch (err) {
      showNotification("Gagal: " + err.message, "error");
    } finally {
      setIsSmartLoading(false);
    }
  }, [classifyCategory, classifyFromPatterns, learnFromTransaction, tokenizeInput,
    addTransaction, showNotification, userPatterns, userCategories, activeWallet]);

  const handleAddGoal = useCallback(async e => {
    e.preventDefault();
    if (!newGoalData.name.trim() || !newGoalData.target) return;
    const { data, error } = await supabase
      .from("savings_goals")
      .insert([{
        name: newGoalData.name,
        target_amount: parseFlexibleNumber(newGoalData.target),
        current_amount: parseFlexibleNumber(newGoalData.current),
      }])
      .select();
    if (!error && data) {
      setGoals(p => [...p, data[0]]);
      setIsNewGoalOpen(false);
      setNewGoalData({ name: "", target: "", current: "" }); setIsDirtyGoal(false);
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
      const res = await fetch("/api/admin/add-user", {
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
  const appClass = `min-h-screen${isDarkMode ? "" : " light-mode"}`;

  // ── Render guards ─────────────────────────────────────────────────────────
  // Loading — saat init session, jangan tampilkan login screen
  if (auth.isAuthLoading && !auth.session) {
    return (
      <div className={appClass}>
        <main className="w-full max-w-lg mx-auto min-h-screen flex flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-light tracking-[-1px]" style={{ color: "var(--text-1)" }}>ArtaKita.</h1>
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (!auth.session) return <div className={appClass}><LoginScreen auth={auth} /></div>;

  // Tunggu role check selesai
  if (isRoleLoading) return <div className={appClass}><WalletLoader /></div>;

  // Admin → SELALU ke halaman User Management, tidak pernah ke app utama
  if (isAdmin) {
    return (
      <div className={appClass}>
        <main className="w-full max-w-lg mx-auto relative min-h-screen ds-bg-0">
          <Toast isOpen={notification.isOpen} message={notification.message} type={notification.type} />
          <div className="pt-8 px-3 pb-8">
            {/* Header + Logout kanan atas */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black ds-t1 tracking-tight">
                Manajemen Pengguna
              </h2>
              <button
                onClick={auth.handleLogout}
                className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-red-500/20 active:scale-95 transition-all"
              >
                Keluar
              </button>
            </div>
            <UserManagement onNotify={showNotification} />
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
            <div className="w-full p-8 rounded-[32px] text-center" style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}>
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><rect width="20" height="14" x="2" y="5" rx="2" /><path d="M2 10h20" /></svg>
              </div>
              <h2 className="text-xl font-light tracking-tight mb-2" style={{ color: "var(--text-1)" }}>
                Buat Rekening Pertama
              </h2>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--text-2)" }}>
                Selamat datang! Buat rekening untuk mulai mencatat keuangan kamu.
              </p>
              <form onSubmit={handleCreateWallet} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Nama rekening (Cth: BSI Ihsan)"
                  value={newWalletName}
                  onChange={e => setNewWalletName(e.target.value)}
                  className="w-full ds-bg-0 border ds-border rounded-2xl py-3.5 px-4 text-sm font-bold ds-t1 outline-none focus:border-blue-500 transition-all placeholder-gray-400"
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
      <main className="w-full max-w-lg mx-auto relative min-h-screen overflow-x-hidden ds-bg-0">

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
              hasMore={pageHasMore}
              loadMore={pageLoadMore}
              totalCount={allFilteredTransactions.length}
              isLoading={isLoading}
              isOnline={isOnline}
              pendingCount={pendingCount}
              isSyncing={isSyncing}
              onEditTransaction={async (updatedTrx) => {
                // Panggil supabase update di sini
                // await supabase.from('transactions').update({ note: updatedTrx.note, amount: updatedTrx.amount, category: updatedTrx.category }).eq('id', updatedTrx.id);
                // fetchAll(); // Refresh data
                showNotification("Transaksi diperbarui!", "success");
              }}
              onDeleteTransaction={trx => handleConfirmDelete(trx.id)}
            />
          )}

          {activeTab === "stats" && (
            <StatsTab
              key="stats"
              filteredTransactions={transactionsThisMonth}
              transactions={allTransactions}
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
              setNewGoalData={d => { setNewGoalData(d); setIsDirtyGoal(true); }}
              isDirtyGoal={isDirtyGoal}
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

        <nav className="fixed bottom-0 left-0 right-0 z-[9999] ds-nav pb-safe">
          <div className="w-full max-w-lg mx-auto flex items-center px-1 pt-1 pb-1" style={{ height: 64 }}>

            {/* Left 2 nav items */}
            {NAV_ITEMS.slice(0, 2).map(({ id, label, Icon }) => {
              const isActive = activeTab === id;
              return (
                <motion.button key={id}
                  onClick={() => setActiveTab(id)}
                  whileTap={{ scale: 0.88 }}
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full outline-none"
                  style={{ WebkitTapHighlightColor: "transparent" }}>
                  {isActive && (
                    <motion.div layoutId="navActive"
                      className="absolute w-12 h-9 rounded-2xl"
                      style={{ background: "color-mix(in srgb,var(--a1) 10%,transparent)" }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                  )}
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.6}
                    className="relative z-10"
                    style={{ color: isActive ? "var(--a1)" : "var(--text-3)" }} />
                  <span className="text-[8px] font-black uppercase tracking-widest relative z-10"
                    style={{ color: isActive ? "var(--a1)" : "var(--text-3)" }}>
                    {label}
                  </span>
                </motion.button>
              );
            })}

            {/* Center: QCB FAB */}
            <div className="flex items-center justify-center flex-1">
              {auth.session && mounted && <QuickCommandBar
                onProcessTransaction={handleSmartSubmit}
                userPatterns={userPatterns}
                isSmartLoading={isSmartLoading}
                aiKeywords={aiKeywords}
                userCategories={userCategories}
                session={auth.session}
              />}
            </div>

            {/* Right 2 nav items */}
            {NAV_ITEMS.slice(2).map(({ id, label, Icon }) => {
              const isActive = activeTab === id;
              return (
                <motion.button key={id}
                  onClick={() => {
                    if (id === "finance") handleFinanceTabClick();
                    else setActiveTab(id);
                  }}
                  whileTap={{ scale: 0.88 }}
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full outline-none"
                  style={{ WebkitTapHighlightColor: "transparent" }}>
                  {isActive && (
                    <motion.div layoutId="navActive"
                      className="absolute w-12 h-9 rounded-2xl"
                      style={{ background: "color-mix(in srgb,var(--a1) 10%,transparent)" }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                  )}
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.6}
                    className="relative z-10"
                    style={{ color: isActive ? "var(--a1)" : "var(--text-3)" }} />
                  <span className="text-[8px] font-black uppercase tracking-widest relative z-10"
                    style={{ color: isActive ? "var(--a1)" : "var(--text-3)" }}>
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
