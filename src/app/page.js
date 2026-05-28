"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home as HomeIcon, Landmark, Settings,
  CreditCard, X
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// Hooks
import { useAuth }     from "@/hooks/useAuth";
import { useFinData }  from "@/hooks/useFinData";
import { useWallets }  from "@/hooks/useWallets";

// Shared utils
import { parseFlexibleNumber, getRecentMonths } from "@/lib/utils";

// Tab components
import HomeTab      from "@/components/tabs/HomeTab";
import AnalyticsTab from "@/components/tabs/AnalyticsTab";
import WalletsTab   from "@/components/tabs/WalletsTab";
import SettingsTab  from "@/components/tabs/SettingsTab";

// Modal components
import EditTrxModal      from "@/components/modals/EditTrxModal";
import NewWalletModal    from "@/components/modals/NewWalletModal";
import AddUserModal      from "@/components/modals/AddUserModal";
import ForcePasswordModal from "@/components/modals/ForcePasswordModal";

// Shared components
import Toast        from "@/components/Toast";
import DeleteModal  from "@/components/DeleteModal";
import FinanceTab     from "@/components/tabs/FinanceTab";
import MoreDrawer     from "@/components/MoreDrawer";
import WalletSwitcher from "@/components/WalletSwitcher";
import EditWalletModal from "@/components/EditWalletModal";
import ShareWallet  from "@/components/ShareWallet";
import QuickCommandBar from "@/components/QuickCommandBar";

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ auth }) {
  return (
    <main className="w-full max-w-lg mx-auto min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white dark:bg-[#121827] p-8 rounded-[32px] shadow-2xl border border-gray-100 dark:border-gray-800"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">ArtaKita.</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Artaku Artamu</p>
        </div>

        <form onSubmit={auth.handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
              Username / Email
            </label>
            <input
              type="text" required
              value={auth.authUsername}
              onChange={(e) => auth.setAuthUsername(e.target.value)}
              placeholder="Masukkan username atau email"
              className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
              Password
            </label>
            <input
              type="password" required
              value={auth.authPassword}
              onChange={(e) => auth.setAuthPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all"
            />
          </div>

          {auth.authError && (
            <p className="text-xs font-bold text-red-500 text-center bg-red-500/10 py-2 rounded-xl">
              {auth.authError}
            </p>
          )}

          <button
            type="submit"
            disabled={auth.isAuthLoading || auth.isLocked}
            className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50"
          >
            {auth.isAuthLoading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}

// ── Loading wallet screen ─────────────────────────────────────────────────────
function WalletLoader() {
  return (
    <main className="w-full max-w-lg mx-auto min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Memuat data...</p>
      </div>
    </main>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {

  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = useAuth();

  // ── UI State ──────────────────────────────────────────────────────────────
  const [mounted, setMounted]         = useState(false);
  const [isDarkMode, setIsDarkMode]   = useState(true);
  const [activeTab, setActiveTab]       = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('arta_last_tab') || 'home' : 'home'));
  const [financeSubTab, setFinanceSubTab] = useState("debts"); // "debts" | "recurring"
  const [recentMonths]                = useState(getRecentMonths);
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date().toISOString().slice(0, 7)
  );

  // ── Wallet State ──────────────────────────────────────────────────────────
  const { wallets, addWallet }        = useWallets();
  const [activeWallet, setActiveWallet] = useState(null);

  // ── Financial Data (realtime) ─────────────────────────────────────────────
  const {
    balance, transactions,
    addTransaction, deleteTransaction, updateTransaction,
    hasMore, loadMore, isLoading,
    isOnline, isSyncing, pendingCount,
    refetch,
  } = useFinData(activeWallet?.id ?? null);

  // ── AI Brain ──────────────────────────────────────────────────────────────
  const [userCategories, setUserCategories] = useState([]);
  const [aiKeywords, setAiKeywords]         = useState([]);
  const [isSmartLoading, setIsSmartLoading] = useState(false);
  const [isAdmin, setIsAdmin]                 = useState(false);
  const [isMoreOpen, setIsMoreOpen]           = useState(false);

  // ── Filter State ──────────────────────────────────────────────────────────
  const [typeFilter, setTypeFilter]         = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [searchQuery, setSearchQuery]       = useState("");
  const [quickTimeFilter, setQuickTimeFilter] = useState("month");
  const [allBudgets, setAllBudgets]         = useState([]);

  // ── Goals State ───────────────────────────────────────────────────────────
  const [goals, setGoals]                   = useState([]);
  const [isNewGoalOpen, setIsNewGoalOpen]   = useState(false);
  const [newGoalData, setNewGoalData]       = useState({ name: "", target: "", current: "" });
  const [goalDeleteModal, setGoalDeleteModal] = useState({ isOpen: false, goalId: null, goalName: "" });
  const [activeGoalInput, setActiveGoalInput] = useState(null);
  const [flexibleSavingsAmount, setFlexibleSavingsAmount] = useState("");

  // ── Modal State ───────────────────────────────────────────────────────────
  const [editTrxModal, setEditTrxModal]     = useState({ isOpen: false, data: null });
  const [newWalletName, setNewWalletName]   = useState("");
  const [isNewWalletOpen, setIsNewWalletOpen] = useState(false);
  const [isEditWalletOpen, setIsEditWalletOpen] = useState(false);
  const [walletToEdit, setWalletToEdit]     = useState(null);
  const [isShareWalletOpen, setIsShareWalletOpen] = useState(false);
  const [walletToShare, setWalletToShare]   = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete]     = useState(null);
  const [addUserModal, setAddUserModal]     = useState({ isOpen: false, username: "", password: "", isLoading: false });

  // ── Notification ──────────────────────────────────────────────────────────
  const [notification, setNotification]     = useState({ isOpen: false, message: "", type: "error" });

  const showNotification = useCallback((message, type = "error") => {
    setNotification({ isOpen: true, message, type });
    setTimeout(() => setNotification({ isOpen: false, message: "", type: "error" }), 4000);
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { setMounted(true); }, []);

  // Persist tab aktif ke sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') sessionStorage.setItem('arta_last_tab', activeTab);
  }, [activeTab]);

  // Reset scroll ke atas setiap kali pindah tab
  useEffect(() => {
    // Cari semua element yang bisa scroll dan reset ke atas
    window.scrollTo({ top: 0, behavior: "instant" });
    // Reset scroll di dalam tab container juga
    document.querySelectorAll(".overflow-y-auto").forEach(el => {
      el.scrollTop = 0;
    });
  }, [activeTab]);

  // Dark mode: apply to html element
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // AI Brain + role fetch
  useEffect(() => {
    if (!auth.session?.user?.id) return;
    const userId = auth.session.user.id;

    const fetchAiBrain = async () => {
      const { data: cats } = await supabase.from("user_categories").select("*").order("name", { ascending: true });
      const { data: keys } = await supabase.from("ai_keywords").select("*").eq("user_id", userId);
      if (cats) setUserCategories(cats);
      if (keys) setAiKeywords(keys);
    };

    const fetchRole = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (data?.role === "admin") setIsAdmin(true);
    };

    fetchAiBrain();
    fetchRole();
  }, [auth.session]);

  // Active wallet — baca localStorage, tidak tunggu wallets dari DB
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("arta_active_wallet");
    if (saved) setActiveWallet(JSON.parse(saved));
  }, []);

  // Fallback: jika localStorage kosong, pakai wallet pertama
  useEffect(() => {
    if (activeWallet || wallets.length === 0) return;
    const first = { id: wallets[0].id, name: wallets[0].name };
    setActiveWallet(first);
    localStorage.setItem("arta_active_wallet", JSON.stringify(first));
  }, [wallets, activeWallet]);

  // Persist wallet changes
  useEffect(() => {
    if (!activeWallet) return;
    localStorage.setItem("arta_active_wallet", JSON.stringify(activeWallet));
  }, [activeWallet]);

  // Fetch budgets
  useEffect(() => {
    const fetchBudgets = async () => {
      const { data } = await supabase.from("budgets").select("*").eq("month_year", selectedMonth);
      if (data) setAllBudgets(data);
    };
    fetchBudgets();
  }, [selectedMonth]);

  // Fetch goals
  useEffect(() => {
    const fetchGoals = async () => {
      const { data } = await supabase.from("savings_goals").select("*").order("created_at", { ascending: true });
      if (data) setGoals(data);
    };
    fetchGoals();
  }, [activeTab]);

  // ── Derived Data — useMemo agar tidak recalculate setiap render ─────────
  const transactionsThisMonth = useMemo(() =>
    transactions.filter(t => t.created_at?.startsWith(selectedMonth)),
    [transactions, selectedMonth]
  );

  const existingCategories = useMemo(() =>
    [...new Set(transactionsThisMonth.map(t => t.category))],
    [transactionsThisMonth]
  );

  const dynamicCategories = useMemo(() =>
    ["Semua", ...existingCategories],
    [existingCategories]
  );

  const filteredTransactions = useMemo(() => {
    return transactionsThisMonth.filter((t) => {
      const matchType = typeFilter === "all" ? true
        : typeFilter === "income" ? t.type === "income"
        : (t.type === "expense" || !t.type);
      const matchCat    = categoryFilter === "Semua" ? true : t.category === categoryFilter;
      const searchLow   = searchQuery.toLowerCase();
      const matchSearch = searchQuery === "" ||
        t.note.toLowerCase().includes(searchLow) ||
        t.category.toLowerCase().includes(searchLow);
      let matchTime = true;
      if (quickTimeFilter !== "month" && t.created_at) {
        const trxDate = new Date(t.created_at);
        const today   = new Date();
        if (quickTimeFilter === "today") {
          matchTime = trxDate.toDateString() === today.toDateString();
        } else if (quickTimeFilter === "week") {
          const pastWeek = new Date(today);
          pastWeek.setDate(today.getDate() - 7);
          matchTime = trxDate >= pastWeek && trxDate <= today;
        }
      }
      return matchType && matchCat && matchSearch && matchTime;
    });
  }, [transactionsThisMonth, typeFilter, categoryFilter, searchQuery, quickTimeFilter]);

  const filteredIncome  = useMemo(() =>
    filteredTransactions.filter(t => t.type === "income").reduce((a, c) => a + Number(c.amount), 0),
    [filteredTransactions]
  );
  const filteredExpense = useMemo(() =>
    filteredTransactions.filter(t => t.type === "expense" || !t.type).reduce((a, c) => a + Number(c.amount), 0),
    [filteredTransactions]
  );

  // ── Functions ─────────────────────────────────────────────────────────────

  const exportToCSV = useCallback(() => {
    if (!transactions?.length) {
      showNotification("Tidak ada data transaksi untuk diekspor.", "error");
      return;
    }
    const headers = ["Tanggal", "Waktu", "Catatan", "Kategori", "Jenis", "Nominal (Rp)"];
    const rows = transactions.map((trx) => {
      const d       = new Date(trx.created_at);
      const tanggal = d.toLocaleDateString("id-ID", { year: "numeric", month: "2-digit", day: "2-digit" });
      const waktu   = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const catatan = `"${trx.note.replace(/"/g, '""')}"`;
      const jenis   = trx.type === "income" ? "Pemasukan" : "Pengeluaran";
      return [tanggal, waktu, catatan, trx.category, jenis, trx.amount];
    });
    const csv  = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_ArtaKita_${new Date().toLocaleDateString("id-ID").replace(/\//g, "-")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [transactions]);

  const handleCreateWallet = useCallback(async (e) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;
    try {
      const result = await addWallet(newWalletName);
      if (result) {
        setIsNewWalletOpen(false);
        setNewWalletName("");
        setActiveWallet({ id: result.id, name: result.name });
        setActiveTab("home");
      }
    } catch (err) {
      showNotification("Gagal membuat rekening: " + err.message, "error");
    }
  }, [addWallet, newWalletName, showNotification]);

  const handleSaveTrxEdit = useCallback(async (e) => {
    e.preventDefault();
    const d = editTrxModal.data;
    if (!d?.note || !d?.amount || !d?.category) return;
    try {
      await updateTransaction(d.id, d.note, d.category, d.amount);
      setEditTrxModal((prev) => ({ ...prev, isOpen: false }));
      showNotification("Transaksi berhasil diubah!", "success");
    } catch (err) {
      showNotification("Gagal mengubah: " + err.message, "error");
    }
  }, [editTrxModal, updateTransaction, showNotification]);

  const handleSmartSubmit = async (command) => {
    if (!command.trim()) return;
    setIsSmartLoading(true);
    try {
      const cleanText      = command.toLowerCase().trim();
      let type             = "expense"; // Default = expense
      let textWithoutType  = cleanText;
      // Hanya "in" yang perlu prefix — semua lainnya otomatis expense
      if (cleanText.startsWith("in ")) { type = "income"; textWithoutType = cleanText.substring(3).trim(); }
      else if (cleanText.startsWith("out ")) { textWithoutType = cleanText.substring(4).trim(); } // opsional, tetap expense

      const regexNominal = /^(\d+(?:[.,]\d+)?(?:k|rb|ribu|m|jt|juta)?)\s+(.+)$/i;
      const matchNominal = textWithoutType.match(regexNominal);
      if (!matchNominal) {
        showNotification("Format salah! Gunakan: [in/out] [angka] [catatan]", "error");
        return;
      }

      const amount       = parseFlexibleNumber(matchNominal[1]);
      let rawNote        = matchNominal[2].trim();
      let categoryName   = "Lainnya";
      let finalNote      = rawNote;

      if (rawNote.includes(" pos ")) {
        const parts          = rawNote.split(" pos ");
        finalNote            = parts[0].trim();
        const targetCategory = parts[1].trim();
        if (targetCategory && finalNote) {
          categoryName      = targetCategory.charAt(0).toUpperCase() + targetCategory.slice(1);
          const coreKeyword = finalNote.replace(/(beli|bayar|untuk)\s*/g, "").trim();
          setTimeout(async () => {
            try {
              let { data: catData } = await supabase.from("user_categories").select("id").eq("name", categoryName).single();
              if (!catData) {
                const { data: newCat } = await supabase.from("user_categories").insert([{ name: categoryName }]).select("id").single();
                catData = newCat;
              }
              if (catData) {
                await supabase.from("ai_keywords").insert([{ category_id: catData.id, keyword: coreKeyword }]);
              }
            } catch { /* kata kunci sudah ada */ }
          }, 500);
        }
      } else {
        const coreWords = rawNote.replace(/(beli|bayar|untuk)\s*/g, "").trim().split(" ");
        const matchKey  = aiKeywords.find((k) => coreWords.includes(k.keyword));
        if (matchKey) {
          const matchCat = userCategories.find((c) => c.id === matchKey.category_id);
          if (matchCat) categoryName = matchCat.name;
        }
      }

      finalNote = finalNote.charAt(0).toUpperCase() + finalNote.slice(1);
      await addTransaction(finalNote, amount, categoryName, type);
      showNotification("Transaksi berhasil dicatat! ✨", "success");
    } catch (error) {
      showNotification("Gagal: " + error.message, "error");
    } finally {
      setIsSmartLoading(false);
    }
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!newGoalData.name.trim() || !newGoalData.target) return;
    const parsedTarget  = parseFlexibleNumber(newGoalData.target);
    const parsedCurrent = parseFlexibleNumber(newGoalData.current);
    const { data, error } = await supabase
      .from("savings_goals")
      .insert([{ name: newGoalData.name, target_amount: parsedTarget, current_amount: parsedCurrent }])
      .select();
    if (!error && data) {
      setGoals((prev) => [...prev, data[0]]);
      setIsNewGoalOpen(false);
      setNewGoalData({ name: "", target: "", current: "" });
    }
  };

  const handleModifySavings = async (id, currentAmt, mode) => {
    let nextAmt = 0;
    if (mode === "reset") {
      nextAmt = 0;
    } else {
      const parsed = parseFlexibleNumber(flexibleSavingsAmount);
      if (parsed <= 0) { showNotification("Masukkan nominal yang valid (Contoh: 10k, 500k, 1jt)", "error"); return; }
      nextAmt = mode === "add" ? Number(currentAmt) + parsed : Number(currentAmt) - parsed;
      if (nextAmt < 0) nextAmt = 0;
    }
    const { error } = await supabase.from("savings_goals").update({ current_amount: nextAmt }).eq("id", id);
    if (!error) {
      setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, current_amount: nextAmt } : g)));
      setFlexibleSavingsAmount("");
      setActiveGoalInput(null);
    }
  };

  const triggerDeleteGoal = useCallback((id, name) => {
    setGoalDeleteModal({ isOpen: true, goalId: id, goalName: name });
  }, []);

  const executeDeleteGoal = async () => {
    if (goalDeleteModal.goalId) {
      await supabase.from("savings_goals").delete().eq("id", goalDeleteModal.goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalDeleteModal.goalId));
    }
    setGoalDeleteModal({ isOpen: false, goalId: null, goalName: "" });
  };

  const handleCreateNewUser = async (e) => {
    e.preventDefault();
    setAddUserModal((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await fetch("/api/admin/add-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: addUserModal.username, password: addUserModal.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showNotification(`Akses untuk ${addUserModal.username} berhasil dibuat!`, "success");
      setAddUserModal({ isOpen: false, username: "", password: "", isLoading: false });
    } catch (err) {
      showNotification("Gagal: " + err.message, "error");
      setAddUserModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const appClass = `min-h-screen transition-colors duration-300 ${isDarkMode ? "dark bg-[#0a0f1c]" : "bg-gray-50"}`;

  if (!auth.session) {
    return (
      <div className={appClass}>
        <LoginScreen auth={auth} />
      </div>
    );
  }

  if (!activeWallet) {
    return (
      <div className={appClass}>
        <WalletLoader />
      </div>
    );
  }

  return (
    <div className={appClass}>
      <main className="w-full max-w-lg mx-auto relative min-h-screen overflow-x-hidden bg-white dark:bg-black">

        {/* ── Toast ── */}
        <Toast isOpen={notification.isOpen} message={notification.message} type={notification.type} />

        {/* ── Force password modal ── */}
        <ForcePasswordModal
          isOpen={auth.forcePasswordModal.isOpen}
          newPassword={auth.forcePasswordModal.newPassword}
          setNewPassword={(val) => auth.setForcePasswordModal((p) => ({ ...p, newPassword: val }))}
          onSubmit={auth.handleForceChangePassword}
          isLoading={auth.isAuthLoading}
          error={auth.authError}
        />

        {/* ── Add user modal ── */}
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
              activeWallet={activeWallet}
              balance={balance}
              filteredIncome={filteredIncome} filteredExpense={filteredExpense}
              typeFilter={typeFilter} setTypeFilter={setTypeFilter}
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
              dynamicCategories={dynamicCategories}
              quickTimeFilter={quickTimeFilter} setQuickTimeFilter={setQuickTimeFilter}
              selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
              recentMonths={recentMonths}
              filteredTransactions={filteredTransactions}
              transactions={transactions}
              mounted={mounted}
              allBudgets={allBudgets}
              transactionsThisMonth={transactionsThisMonth}
              onEditTransaction={(trx) => setEditTrxModal({ isOpen: true, data: { ...trx } })}
              onDeleteTransaction={(trx) => { setItemToDelete(trx); setIsDeleteModalOpen(true); }}
              hasMore={hasMore}
              loadMore={loadMore}
              isLoading={isLoading}
              isOnline={isOnline}
              pendingCount={pendingCount}
              isSyncing={isSyncing}
              wallets={wallets}
              session={auth.session}
              onSwitchWallet={(w) => { setActiveWallet(w); }}
            />
          )}

          {activeTab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[90] bg-white dark:bg-black overflow-y-auto no-scrollbar"
            >
              <div className="w-full max-w-lg mx-auto">
                <div className="flex items-center gap-3 pt-8 px-3 pb-0">
                  <button
                    onClick={() => setActiveTab('home')}
                    className="p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-90"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                  </button>
                </div>
                <AnalyticsTab
                  filteredTransactions={filteredTransactions}
                  transactions={transactionsThisMonth}
                  selectedMonth={selectedMonth}
                  balance={balance}
                />
              </div>
            </motion.div>
          )}

          {activeTab === "wallets" && (
            <WalletsTab
              key="wallets"
              wallets={wallets} activeWallet={activeWallet}
              setActiveWallet={setActiveWallet} setActiveTab={setActiveTab}
              session={auth.session}
              onBack={() => setActiveTab("settings")}
              onEditWallet={(w) => { setWalletToEdit(w); setIsEditWalletOpen(true); }}
              onShareWallet={(w) => { setWalletToShare(w); setIsShareWalletOpen(true); }}
              onNewWallet={() => setIsNewWalletOpen(true)}
              goals={goals}
              isNewGoalOpen={isNewGoalOpen} setIsNewGoalOpen={setIsNewGoalOpen}
              newGoalData={newGoalData} setNewGoalData={setNewGoalData}
              handleAddGoal={handleAddGoal}
              activeGoalInput={activeGoalInput} setActiveGoalInput={setActiveGoalInput}
              flexibleSavingsAmount={flexibleSavingsAmount} setFlexibleSavingsAmount={setFlexibleSavingsAmount}
              handleModifySavings={handleModifySavings}
              triggerDeleteGoal={triggerDeleteGoal}
            />
          )}

          {activeTab === "finance" && (
            <FinanceTab
              key="finance"
              activeWallet={activeWallet}
              balance={balance}
              onNotify={showNotification}
            />
          )}

          {activeTab === "settings" && (
            <SettingsTab
              key="settings"
              exportToCSV={exportToCSV}
              handleLogout={auth.handleLogout}
              isAdmin={isAdmin}
              onNotify={showNotification}
              onManageWallets={() => setActiveTab("wallets")}
            />
          )}

          {activeTab === "wallets" && (
            <WalletsTab
              key="wallets"
              wallets={wallets} activeWallet={activeWallet}
              setActiveWallet={setActiveWallet} setActiveTab={setActiveTab}
              session={auth.session}
              onBack={() => setActiveTab("settings")}
              onEditWallet={(w) => { setWalletToEdit(w); setIsEditWalletOpen(true); }}
              onShareWallet={(w) => { setWalletToShare(w); setIsShareWalletOpen(true); }}
              onNewWallet={() => setIsNewWalletOpen(true)}
              goals={goals}
              isNewGoalOpen={isNewGoalOpen} setIsNewGoalOpen={setIsNewGoalOpen}
              newGoalData={newGoalData} setNewGoalData={setNewGoalData}
              handleAddGoal={handleAddGoal}
              activeGoalInput={activeGoalInput} setActiveGoalInput={setActiveGoalInput}
              flexibleSavingsAmount={flexibleSavingsAmount} setFlexibleSavingsAmount={setFlexibleSavingsAmount}
              handleModifySavings={handleModifySavings}
              triggerDeleteGoal={triggerDeleteGoal}
            />
          )}
        </AnimatePresence>

        {/* ── More Drawer ── */}
        <MoreDrawer
          isOpen={isMoreOpen}
          onClose={() => setIsMoreOpen(false)}
          onNavigate={(tab) => {
            if (tab === "adduser") {
              setAddUserModal({ isOpen: true, username: "", password: "", isLoading: false });
            } else {
              setActiveTab(tab);
            }
            setIsMoreOpen(false);
          }}
          isAdmin={isAdmin}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          exportToCSV={exportToCSV}
          handleLogout={auth.handleLogout}
        />

        {/* ── QuickCommandBar ── */}
        {activeTab === "home" && (
          <QuickCommandBar
            onProcessTransaction={handleSmartSubmit}
            isSmartLoading={isSmartLoading}
          />
        )}

        {/* ── Edit Transaction Modal ── */}
        <EditTrxModal
          isOpen={editTrxModal.isOpen}
          data={editTrxModal.data}
          setData={(data) => setEditTrxModal((p) => ({ ...p, data }))}
          onSubmit={handleSaveTrxEdit}
          onClose={() => setEditTrxModal((p) => ({ ...p, isOpen: false }))}
          existingCategories={existingCategories}
        />

        {/* ── New Wallet Modal ── */}
        <NewWalletModal
          isOpen={isNewWalletOpen}
          name={newWalletName}
          setName={setNewWalletName}
          onSubmit={handleCreateWallet}
          onClose={() => { setIsNewWalletOpen(false); setNewWalletName(""); }}
        />

        {/* ── Edit Wallet Modal ── */}
        <AnimatePresence>
          {isEditWalletOpen && (
            <EditWalletModal
              wallet={walletToEdit}
              onClose={() => setIsEditWalletOpen(false)}
              onRefresh={() => window.location.reload()}
            />
          )}
        </AnimatePresence>

        {/* ── Share Wallet Modal ── */}
        <AnimatePresence>
          {isShareWalletOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl relative overflow-hidden border border-gray-100 dark:border-gray-800"
              >
                <button onClick={() => setIsShareWalletOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors">
                  <X size={16} />
                </button>
                <ShareWallet
                  walletId={walletToShare?.id}
                  onClose={() => setIsShareWalletOpen(false)}
                  onSuccess={(msg) => { setIsShareWalletOpen(false); showNotification(msg, "success"); }}
                  onError={(msg) => showNotification(msg, "error")}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Delete Transaction Modal ── */}
        <DeleteModal
          isOpen={isDeleteModalOpen}
          title="Hapus Transaksi?"
          message="Tindakan ini permanen dan tidak dapat dibatalkan. Apakah Anda yakin?"
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
          title="Hapus Impian Anda?"
          message={
            <>Target <strong>"{goalDeleteModal.goalName}"</strong> beserta seluruh progres tabungannya akan dihapus permanen.</>
          }
          confirmLabel="Hapus Impian"
          onConfirm={executeDeleteGoal}
          onCancel={() => setGoalDeleteModal({ isOpen: false, goalId: null, goalName: "" })}
        />

        {/* ── Bottom Navigation — 5 tab, centered, compact ── */}
        <nav className="fixed bottom-0 left-0 right-0 z-[9999] bg-white/80 dark:bg-[#0a0f1c]/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 pb-safe">
          <div className="w-full max-w-lg mx-auto flex justify-center items-center px-4 py-3 gap-2">
            {[
              { id: "home",    label: "Home",    Icon: HomeIcon },
              { id: "finance", label: "Finance", Icon: Landmark },
              { id: "more",    label: "More",    Icon: Settings },
            ].map(({ id, label, Icon }) => {
              const isActive = id === "more" ? isMoreOpen : activeTab === id;
              const handleClick = id === "more"
                ? () => setIsMoreOpen(true)
                : () => setActiveTab(id);
              return (
                <motion.button
                  key={id}
                  onClick={handleClick}
                  whileTap={{ scale: 0.9 }}
                  animate={{ y: isActive ? -4 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="flex flex-col items-center gap-1 relative flex-1 max-w-[64px]"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  {/* Active pill background */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="navPill"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-10 bg-blue-500/10 rounded-2xl -z-10"
                      />
                    )}
                  </AnimatePresence>
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={`transition-all duration-300 ${
                      isActive ? "text-blue-500" : "text-gray-400 dark:text-gray-600"
                    }`}
                  />
                  <span className={`text-[8px] font-black uppercase tracking-widest transition-colors duration-300 ${
                    isActive ? "text-blue-500" : "text-gray-400 dark:text-gray-600"
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
