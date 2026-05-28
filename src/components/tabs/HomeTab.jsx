"use client";
import { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpCircle, ArrowDownCircle,
  Coffee, ShoppingBag, Receipt, Layers,
  Edit3, Trash2, Search, X, Eye, Loader2
} from "lucide-react";
import PhotoViewer from "@/components/PhotoViewer";
import { formatDateTime } from "@/lib/utils";
import BudgetAlert from "@/components/BudgetAlert";
import WalletSwitcher from "@/components/WalletSwitcher";

// ── Icon helper ───────────────────────────────────────────────────────────────
const getIcon = (category) => {
  switch (category) {
    case "Makan":   return <Coffee size={18} />;
    case "Belanja": return <ShoppingBag size={18} />;
    case "Tagihan": return <Receipt size={18} />;
    default:        return <Layers size={18} />;
  }
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const TransactionSkeleton = () => (
  <div className="flex items-center justify-between p-4 rounded-[24px] bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800/40 mb-3 animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-800" />
      <div className="space-y-2">
        <div className="h-3.5 w-32 bg-gray-200 dark:bg-gray-800 rounded-full" />
        <div className="h-2 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" />
      </div>
    </div>
    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded-full" />
  </div>
);

// ── HomeTab ───────────────────────────────────────────────────────────────────
const HomeTabComponent = memo(function HomeTab({
  activeWallet,
  balance,
  filteredIncome, filteredExpense,
  typeFilter, setTypeFilter,
  searchQuery, setSearchQuery,
  categoryFilter, setCategoryFilter,
  dynamicCategories,
  quickTimeFilter, setQuickTimeFilter,
  selectedMonth, setSelectedMonth,
  recentMonths,
  filteredTransactions,
  transactions,
  mounted,
  allBudgets,
  transactionsThisMonth,
  onEditTransaction,
  onDeleteTransaction,
  hasMore,
  loadMore,
  isLoading,
  isOnline,
  pendingCount,
  isSyncing,
  wallets,
  session,
  onSwitchWallet,
}) {
  const [viewerUrl, setViewerUrl]   = useState(null);
  const [viewerLabel, setViewerLabel] = useState("");

  return (
    <motion.div
      key="home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="pt-8 px-3 h-[100dvh] w-full flex flex-col overflow-hidden"
    >
      {/* ── Fixed header section ── */}
      <div className="flex-none">
        {/* Title bar */}
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              ArtaKita.
            </h1>
            <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 tracking-[0.2em] uppercase mt-1">
              {activeWallet.name}
            </p>
          </div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 transition-all active:scale-90 hover:shadow-md"
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>

        {/* Balance Card */}
        <div className="bg-white dark:bg-[#121827] rounded-[32px] sm:rounded-[40px] p-7 sm:p-10 shadow-2xl shadow-blue-500/10 border border-gray-100 dark:border-gray-800/60 mb-6 sm:mb-8 transition-all">
          <p className="text-[10px] sm:text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-3 sm:mb-4">
            Total Saldo (Semua Waktu)
          </p>
          <div className="flex items-baseline gap-2 sm:gap-3 mb-8 sm:mb-10">
            <span className="text-3xl sm:text-4xl font-bold text-gray-300 dark:text-gray-700">Rp</span>
            <span className="text-5xl sm:text-7xl font-black text-gray-900 dark:text-white tracking-tighter">
              {balance.toLocaleString("id-ID")}
            </span>
          </div>

          <BudgetAlert budgets={allBudgets} transactions={transactionsThisMonth} />

        {/* Offline / Sync strip */}
        {(!isOnline || pendingCount > 0) && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold mb-0 mt-1 ${
            !isOnline
              ? "bg-amber-500/10 border border-amber-500/20 text-amber-500"
              : "bg-blue-500/10 border border-blue-500/20 text-blue-500"
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${!isOnline ? "bg-amber-500" : "bg-blue-500 animate-pulse"}`} />
            {!isOnline
              ? "Offline — transaksi akan disync saat online"
              : isSyncing
              ? `Menyinkronkan ${pendingCount} transaksi...`
              : `${pendingCount} transaksi menunggu sinkronisasi`
            }
          </div>
        )}

          <p className="text-[10px] sm:text-xs font-black text-blue-500/60 dark:text-blue-400/60 uppercase tracking-widest mb-3 sm:mb-4 border-t border-gray-100 dark:border-gray-800 pt-4 sm:pt-6">
            Sirkulasi Berjalan
          </p>
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <button
              onClick={() => setTypeFilter(typeFilter === "income" ? "all" : "income")}
              className={`p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border transition-all ${
                typeFilter === "income"
                  ? "bg-green-500/10 border-green-500 shadow-lg shadow-green-500/20"
                  : "bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 text-green-600 dark:text-green-500 mb-1.5 sm:mb-2">
                <ArrowDownCircle size={16} className="sm:w-5 sm:h-5" />
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">Pemasukan</span>
              </div>
              <p className="font-bold text-gray-800 dark:text-gray-200 text-base sm:text-lg text-left">
                Rp {filteredIncome.toLocaleString("id-ID")}
              </p>
            </button>

            <button
              onClick={() => setTypeFilter(typeFilter === "expense" ? "all" : "expense")}
              className={`p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border transition-all ${
                typeFilter === "expense"
                  ? "bg-red-500/10 border-red-500 shadow-lg shadow-red-500/20"
                  : "bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 text-red-600 dark:text-red-500 mb-1.5 sm:mb-2">
                <ArrowUpCircle size={16} className="sm:w-5 sm:h-5" />
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">Pengeluaran</span>
              </div>
              <p className="font-bold text-gray-800 dark:text-gray-200 text-base sm:text-lg text-left">
                Rp {filteredExpense.toLocaleString("id-ID")}
              </p>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Cari transaksi"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800/60 rounded-[24px] py-3.5 pl-11 pr-10 text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-500 transition-all shadow-sm"
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Category filter pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar cursor-grab snap-x">
          {dynamicCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`snap-center shrink-0 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                categoryFilter === cat
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "bg-transparent text-gray-500 border border-gray-200 dark:border-gray-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Quick time filter */}
        <div className="flex bg-gray-100 dark:bg-[#121827] p-1 rounded-[16px] mb-6 border border-gray-200 dark:border-gray-800/60 shadow-inner">
          {[
            { key: "today", label: "Hari Ini" },
            { key: "week",  label: "7 Hari" },
            { key: "month", label: "Bulan Ini" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setQuickTimeFilter(key)}
              className={`flex-1 text-[9px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all duration-300 ${
                quickTimeFilter === key
                  ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Log header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-600 tracking-[0.3em] uppercase">
              Log Aktivitas
            </h2>
            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {filteredTransactions.length} Item
            </span>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="appearance-none bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-500/50 rounded-xl pl-3 pr-8 py-1.5 text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer transition-all shadow-sm"
          >
            {recentMonths.map((m) => (
              <option key={m.value} value={m.value} className="bg-white dark:bg-[#121827] text-gray-900 dark:text-white font-bold">
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Scrollable transaction list ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-32 min-h-0">
        <AnimatePresence mode="popLayout">
          {transactions.length === 0 && !mounted ? (
            <motion.div key="skeleton" exit={{ opacity: 0 }}>
              <TransactionSkeleton />
              <TransactionSkeleton />
              <TransactionSkeleton />
            </motion.div>
          ) : filteredTransactions.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-20 bg-gray-50/50 dark:bg-gray-900/10 rounded-[32px] border border-dashed border-gray-200 dark:border-gray-800"
            >
              <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.4em]">Kosong</p>
            </motion.div>
          ) : (
            filteredTransactions.map((trx) => (
              <motion.div
                key={trx.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between p-4 rounded-[24px] bg-white dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800/40 hover:border-blue-500/30 transition-all mb-3"
              >
                {/* Icon + Info */}
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    trx.type === "income"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-red-500/10 text-red-500 dark:text-red-400"
                  }`}>
                    {getIcon(trx.category)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white tracking-tight leading-tight">
                      {trx.note}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 px-2 py-0.5 rounded-lg">
                        {trx.category}
                      </span>
                      <span className="text-[9px] text-gray-300 dark:text-gray-700">
                        {formatDateTime(trx.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount + Actions */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className={`font-black text-base tracking-tight ${
                    trx.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
                  }`}>
                    {trx.type === "income" ? "+" : "-"}Rp {Number(trx.amount).toLocaleString("id-ID")}
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onEditTransaction(trx)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-colors"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => onDeleteTransaction(trx)}
                      className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                    {/* Icon mata — hanya muncul jika ada foto */}
                    {trx.receipt_url && (
                      <button
                        onClick={() => { setViewerUrl(trx.receipt_url); setViewerLabel(trx.note); }}
                        className="p-1.5 text-gray-400 hover:text-violet-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-colors"
                        title="Lihat nota"
                      >
                        <Eye size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {/* Load More */}
        {hasMore && (
          <div className="flex justify-center pt-2 pb-4">
            <button
              onClick={loadMore}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-blue-500 hover:border-blue-500/50 font-black text-[9px] uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={12} className="animate-spin" /> : null}
              {isLoading ? "Memuat..." : "Muat Lebih"}
            </button>
          </div>
        )}
      </div>

      {/* Photo Viewer */}
      <PhotoViewer
        url={viewerUrl}
        isOpen={!!viewerUrl}
        onClose={() => setViewerUrl(null)}
        label={viewerLabel}
      />
    </motion.div>
  );

});

export default HomeTabComponent;
