"use client";
import { memo, useState, useCallback, useRef, useEffect } from "react";

// Signed URL cache — tidak fetch ulang jika sudah ada
const signedUrlCache = {};

async function getSignedUrl(path) {
  if (!path) return null;
  // Jika sudah punya signed URL yang valid, pakai langsung
  if (signedUrlCache[path] && signedUrlCache[path].exp > Date.now()) {
    return signedUrlCache[path].url;
  }
  try {
    // Extract path dari full URL jika perlu
    const storagePath = path.includes('/object/') 
      ? path.split('/object/').pop().replace(/^(sign|public)\/artakita_bucket\//, '')
      : path;
    const { data, error } = await supabase.storage
      .from('artakita_bucket')
      .createSignedUrl(storagePath, 3600); // 1 jam
    if (error || !data?.signedUrl) return null;
    signedUrlCache[path] = { url: data.signedUrl, exp: Date.now() + 3500000 };
    return data.signedUrl;
  } catch { return null; }
}
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Sun, Wallet,
  ArrowUpCircle, ArrowDownCircle,
  Coffee, ShoppingBag, Receipt, Layers,
  Edit3, Trash2, Eye, EyeOff, Loader2,
  SlidersHorizontal, X, ChevronDown, Camera, Image
} from "lucide-react";
import PhotoViewer   from "@/components/PhotoViewer";
import BudgetAlert   from "@/components/BudgetAlert";
import { formatDateTime, fmt } from "@/lib/utils";
import { HOME } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient";
import { uploadPhoto } from "@/lib/imageUtils";

const getCatIcon = (cat) => {
  switch (cat) {
    case "Makan":   return <Coffee  size={17} />;
    case "Belanja": return <ShoppingBag size={17} />;
    case "Tagihan": return <Receipt size={17} />;
    default:        return <Layers  size={17} />;
  }
};

const Skeleton = () => (
  <div className="flex items-center justify-between p-4 rounded-[22px] bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800/40 mb-2.5 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-2xl bg-gray-200 dark:bg-gray-800" />
      <div className="space-y-2">
        <div className="h-3 w-28 bg-gray-200 dark:bg-gray-800 rounded-full" />
        <div className="h-2 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
      </div>
    </div>
    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" />
  </div>
);

