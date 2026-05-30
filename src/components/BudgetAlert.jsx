"use client";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

/**
 * BudgetAlert — Peringatan budget mendekati/melebihi batas
 *
 * Behavior:
 * - Muncul saat ada kategori yang >= 80% atau over budget
 * - Bisa di-close (dismiss per kategori)
 * - Muncul kembali saat ada transaksi baru ke kategori tersebut
 *   (berdasarkan jumlah transaksi di kategori itu)
 */
export default function BudgetAlert({ budgets = [], transactions = [] }) {
  // dismissed: { [categoryName]: transactionCount saat dismiss }
  const [dismissed, setDismissed] = useState({});

  // Hitung pengeluaran per kategori bulan ini
  const spentByCategory = useMemo(() => {
    const map = {};
    (transactions || []).forEach(t => {
      if (t.type === "expense" || !t.type) {
        const cat = t.category || "Lainnya";
        map[cat] = (map[cat] || 0) + Number(t.amount);
      }
    });
    return map;
  }, [transactions]);

  // Hitung jumlah transaksi per kategori (untuk trigger re-show)
  const countByCategory = useMemo(() => {
    const map = {};
    (transactions || []).forEach(t => {
      if (t.type === "expense" || !t.type) {
        const cat = t.category || "Lainnya";
        map[cat] = (map[cat] || 0) + 1;
      }
    });
    return map;
  }, [transactions]);

  // Cari alert yang perlu ditampilkan
  const alerts = useMemo(() => {
    return (budgets || [])
      .filter(b => b.limit_amount > 0)
      .map(b => {
        const spent = spentByCategory[b.category_name] || 0;
        const pct   = (spent / b.limit_amount) * 100;
        const count = countByCategory[b.category_name] || 0;
        const dismissedAt = dismissed[b.category_name];

        // Tampilkan jika:
        // 1. >= 80% terpakai, DAN
        // 2. Belum di-dismiss, ATAU sudah ada transaksi baru sejak dismiss
        const shouldShow = pct >= 80 &&
          (dismissedAt === undefined || count > dismissedAt);

        return { ...b, spent, pct, shouldShow, count };
      })
      .filter(a => a.shouldShow)
      .sort((a, b) => b.pct - a.pct); // yang paling over duluan
  }, [budgets, spentByCategory, countByCategory, dismissed]);

  const dismiss = (categoryName) => {
    const count = countByCategory[categoryName] || 0;
    setDismissed(prev => ({ ...prev, [categoryName]: count }));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 mt-3 mb-1">
      <AnimatePresence>
        {alerts.map(alert => {
          const isOver = alert.pct >= 100;
          return (
            <motion.div
              key={alert.category_name}
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-2xl border ${
                isOver
                  ? "bg-red-500/10 border-red-500/25"
                  : "bg-amber-500/10 border-amber-500/25"
              }`}
            >
              <AlertTriangle
                size={14}
                className={`shrink-0 mt-0.5 ${isOver ? "text-red-500" : "text-amber-500"}`}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-black ${isOver ? "text-red-500" : "text-amber-500"}`}>
                  {isOver ? "Anggaran Terlampaui!" : "Anggaran Hampir Habis"}
                </p>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="font-bold text-gray-700 dark:text-gray-300">{alert.category_name}</span>
                  {" · "}
                  {alert.pct.toFixed(0)}% terpakai
                  {" · "}
                  Rp {Number(alert.spent).toLocaleString("id-ID")} / Rp {Number(alert.limit_amount).toLocaleString("id-ID")}
                </p>
              </div>
              {/* Close button */}
              <button
                onClick={() => dismiss(alert.category_name)}
                className={`p-1 rounded-lg transition-colors shrink-0 ${
                  isOver
                    ? "text-red-400 hover:text-red-600 hover:bg-red-500/10"
                    : "text-amber-400 hover:text-amber-600 hover:bg-amber-500/10"
                }`}
              >
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
