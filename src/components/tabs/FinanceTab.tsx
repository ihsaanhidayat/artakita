"use client";
import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight, RefreshCw, Package, Tag,
  PiggyBank, ChevronRight,
} from "lucide-react";
import { FINANCE } from "@/lib/constants";
import DebtsTab from "@/components/tabs/DebtsTab";
import RecurringTab from "@/components/tabs/RecurringTab";
import AssetsTab from "@/components/tabs/AssetsTab";
import SavingsTab from "@/components/tabs/SavingsTab";
import ManageCategories from "@/components/ManageCategories";
import type { SavingsGoal, ActiveWallet, NewGoalData } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type SubPage = "debts" | "recurring" | "assets" | "savings" | "categories" | null;

// exported so page.tsx can share the same state type
export type { SubPage as FinanceSubPage };

interface RowConfig {
  key: string;
  label: string;
  sub: string;
  Icon: React.ElementType;
  iconStyle: React.CSSProperties;
  iconBgStyle: React.CSSProperties;
}

interface FinanceTabProps {
  activeWallet: ActiveWallet | null;
  balance: number;
  subPage: string | null;
  setSubPage: (p: SubPage) => void;
  onNotify?: (msg: string, type?: "success" | "error") => void;
  financeRefreshKey?: number;
  goals: SavingsGoal[];
  isNewGoalOpen: boolean;
  setIsNewGoalOpen: (v: boolean) => void;
  newGoalData: NewGoalData;
  setNewGoalData: (d: NewGoalData) => void;
  isDirtyGoal?: boolean;
  handleAddGoal: (e: React.FormEvent) => void;
  activeGoalInput: string | null;
  setActiveGoalInput: (id: string | null) => void;
  flexibleSavingsAmt: string;
  setFlexibleSavingsAmt: (v: string) => void;
  handleModifySavings: (id: string, currentAmt: number, mode: "add" | "subtract" | "reset") => void;
  onDeleteGoal: (id: string) => Promise<void>;
}

// ── Config ────────────────────────────────────────────────────────────────────

const ROWS: RowConfig[] = [
  { key: "debts",      label: FINANCE.DEBTS as string,      sub: FINANCE.DEBTS_SUB as string,      Icon: ArrowUpRight, iconStyle: { color: "var(--a3)" },    iconBgStyle: { background: "color-mix(in srgb, var(--a3) 12%, transparent)" } },
  { key: "recurring",  label: FINANCE.RECURRING as string,  sub: FINANCE.RECURRING_SUB as string,  Icon: RefreshCw,    iconStyle: { color: "var(--a1)" },    iconBgStyle: { background: "color-mix(in srgb, var(--a1) 12%, transparent)" } },
  { key: "assets",     label: FINANCE.ASSETS as string,     sub: FINANCE.ASSETS_SUB as string,     Icon: Package,      iconStyle: { color: "var(--a2)" },    iconBgStyle: { background: "color-mix(in srgb, var(--a2) 12%, transparent)" } },
  { key: "savings",    label: "Celengan & Target",           sub: "Tabungan & target impian",       Icon: PiggyBank,    iconStyle: { color: "var(--income)" }, iconBgStyle: { background: "color-mix(in srgb, var(--income) 12%, transparent)" } },
  { key: "categories", label: FINANCE.CATEGORIES as string, sub: FINANCE.CATEGORIES_SUB as string, Icon: Tag,          iconStyle: { color: "var(--a2)" },    iconBgStyle: { background: "color-mix(in srgb, var(--a2) 10%, transparent)" } },
];

// ── Sub-components ────────────────────────────────────────────────────────────

const Breadcrumb = memo(function Breadcrumb({ subLabel, onBack }: { subLabel: string; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between pt-8 px-3 pb-3 flex-none">
      <span className="text-caption font-black ds-t3 uppercase tracking-widest">{subLabel}</span>
      <button onClick={onBack} className="flex items-center gap-1.5 ds-aurora-text hover:opacity-80 active:scale-95 transition-all ds-aurora-bg border ds-aurora-border-c px-3 py-1.5 rounded-xl">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        <span className="text-label font-black uppercase tracking-widest">{FINANCE.TITLE as string}</span>
      </button>
    </div>
  );
});