// ── Collapsed Search+Filter Bar ───────────────────────────────────────────────
const FilterBar = memo(function FilterBar({
  searchQuery,    setSearchQuery,
  categoryFilter, setCategoryFilter,
  dateRange,      setDateRange,
  dynamicCategories,
}) {
  const [isOpen,   setIsOpen]   = useState(false);
  const [showCats, setShowCats] = useState(false);

  const activeCount = [
    searchQuery.length > 0,
    categoryFilter !== "Semua",
    !!(dateRange.from || dateRange.to),
  ].filter(Boolean).length;

  const clearAll = useCallback(() => {
    setSearchQuery(""); setCategoryFilter("Semua");
    setDateRange({ from: "", to: "" });
  }, [setSearchQuery, setCategoryFilter, setDateRange]);

  return (
    <div className="mb-4">
      {/* Collapsed */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border transition-all ${
            activeCount > 0
              ? "bg-blue-500/10 border-blue-500/30 text-blue-500"
              : "bg-gray-50 dark:bg-[#121827] border-gray-200 dark:border-gray-800 text-gray-400"
          }`}
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Cari & Filter</span>
            {activeCount > 0 && (
              <span className="text-[8px] font-black bg-blue-500 text-white w-4 h-4 rounded-full flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </div>
          <ChevronDown size={14} />
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.14, ease: "easeOut" }}
          className="bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-visible"
        >
          <div className="flex items-center gap-2 px-3 py-2.5">
            {/* Search */}
            <input
              autoFocus
              type="text"
              placeholder="Cari transaksi..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
            />

            {/* Kategori dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowCats(p => !p)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  categoryFilter !== "Semua"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                }`}
              >
                {categoryFilter === "Semua" ? "Semua" : categoryFilter}
                <ChevronDown size={9} />
              </button>

              <AnimatePresence>
                {showCats && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[20]"
                      onClick={() => setShowCats(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-full mt-1.5 bg-white dark:bg-[#0d1117] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl z-[21] py-1.5 min-w-[140px] max-h-52 overflow-y-auto no-scrollbar"
                    >
                      {dynamicCategories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => { setCategoryFilter(cat); setShowCats(false); }}
                          className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${
                            categoryFilter === cat
                              ? "text-blue-500 bg-blue-500/10"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Date dari - sampai */}
            <input
              type="date"
              value={dateRange.from ?? ""}
              onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
              className="w-[88px] shrink-0 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[8px] font-bold rounded-xl px-1.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-gray-300 dark:text-gray-700 text-[10px] shrink-0">–</span>
            <input
              type="date"
              value={dateRange.to ?? ""}
              min={dateRange.from}
              onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
              className="w-[88px] shrink-0 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[8px] font-bold rounded-xl px-1.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
            />

            <button
              onClick={() => { setIsOpen(false); setShowCats(false); }}
              className="p-1.5 text-gray-400 hover:text-red-400 transition-colors shrink-0"
            >
              <X size={13} />
            </button>
          </div>

          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="w-full text-center py-1.5 border-t border-gray-100 dark:border-gray-800 text-[9px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest transition-colors"
            >
              Hapus Semua Filter
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
});

// ── FotoInline — icon kiri card, tampil sebagai kotak inisial ────────────────
// Tap → 2 pill Kamera / Galeri muncul di atas — fixed positioning agar tidak terpotong
const FotoInline = memo(function FotoInline({ trxId, userId, category, type, onPhotoAdded }) {
  const [isOpen,      setIsOpen]      = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [popupPos,    setPopupPos]    = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const camRef = useRef(null);
  const galRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setIsOpen(false);
    setIsUploading(true);
    try {
      const { uploadPhoto: upload } = await import("@/lib/imageUtils");
      const path = `receipts/${userId}/${trxId}.jpg`;
      const url  = await upload(file, path, supabase);
      await supabase.from("transactions").update({ receipt_url: url }).eq("id", trxId);
      onPhotoAdded?.(trxId, url);
    } catch (err) {
      console.error("Upload:", err.message);
    } finally {
      setIsUploading(false);
    }
  }, [trxId, userId, onPhotoAdded]);

  const handleOpen = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    // Posisi popup di atas tombol — fixed agar tidak terpotong parent
    setPopupPos({
      top:  rect.top - 8,   // 8px di atas tombol
      left: rect.left,
    });
    setIsOpen(p => !p);
  }, []);

  const initials = (category || "?").slice(0, 2).toUpperCase();
  const isIncome = type === "income";

  return (
    <div className="relative shrink-0">
      {/* Kotak inisial */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        disabled={isUploading}
        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm transition-all active:scale-90 ${
          isUploading
            ? "bg-blue-500/10 text-blue-400"
            : isIncome
            ? "bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20"
            : "bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20"
        }`}
      >
        {isUploading ? <Loader2 size={14} className="animate-spin" /> : initials}
      </button>

      {/* Popup — fixed positioning, tidak terpotong */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[50]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.1 }}
              style={{
                position: "fixed",
                top: popupPos.top,
                left: popupPos.left,
                transform: "translateY(-100%)",
                zIndex: 51,
              }}
              className="flex flex-col gap-1"
            >
              <button
                onClick={() => { setIsOpen(false); camRef.current?.click(); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1f2e] border border-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-2xl whitespace-nowrap"
              >
                <Camera size={11} /> Kamera
              </button>
              <button
                onClick={() => { setIsOpen(false); galRef.current?.click(); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1f2e] border border-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-2xl whitespace-nowrap"
              >
                <Image size={11} /> Galeri
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <input ref={camRef} type="file" accept="image/*" capture="environment"
        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ""; }} className="hidden" />
      <input ref={galRef} type="file" accept="image/*"
        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ""; }} className="hidden" />
    </div>
  );
});

// ── HomeTab ───────────────────────────────────────────────────────────────────
const HomeTabComponent = memo(function HomeTab({
  isDarkMode, setIsDarkMode,
  activeWallet, onOpenWalletModal,
  balance, filteredIncome, filteredExpense,
  typeFilter,      setTypeFilter,
  searchQuery,     setSearchQuery,
  categoryFilter,  setCategoryFilter,
  dynamicCategories,
  dateRange,       setDateRange,
  selectedMonth,   setSelectedMonth,
  recentMonths,
  filteredTransactions,
  transactions,
  mounted,
  allBudgets,
  transactionsThisMonth,
  hasMore, loadMore, isLoading,
  totalCount,  // total setelah filter, sebelum pagination
  isOnline, pendingCount, isSyncing,
  onEditTransaction, onDeleteTransaction,
  session,
}) {
  const [viewerUrl,   setViewerUrl]   = useState(null);
  const [viewerLabel, setViewerLabel] = useState("");
  const [photoMap,    setPhotoMap]    = useState({}); // { trxId: signedUrl }
  const [viewerLoading, setViewerLoading] = useState(false);

  const handlePhotoAdded = useCallback((trxId, url) => {
    setPhotoMap(p => ({ ...p, [trxId]: url }));
  }, []);

  // Buka viewer dengan signed URL
  const openViewer = useCallback(async (rawUrl, label) => {
    setViewerLabel(label);
    setViewerLoading(true);
    setViewerUrl("loading");
    const signed = await getSignedUrl(rawUrl);
    setViewerUrl(signed || null);
    setViewerLoading(false);
  }, []);

  return (
    <motion.div
      key="home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="pt-8 px-3 h-[100dvh] w-full flex flex-col overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="flex-none">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">ArtaKita.</h1>
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-[0.15em] uppercase mt-0.5">
              {activeWallet?.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 transition-all active:scale-90"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={onOpenWalletModal}
              className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 transition-all active:scale-90"
            >
              <Wallet size={20} />
            </button>
          </div>
        </div>

        {/* ── Balance Card ── */}
        <div className="bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-xl shadow-blue-500/8 border border-gray-100 dark:border-gray-800/60 mb-4">
          <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-2">
            {HOME.TOTAL_BALANCE}
          </p>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-2xl font-bold text-gray-300 dark:text-gray-700">Rp</span>
            <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
              {balance.toLocaleString("id-ID")}
            </span>
          </div>

          <BudgetAlert budgets={allBudgets} transactions={transactionsThisMonth} />

          {(!isOnline || pendingCount > 0) && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold mt-2 ${
              !isOnline
                ? "bg-amber-500/10 border border-amber-500/20 text-amber-500"
                : "bg-blue-500/10 border border-blue-500/20 text-blue-500"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${!isOnline ? "bg-amber-500" : "bg-blue-500 animate-pulse"}`} />
              <span>
                {!isOnline ? HOME.OFFLINE_MSG
                  : isSyncing ? HOME.SYNCING_MSG(pendingCount)
                  : HOME.PENDING_MSG(pendingCount)}
              </span>
            </div>
          )}

          <p className="text-[9px] font-black text-blue-500/50 uppercase tracking-widest mt-4 mb-3 border-t border-gray-100 dark:border-gray-800 pt-4">
            {HOME.CIRCULATION}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTypeFilter(typeFilter === "income" ? "all" : "income")}
              className={`p-4 rounded-[20px] border transition-all ${
                typeFilter === "income"
                  ? "bg-green-500/10 border-green-500 shadow-lg shadow-green-500/20"
                  : "bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800/50"
              }`}
            >
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500 mb-1.5">
                <ArrowDownCircle size={14} />
                <span className="text-[9px] font-black uppercase tracking-wider">{HOME.INCOME}</span>
              </div>
              <p className="font-bold text-gray-800 dark:text-gray-200 text-base text-left">
                Rp {filteredIncome.toLocaleString("id-ID")}
              </p>
            </button>
            <button
              onClick={() => setTypeFilter(typeFilter === "expense" ? "all" : "expense")}
              className={`p-4 rounded-[20px] border transition-all ${
                typeFilter === "expense"
                  ? "bg-red-500/10 border-red-500 shadow-lg shadow-red-500/20"
                  : "bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800/50"
              }`}
            >
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-500 mb-1.5">
                <ArrowUpCircle size={14} />
                <span className="text-[9px] font-black uppercase tracking-wider">{HOME.EXPENSE}</span>
              </div>
              <p className="font-bold text-gray-800 dark:text-gray-200 text-base text-left">
                Rp {filteredExpense.toLocaleString("id-ID")}
              </p>
            </button>
          </div>
        </div>

        {/* ── Collapsed Filter Bar ── */}
        <FilterBar
          searchQuery={searchQuery}       setSearchQuery={setSearchQuery}
          categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
          dateRange={dateRange}           setDateRange={setDateRange}
          dynamicCategories={dynamicCategories}
        />

        {/* ── Log header ── */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[9px] font-black text-gray-400 dark:text-gray-600 tracking-[0.3em] uppercase">
              {HOME.ACTIVITY_LOG}
            </h2>
            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
              {totalCount && totalCount > filteredTransactions.length
                ? `${filteredTransactions.length} / ${totalCount}`
                : filteredTransactions.length
              }
            </span>
          </div>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="appearance-none bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-xl pl-3 pr-7 py-1.5 text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer"
          >
            {recentMonths.map(m => (
              <option key={m.value} value={m.value ?? ""}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Transaction list ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 min-h-0">
        <AnimatePresence mode="popLayout">
          {transactions.length === 0 && !mounted ? (
            <motion.div key="sk" exit={{ opacity: 0 }}>
              <Skeleton /><Skeleton /><Skeleton />
            </motion.div>
          ) : filteredTransactions.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-16 bg-gray-50/50 dark:bg-gray-900/10 rounded-[28px] border border-dashed border-gray-200 dark:border-gray-800"
            >
              <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.4em]">
                {HOME.EMPTY}
              </p>
            </motion.div>
          ) : (
            filteredTransactions.map(trx => {
              const hasPhoto = !!(trx.receipt_url || photoMap[trx.id]);
              const photoUrl = photoMap[trx.id] || trx.receipt_url;
              return (
                <motion.div
                  key={trx.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={`flex items-center justify-between p-4 rounded-[22px] border transition-all mb-2.5 ${
                    trx._pending
                      ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30"
                      : "bg-white dark:bg-gray-900/20 border-gray-100 dark:border-gray-800/40"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Icon kiri: mata terbuka (lihat foto) atau inisial+upload */}
                    {hasPhoto ? (
                      <button
                        onClick={() => openViewer(photoUrl, trx.note)}
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 active:scale-90 transition-all"
                      >
                        {viewerLoading && viewerLabel === trx.note
                          ? <Loader2 size={16} className="animate-spin" />
                          : <Eye size={18} />
                        }
                      </button>
                    ) : (
                      <FotoInline
                        trxId={trx.id}
                        userId={session?.user?.id}
                        category={trx.category}
                        type={trx.type}
                        onPhotoAdded={handlePhotoAdded}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                        {trx.note}
                        {trx._pending && (
                          <span className="ml-1.5 text-[8px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase">
                            Menunggu
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[9px] font-black text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 px-2 py-0.5 rounded-lg">
                          {trx.category}
                        </span>
                        <span className="text-[9px] text-gray-300 dark:text-gray-700">
                          {formatDateTime(trx.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                    <p className={`font-black text-sm tracking-tight ${
                      trx.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
                    }`}>
                      {trx.type === "income" ? "+" : "-"}Rp {Number(trx.amount).toLocaleString("id-ID")}
                    </p>
                    {!trx._pending && (
                      <div className="flex gap-1.5 items-center">
                        <button
                          onClick={() => onEditTransaction(trx)}
                          className="p-2 text-gray-400 hover:text-blue-500 bg-gray-100 dark:bg-gray-800 active:scale-90 rounded-xl transition-all"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => onDeleteTransaction(trx)}
                          className="p-2 text-gray-400 hover:text-red-500 bg-gray-100 dark:bg-gray-800 active:scale-90 rounded-xl transition-all"
                        >
                          <Trash2 size={13} />
                        </button>

                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>

        {/* Tombol muat lebih — hilang saat semua sudah tampil */}
        {hasMore && (
          <div className="flex justify-center pt-2 pb-4">
            <button
              onClick={loadMore}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-blue-500 hover:border-blue-500/50 font-black text-[9px] uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50"
            >
              {isLoading && <Loader2 size={12} className="animate-spin" />}
              {isLoading ? HOME.LOADING : (
                totalCount
                  ? `Muat ${Math.min(15, totalCount - filteredTransactions.length)} lagi`
                  : HOME.LOAD_MORE
              )}
            </button>
          </div>
        )}
      </div>

      <PhotoViewer
        url={viewerUrl}
        isOpen={!!viewerUrl}
        onClose={() => { setViewerUrl(null); setViewerLabel(""); }}
        label={viewerLabel}
      />
    </motion.div>
  );
});

export default HomeTabComponent;
