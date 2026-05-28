"use client";
import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DebtsTab     from "@/components/tabs/DebtsTab";
import RecurringTab from "@/components/tabs/RecurringTab";
import AssetsTab    from "@/components/tabs/AssetsTab";
import { Landmark, RefreshCw, Package } from "lucide-react";

const TABS = [
  { key: "debts",     label: "Hutang",  Icon: Landmark,   short: "D" },
  { key: "recurring", label: "Rutin",   Icon: RefreshCw,  short: "R" },
  { key: "assets",    label: "Aset",    Icon: Package,    short: "A" },
];

const FinanceTab = memo(function FinanceTab({ activeWallet, balance, onNotify }) {
  const [subTab, setSubTab] = useState("debts");

  return (
    <motion.div
      key="finance"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="h-[100dvh] w-full flex flex-col overflow-hidden"
    >
      {/* Sub-tab bar */}
      <div className="flex-none px-3 pt-4 pb-0">
        <div className="flex bg-gray-100 dark:bg-[#121827] p-1 rounded-[16px] border border-gray-200 dark:border-gray-800/60 shadow-inner">
          {TABS.map(({ key, label, Icon }) => {
            const isActive = subTab === key;
            return (
              <button
                key={key}
                onClick={() => setSubTab(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                }`}
              >
                <Icon size={11} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        <AnimatePresence mode="wait" initial={false}>
          {subTab === "debts" && (
            <motion.div
              key="debts"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <DebtsTab activeWallet={activeWallet} balance={balance} />
            </motion.div>
          )}
          {subTab === "recurring" && (
            <motion.div
              key="recurring"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <RecurringTab activeWallet={activeWallet} onNotify={onNotify} />
            </motion.div>
          )}
          {subTab === "assets" && (
            <motion.div
              key="assets"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <AssetsTab activeWallet={activeWallet} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

export default FinanceTab;