const SubPage = memo(function SubPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 32 }} transition={{ type: "spring", stiffness: 400, damping: 35 }} className="fixed inset-0 z-[90] ds-bg-0 overflow-y-auto no-scrollbar">
      <div className="w-full max-w-lg mx-auto h-full flex flex-col">{children}</div>
    </motion.div>
  );
});

// ── Main ──────────────────────────────────────────────────────────────────────

const FinanceTab = memo(function FinanceTab({
  activeWallet, balance, subPage, setSubPage, onNotify, financeRefreshKey,
  goals, isNewGoalOpen, setIsNewGoalOpen,
  newGoalData, setNewGoalData, handleAddGoal,
  activeGoalInput, setActiveGoalInput, flexibleSavingsAmt, setFlexibleSavingsAmt,
  handleModifySavings, onDeleteGoal,
}: FinanceTabProps) {
  return (
    <>
      <motion.div key="finance-rows" initial={{ opacity: 0 }} animate={{ opacity: subPage ? 0 : 1 }} transition={{ duration: 0.15 }}
        className="pt-8 px-3 pb-32 h-[100dvh] overflow-y-auto no-scrollbar w-full flex flex-col"
        style={{ pointerEvents: subPage ? "none" : "auto" }}>
        <div className="mb-6 flex-none">
          <h2 className="text-[26px] font-light tracking-[-1.5px] leading-none ds-t1">{FINANCE.TITLE as string}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="ds-live-dot" />
            <p className="text-caption font-black tracking-[0.14em] uppercase ds-aurora-text">{activeWallet?.name}</p>
          </div>
        </div>
        <div className="space-y-2.5 flex-1">
          {ROWS.map((row, idx) => (
            <motion.button key={row.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05, type: "spring", stiffness: 300, damping: 28 }} whileTap={{ scale: 0.98 }}
              onClick={() => setSubPage(row.key as SubPage)}
              className="w-full ds-bg-1 border ds-border rounded-[24px] p-4 shadow-sm hover:ds-border transition-all flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={row.iconBgStyle}>
                <row.Icon size={20} style={row.iconStyle} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm ds-t1">{row.label}</p>
                <p className="text-caption ds-t3 mt-0.5">{row.sub}</p>
              </div>
              <ChevronRight size={16} className="ds-t3 shrink-0" />
            </motion.button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {subPage === "debts" && (
          <SubPage key="debts">
            <Breadcrumb subLabel={FINANCE.DEBTS as string} onBack={() => setSubPage(null)} />
            <div className="flex-1 overflow-hidden min-h-0">
              <DebtsTab activeWallet={activeWallet} balance={balance} refreshKey={financeRefreshKey} />
            </div>
          </SubPage>
        )}
        {subPage === "recurring" && (
          <SubPage key="recurring">
            <Breadcrumb subLabel={FINANCE.RECURRING as string} onBack={() => setSubPage(null)} />
            <div className="flex-1 overflow-hidden min-h-0">
              <RecurringTab activeWallet={activeWallet} onNotify={onNotify} refreshKey={financeRefreshKey} />
            </div>
          </SubPage>
        )}
        {subPage === "assets" && (
          <SubPage key="assets">
            <Breadcrumb subLabel={FINANCE.ASSETS as string} onBack={() => setSubPage(null)} />
            <div className="flex-1 overflow-hidden min-h-0">
              <AssetsTab activeWallet={activeWallet} refreshKey={financeRefreshKey} />
            </div>
          </SubPage>
        )}
        {subPage === "savings" && (
          <SubPage key="savings">
            <Breadcrumb subLabel="Celengan & Target" onBack={() => setSubPage(null)} />
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <SavingsTab goals={goals}
                activeGoalInput={activeGoalInput} setActiveGoalInput={setActiveGoalInput}
                flexibleSavingsAmt={flexibleSavingsAmt} setFlexibleSavingsAmt={setFlexibleSavingsAmt}
                handleModifySavings={handleModifySavings} onDeleteGoal={onDeleteGoal}
                refreshKey={financeRefreshKey} activeWallet={activeWallet} />
            </div>
          </SubPage>
        )}
        {subPage === "categories" && (
          <SubPage key="categories">
            <Breadcrumb subLabel={FINANCE.CATEGORIES as string} onBack={() => setSubPage(null)} />
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
