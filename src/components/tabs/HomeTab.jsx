"use client";
import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Sun, Wallet,
  ArrowUpCircle, ArrowDownCircle,
  Coffee, ShoppingBag, Receipt, Layers,
  Edit3, Trash2, Search, X, Eye, Loader2,
  Calendar, ChevronDown
} from "lucide-react";
import PhotoViewer   from "@/components/PhotoViewer";
import BudgetAlert   from "@/components/BudgetAlert";
import { formatDateTime, fmt } from "@/lib/utils";
import { HOME } from "@/lib/constants";

// ── Category icon helper ──────────────────────────────────────────────────────
const getCatIcon = (cat) => {
  switch (cat) {
    case "Makan":   return <Coffee  size={17} />;
    case "Belanja": return <ShoppingBag size={17} />;
    case "Tagihan": return <Receipt size={17} />;
    default:        return <Layers  size={17} />;
  }
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = () => (
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

// ── Date Range Picker ─────────────────────────────────────────────────────────
const DateRangePicker = memo(function DateRangePicker({ dateRange, setDateRange, onClear }) {
  const [isOpen, setIsOpen] = useState(false);

  const hasRange = dateRange.from && dateRange.to;

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
          hasRange
            ? "bg-blue-500/10 border-blue-500/30 text-blue-500"
            : "bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 text-gray-400"
        }`}
      >
        <div className="flex items-center gap-2">
          <Calendar size={13} />
          {hasRange
            ? `${new Date(dateRange.from).toLocaleDateString("id-ID")} — ${new Date(dateRange.to).toLocaleDateString("id-ID")}`
            : HOME.FILTER_CUSTOM
          }
        </div>
        <div className="flex items-center gap-2">
          {hasRange && (
            <span
              onClick={e => { e.stopPropagation(); onClear(); setIsOpen(false); }}
              className="text-red-400 hover:text-red-600 p-0.5"
            >
              <X size={12} />
            </span>
          )}
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={13} />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                  {HOME.DATE_FROM}
                </label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800 rounded-xl py-2 px-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">
                  {HOME.DATE_TO}
                </label>
                <input
                  type="date"
                  value={dateRange.to}
                  min={dateRange.from}
                  onChange={e => {
                    setDateRange(p => ({ ...p, to: e.target.value }));
                    setIsOpen(false);
                  }}
                  className="w-full bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800 rounded-xl py-2 px-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ── HomeTab ───────────────────────────────────────────────────────────────────
const HomeTabComponent = memo(function HomeTab({
  isDarkMode, setIsDarkMode,
  activeWallet, onOpenWalletModal,
  balance,
  filteredIncome, filteredExpense,
  typeFilter,      setTypeFilter,
  searchQuery,     setSearchQuery,
  categoryFilter,  setCategoryFilter,
  dynamicCategories,
  quickTimeFilter, setQuickTimeFilter,
  dateRange,       setDateRange,
  selectedMonth,   setSelectedMonth,
  recentMonths,
  filteredTransactions,
  transactions,
  mounted,
  allBudgets,
  transactionsThisMonth,
  hasMore, loadMore, isLoading,
  isOnline, pendingCount, isSyncing,
  onEditTransaction, onDeleteTransaction,
}) {
  const [viewerUrl,   setViewerUrl]   = useState(null);
  const [viewerLabel, setViewerLabel] = useState("");

  const clearDateRange = () => setDateRange({ from: "", to: "" });

  return (
    <motion.div
      key="home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="pt-8 px-3 h-[100dvh] w-full flex flex-col overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="flex-none">
        <div className="flex justify-between items-center mb-5">
          {/* Kiri: judul + nama dompet */}
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              ArtaKita.
            </h1>
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-[0.15em] uppercase mt-0.5">
              {activeWallet?.name}
            </p>
          </div>

          {/* Kanan: dark toggle + wallet icon */}
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
        <div className="bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl shadow-blue-500/10 border border-gray-100 dark:border-gray-800/60 mb-5">
          <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-2">
            {HOME.TOTAL_BALANCE}
          </p>
          <div className="flex items-baseline gap-2 mb-5">
            <span className="text-2xl font-bold text-gray-300 dark:text-gray-700">Rp</span>
            <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
              {balance.toLocaleString("id-ID")}
            </span>
          </div>

          {/* Budget Alert */}
          <BudgetAlert budgets={allBudgets} transactions={transactionsThisMonth} />

          {/* Offline strip */}
          {(!isOnline || pendingCount > 0) && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold mt-2 ${
              !isOnline
                ? "bg-amber-500/10 border border-amber-500/20 text-amber-500"
                : "bg-blue-500/10 border border-blue-500/20 text-blue-500"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${!isOnline ? "bg-amber-500" : "bg-blue-500 animate-pulse"}`} />
              <span>
                {!isOnline
                  ? HOME.OFFLINE_MSG
                  : isSyncing
                  ? HOME.SYNCING_MSG(pendingCount)
                  : HOME.PENDING_MSG(pendingCount)
                }
              </span>
            </div>
          )}

          {/* Income / Expense */}
          <p className="text-[9px] font-black text-blue-500/50 dark:text-blue-400/50 uppercase tracking-widest mt-4 mb-3 border-t border-gray-100 dark:border-gray-800 pt-4">
            {HOME.CIRCULATION}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Pemasukan */}
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
            {/* Pengeluaran */}
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

        {/* ── Search ── */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder={HOME.SEARCH_HINT}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800/60 rounded-[20px] py-3 pl-10 pr-9 text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:border-blue-500 transition-all"
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 p-1 transition-colors"
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ── Category pills ── */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
          {dynamicCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                categoryFilter === cat
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "bg-transparent text-gray-500 border border-gray-200 dark:border-gray-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Quick time filter ── */}
        <div className="flex bg-gray-100 dark:bg-[#121827] p-1 rounded-[14px] mb-3 border border-gray-200 dark:border-gray-800/60 shadow-inner">
          {[
            { key: "today", label: HOME.FILTER_TODAY },
            { key: "week",  label: HOME.FILTER_WEEK  },
            { key: "month", label: HOME.FILTER_MONTH },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setQuickTimeFilter(key); clearDateRange(); }}
              className={`flex-1 text-[9px] font-black uppercase tracking-widest py-2 rounded-xl transition-all duration-200 ${
                quickTimeFilter === key && !dateRange.from
                  ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Date Range Picker ── */}
        <DateRangePicker
          dateRange={dateRange}
          setDateRange={setDateRange}
          onClear={clearDateRange}
        />

        {/* ── Log header ── */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[9px] font-black text-gray-400 dark:text-gray-600 tracking-[0.3em] uppercase">
              {HOME.ACTIVITY_LOG}
            </h2>
            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
              {filteredTransactions.length}
            </span>
          </div>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="appearance-none bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-xl pl-3 pr-7 py-1.5 text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer transition-all"
          >
            {recentMonths.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Transaction list ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-32 min-h-0">
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
            filteredTransactions.map(trx => (
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
                {/* Icon + Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    trx.type === "income"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-red-500/10 text-red-500 dark:text-red-400"
                  }`}>
                    {getCatIcon(trx.category)}
                  </div>
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

                {/* Amount + Actions */}
                <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                  <p className={`font-black text-sm tracking-tight ${
                    trx.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
                  }`}>
                    {trx.type === "income" ? "+" : "-"}Rp {Number(trx.amount).toLocaleString("id-ID")}
                  </p>
                  {!trx._pending && (
                    <div className="flex gap-1">
                      <button onClick={() => onEditTransaction(trx)} className="p-1.5 text-gray-400 hover:text-blue-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-colors">
                        <Edit3 size={11} />
                      </button>
                      <button onClick={() => onDeleteTransaction(trx)} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-colors">
                        <Trash2 size={11} />
                      </button>
                      {trx.receipt_url && (
                        <button
                          onClick={() => { setViewerUrl(trx.receipt_url); setViewerLabel(trx.note); }}
                          className="p-1.5 text-gray-400 hover:text-violet-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-colors"
                        >
                          <Eye size={11} />
                        </button>
                      )}
                    </div>
                  )}
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
              {isLoading && <Loader2 size={12} className="animate-spin" />}
              {isLoading ? HOME.LOADING : HOME.LOAD_MORE}
            </button>
          </div>
        )}
      </div>

      {/* Photo Viewer */}
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
