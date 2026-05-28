"use client";
import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import {
  BarChart3, Wallet, Download, Users,
  Tag, LogOut, ChevronRight, X,
  ShieldCheck, Moon, Sun
} from "lucide-react";

/**
 * MoreDrawer — Bottom sheet drawer untuk semua fitur advanced
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - onNavigate: (tab: string) => void
 *  - isAdmin: boolean
 *  - isDarkMode: boolean
 *  - setIsDarkMode: (v: boolean) => void
 *  - exportToCSV: () => void
 *  - handleLogout: () => void
 */
const MoreDrawer = memo(function MoreDrawer({
  isOpen, onClose, onNavigate,
  isAdmin, isDarkMode, setIsDarkMode,
  exportToCSV, handleLogout,
}) {
  const [confirmLogout, setConfirmLogout] = useState(false);

  const items = [
    {
      group: "Analitik",
      entries: [
        { icon: BarChart3, label: "Statistics & Budget", sub: "Pengeluaran & alokasi anggaran", tab: "analytics", color: "text-blue-500", bg: "bg-blue-500/10" },
      ],
    },
    {
      group: "Kelola",
      entries: [
        { icon: Wallet,    label: "Wallets & Savings",  sub: "Rekening & target impian",       tab: "wallets",   color: "text-violet-500", bg: "bg-violet-500/10" },
        { icon: Tag,       label: "Kategori",           sub: "Kelola kategori transaksi",       tab: "categories",color: "text-amber-500",  bg: "bg-amber-500/10" },
      ],
    },
    {
      group: "Data",
      entries: [
        { icon: Download,  label: "Export Laporan",     sub: "Unduh CSV ke spreadsheet",       action: "export", color: "text-emerald-500", bg: "bg-emerald-500/10" },
      ],
    },
    ...(isAdmin ? [{
      group: "Admin",
      entries: [
        { icon: Users,     label: "User Management",   sub: "Kelola akun pengguna",            tab: "users",     color: "text-rose-500",   bg: "bg-rose-500/10" },
        { icon: ShieldCheck, label: "Tambah Pengguna", sub: "Buat akun baru",                  action: "adduser",color: "text-rose-400",   bg: "bg-rose-500/10" },
      ],
    }] : []),
  ];

  const handleEntry = (entry) => {
    if (entry.tab) {
      onNavigate(entry.tab);
      onClose();
    } else if (entry.action === "export") {
      exportToCSV();
      onClose();
    } else if (entry.action === "adduser") {
      onNavigate("adduser");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-[96] bg-white dark:bg-[#0a0f1c] rounded-t-[32px] border-t border-gray-100 dark:border-gray-800 shadow-2xl pb-safe"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800/60">
              <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Menu</p>
              <div className="flex items-center gap-2">
                {/* Dark mode toggle */}
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors"
                >
                  {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Menu items */}
            <div className="px-4 py-3 space-y-4 max-h-[65dvh] overflow-y-auto no-scrollbar">
              {items.map((group) => (
                <div key={group.group}>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2 px-1">
                    {group.group}
                  </p>
                  <div className="space-y-1.5">
                    {group.entries.map((entry) => (
                      <button
                        key={entry.label}
                        onClick={() => handleEntry(entry)}
                        className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left active:scale-[0.98]"
                      >
                        <div className={`w-10 h-10 rounded-xl ${entry.bg} flex items-center justify-center shrink-0`}>
                          <entry.icon size={18} className={entry.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{entry.label}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{entry.sub}</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Logout */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800/60">
                <AnimatePresence mode="wait">
                  {!confirmLogout ? (
                    <motion.button
                      key="logout-btn"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => setConfirmLogout(true)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-red-500/5 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                        <LogOut size={18} className="text-red-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-red-500">Keluar dari Akun</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Akhiri sesi ini</p>
                      </div>
                    </motion.button>
                  ) : (
                    <motion.div
                      key="logout-confirm"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex gap-2 p-1"
                    >
                      <button
                        onClick={() => setConfirmLogout(false)}
                        className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => { handleLogout(); onClose(); }}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-red-500/30"
                      >
                        Ya, Keluar
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom spacer */}
              <div className="h-4" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default MoreDrawer;
