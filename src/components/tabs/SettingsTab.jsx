"use client";
import { motion } from "framer-motion";
import { Download, CreditCard, ChevronRight } from "lucide-react";
import ManageCategories from "@/components/ManageCategories";
import UserManagement from "@/components/UserManagement";

/**
 * SettingsTab
 * Props:
 *  - exportToCSV: () => void
 *  - handleLogout: () => void
 *  - isAdmin: boolean — tampilkan User Management jika true
 *  - onNotify: (message, type) => void — untuk toast dari UserManagement
 */
export default function SettingsTab({ exportToCSV, handleLogout, isAdmin, onNotify, onManageWallets }) {
  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="pt-8 px-4 pb-32 h-[100dvh] overflow-y-auto no-scrollbar w-full flex flex-col"
    >
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight flex-none">
        Pengaturan
      </h2>

      <div className="mb-6">
        <ManageCategories />
      </div>
      {/* User Management — hanya tampil untuk admin */}
      {isAdmin && (
        <div className="mb-6">
          <UserManagement onNotify={onNotify} />
        </div>
      )}

      {/* Manage Wallets */}
      <div className="mb-4">
        <button
          onClick={onManageWallets}
          className="w-full p-5 rounded-[24px] bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800/60 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <CreditCard size={18} className="text-blue-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Wallets & Savings</p>
              <p className="text-[10px] text-gray-400 font-normal">Kelola rekening & target impian</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Export CSV */}
      <div className="mb-8">
        <button
          onClick={exportToCSV}
          className="w-full p-5 rounded-[24px] bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-between font-bold text-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Download size={18} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Unduh Laporan Keuangan</p>
              <p className="text-[10px] text-gray-400 font-normal">Format .CSV (Excel / Spreadsheets)</p>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="mt-auto">
        <button
          onClick={handleLogout}
          className="w-full p-6 rounded-[32px] bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs"
        >
          Keluar dari Akun
        </button>
      </div>
    </motion.div>
  );
}
