"use client";
import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight, ArrowDownLeft,
  RefreshCw, Package, Tag,
  PiggyBank, ChevronRight
} from "lucide-react";
import { FINANCE } from "@/lib/constants";
import DebtsTab         from "@/components/tabs/DebtsTab";
import RecurringTab     from "@/components/tabs/RecurringTab";
import AssetsTab        from "@/components/tabs/AssetsTab";
import SavingsTab       from "@/components/tabs/SavingsTab";
import ManageCategories from "@/components/ManageCategories";

// ── Row config — tema konsisten: putih/dark, aksen warna di icon saja ─────────
const ROWS = [
  {
    key:      "debts",
    label:    FINANCE.DEBTS,
    sub:      FINANCE.DEBTS_SUB,
    Icon:     ArrowUpRight,
    iconColor:"text-red-500",
    iconBg:   "bg-red-500/10",
  },
  {
    key:      "recurring",
    label:    FINANCE.RECURRING,
    sub:      FINANCE.RECURRING_SUB,
    Icon:     RefreshCw,
    iconColor:"text-blue-500",
    iconBg:   "bg-blue-500/10",
  },
  {
    key:      "assets",
    label:    FINANCE.ASSETS,
    sub:      FINANCE.ASSETS_SUB,
    Icon:     Package,
    iconColor:"text-violet-500",
    iconBg:   "bg-violet-500/10",
  },
  {
    key:      "savings",
    label:    "Celengan & Target",
    sub:      "Tabungan & target impian",
    Icon:     PiggyBank,
    iconColor:"text-emerald-500",
    iconBg:   "bg-emerald-500/10",
  },
  {
    key:      "categories",
    label:    FINANCE.CATEGORIES,
    sub:      FINANCE.CATEGORIES_SUB,
    Icon:     Tag,
    iconColor:"text-amber-500",
    iconBg:   "bg-amber-500/10",
  },
];

// ── Breadcrumb — tap "Keuangan" kembali ke rows ───────────────────────────────
const Breadcrumb = memo(function Breadcrumb({ subLabel, onBack }) {
  return (
    <div className="flex items-center justify-between pt-8 px-3 pb-3 flex-none">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          {subLabel}
        </span>
      </div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-blue-500 hover:text-blue-400 active:scale-95 transition-all bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        <span className="text-[9px] font-black uppercase tracking-widest">{FINANCE.TITLE}</span>
      </button>
    </div>
  );
});

// ── Sub-page wrapper — slide dari kanan ──────────────────────────────────────
const SubPage = memo(function SubPage({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 32 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="fixed inset-0 z-[90] bg-white dark:bg-black overflow-y-auto no-scrollbar"
    >
      <div className="w-full max-w-lg mx-auto h-full flex flex-col">
        {children}
      </div>
    </motion.div>
  );
});

// ── Main ──────────────────────────────────────────────────────────────────────
const FinanceTab = memo(function FinanceTab({
  activeWallet, balance,
  subPage, setSubPage,
  onNotify,
  // Savings props
  goals, setGoals,
  isNewGoalOpen, setIsNewGoalOpen,
  newGoalData, setNewGoalData,
  handleAddGoal,
  activeGoalInput, setActiveGoalInput,
  flexibleSavingsAmt, setFlexibleSavingsAmt,
  handleModifySavings, triggerDeleteGoal,
}) {
  const currentRow = ROWS.find(r => r.key === subPage);

  return (
    <>
      {/* ── 5 Rows — selalu render, tersembunyi saat sub-page aktif ── */}
      <motion.div
        key="finance-rows"
        initial={{ opacity: 0 }}
        animate={{ opacity: subPage ? 0 : 1 }}
        transition={{ duration: 0.15 }}
        className="pt-8 px-3 pb-32 h-[100dvh] overflow-y-auto no-scrollbar w-full flex flex-col"
        style={{ pointerEvents: subPage ? "none" : "auto" }}
      >
        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-6 flex-none">
          {FINANCE.TITLE}
        </h2>

        {/* Rows — tema konsisten dengan halaman lain */}
        <div className="space-y-2.5 flex-1">
          {ROWS.map((row, idx) => (
            <motion.button
              key={row.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, type: "spring", stiffness: 300, damping: 28 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSubPage(row.key)}
              className="w-full bg-white dark:bg-[#121827] border border-gray-100 dark:border-gray-800/60 rounded-[24px] p-4 shadow-sm hover:border-gray-200 dark:hover:border-gray-700 transition-all flex items-center gap-4 text-left"
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-2xl ${row.iconBg} flex items-center justify-center shrink-0`}>
                <row.Icon size={20} className={row.iconColor} />
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-gray-900 dark:text-white">{row.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{row.sub}</p>
              </div>

              <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── Sub-pages — slide dari kanan ── */}
      <AnimatePresence mode="wait">
        {subPage === "debts" && (
          <SubPage key="debts">
            <Breadcrumb subLabel={FINANCE.DEBTS} onBack={() => setSubPage(null)} />
            <div className="flex-1 overflow-hidden min-h-0">
              <DebtsTab activeWallet={activeWallet} balance={balance} />
            </div>
          </SubPage>
        )}

        {subPage === "recurring" && (
          <SubPage key="recurring">
            <Breadcrumb subLabel={FINANCE.RECURRING} onBack={() => setSubPage(null)} />
            <div className="flex-1 overflow-hidden min-h-0">
              <RecurringTab activeWallet={activeWallet} onNotify={onNotify} />
            </div>
          </SubPage>
        )}

        {subPage === "assets" && (
          <SubPage key="assets">
            <Breadcrumb subLabel={FINANCE.ASSETS} onBack={() => setSubPage(null)} />
            <div className="flex-1 overflow-hidden min-h-0">
              <AssetsTab activeWallet={activeWallet} />
            </div>
          </SubPage>
        )}

        {subPage === "savings" && (
          <SubPage key="savings">
            <Breadcrumb subLabel="Celengan & Target" onBack={() => setSubPage(null)} />
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <SavingsTab
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
                triggerDeleteGoal={triggerDeleteGoal}
              />
            </div>
          </SubPage>
        )}

        {subPage === "categories" && (
          <SubPage key="categories">
            <Breadcrumb subLabel={FINANCE.CATEGORIES} onBack={() => setSubPage(null)} />
            <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-32">
              <ManageCategories />
            </div>
          </SubPage>
        )}
      </AnimatePresence>
    </>
  );
});

export default FinanceTab;
