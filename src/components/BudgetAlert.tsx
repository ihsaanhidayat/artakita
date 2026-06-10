"use client";
import { memo, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import type { Transaction } from "@/types";

interface Budget {
  category_name: string;
  limit_amount: number;
}

interface BudgetAlertProps {
  budgets?: Budget[];
  transactions?: Transaction[];
}

const BudgetAlert = function BudgetAlert({ budgets = [], transactions = [] }: BudgetAlertProps) {
  const [dismissed, setDismissed] = useState<Record<string, number>>({});

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    (transactions || []).forEach(t => {
      if (t.type === "expense" || !t.type) {
        const cat = t.category || "Lainnya";
        map[cat] = (map[cat] || 0) + Number(t.amount);
      }
    });
    return map;
  }, [transactions]);

  const countByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    (transactions || []).forEach(t => {
      if (t.type === "expense" || !t.type) {
        const cat = t.category || "Lainnya";
        map[cat] = (map[cat] || 0) + 1;
      }
    });
    return map;
  }, [transactions]);

  const alerts = useMemo(() => {
    return (budgets || [])
      .filter(b => b.limit_amount > 0)
      .map(b => {
        const spent = spentByCategory[b.category_name] || 0;
        const pct   = (spent / b.limit_amount) * 100;
        const count = countByCategory[b.category_name] || 0;
        const dismissedAt = dismissed[b.category_name];
        const shouldShow = pct >= 80 && (dismissedAt === undefined || count > dismissedAt);
        return { ...b, spent, pct, shouldShow, count };
      })
      .filter(a => a.shouldShow)
      .sort((a, b) => b.pct - a.pct);
  }, [budgets, spentByCategory, countByCategory, dismissed]);

  const dismiss = (cat: string): void => setDismissed(prev => ({ ...prev, [cat]: countByCategory[cat] || 0 }));

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 mt-3 mb-1">
      <AnimatePresence>
        {alerts.map(alert => {
          const isOver = alert.pct >= 100;
          const accentColor = isOver ? "var(--a2)" : "var(--a1)";
          const bgColor = isOver
            ? "color-mix(in srgb, var(--a2) 8%, transparent)"
            : "color-mix(in srgb, var(--a1) 7%, transparent)";
          const borderColor = isOver
            ? "color-mix(in srgb, var(--a2) 22%, transparent)"
            : "color-mix(in srgb, var(--a1) 20%, transparent)";

          return (
            <motion.div
              key={alert.category_name}
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex items-start gap-3 px-3 py-2.5 rounded-2xl"
              style={{ background: bgColor, border: `1px solid ${borderColor}` }}
            >
              <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: accentColor }} />
              <div className="flex-1 min-w-0">
                <p className="text-caption font-black" style={{ color: accentColor }}>
                  {isOver ? "Anggaran Terlampaui" : "Anggaran Hampir Habis"}
                </p>
                <p className="text-label mt-0.5 ds-t3 ff-mono">
                  <span className="ds-t2 font-bold">{alert.category_name}</span>
                  {" · "}{alert.pct.toFixed(0)}% terpakai
                  {" · "}Rp {Number(alert.spent).toLocaleString("id-ID")} / Rp {Number(alert.limit_amount).toLocaleString("id-ID")}
                </p>
              </div>
              <button
                onClick={() => dismiss(alert.category_name)}
                className="p-1.5 rounded-xl transition-colors shrink-0 ds-t3 hover:ds-t2"
                style={{ background: "var(--bg-3)", border: "1px solid var(--border)" }}
              >
                <X size={12} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default memo(BudgetAlert);
