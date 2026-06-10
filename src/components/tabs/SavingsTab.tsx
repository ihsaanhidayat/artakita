"use client";
import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import { fmt } from "@/lib/utils";
import type { SavingsGoal, ActiveWallet } from "@/types";

interface SavingsTabProps {
  goals: SavingsGoal[];
  activeGoalInput: string | null;
  setActiveGoalInput: (id: string | null) => void;
  flexibleSavingsAmt: string;
  setFlexibleSavingsAmt: (v: string) => void;
  handleModifySavings: (id: string, currentAmt: number, mode: "add" | "subtract" | "reset") => void;
  onDeleteGoal: (id: string) => Promise<void>;
  activeWallet: ActiveWallet | null;
  refreshKey?: number;
}

const SavingsTab = memo(function SavingsTab({
  goals, activeGoalInput, setActiveGoalInput,
  flexibleSavingsAmt, setFlexibleSavingsAmt,
  handleModifySavings, onDeleteGoal, activeWallet,
}: SavingsTabProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  return (
    <div className="px-3 pb-32 pt-2">
      <div className="mb-5 flex-none">
        <h2 className="text-[26px] font-light tracking-[-1.5px] leading-none ds-t1">Celengan &amp; Target</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="ds-live-dot" />
          <p className="text-caption font-black tracking-[0.14em] uppercase ds-aurora-text">{activeWallet?.name}</p>
        </div>
      </div>

      <div className="space-y-3">
        {goals.map(goal => {
          const pct = Math.min(100, ((goal.current_amount / goal.target_amount) * 100)).toFixed(0);
          const isOpen = activeGoalInput === goal.id;
          const barStyle: React.CSSProperties = Number(pct) >= 100
            ? { background: "var(--income)" }
            : Number(pct) >= 70
            ? { background: "linear-gradient(90deg, var(--a1), var(--a2))" }
            : Number(pct) >= 40
            ? { background: "linear-gradient(90deg, rgb(251,191,36), rgb(249,115,22))" }
            : { background: "linear-gradient(90deg, var(--a1), var(--a2))" };

          return (
            <div key={goal.id} className="relative overflow-hidden ds-bg-1 p-5 rounded-[24px] border ds-border shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-black text-sm ds-t1 truncate">{goal.name}</p>
                  <p className="text-label ds-t3 ff-mono mt-0.5">
                    Rp {fmt(goal.current_amount)}
                    <span className="ds-t3 mx-1">/</span>
                    <span className="font-bold ds-t2">Rp {fmt(goal.target_amount)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs font-black ds-aurora-text">{pct}%</span>
                  <button onClick={() => setDeleteConfirmId(goal.id)} className="p-1.5 ds-t3 hover:text-fuchsia-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="w-full h-2 ds-bg-3 rounded-full overflow-hidden mt-2 mb-4">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full rounded-full" style={barStyle} />
              </div>

              {!isOpen ? (
                <div className="flex justify-between items-center">
                  <button onClick={() => setActiveGoalInput(goal.id)} className="text-label font-black ds-aurora-text ds-aurora-bg border ds-aurora-border-c px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider">
                    Mutasi Saldo
                  </button>
                  <button onClick={() => handleModifySavings(goal.id, goal.current_amount, "reset")} className="text-label font-black ds-t3 hover:text-fuchsia-400 px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider">
                    Reset
                  </button>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 items-center">
                  <input type="text" autoFocus placeholder="Nominal (Cth: 10k, 50k)" value={flexibleSavingsAmt ?? ""}
                    onChange={e => setFlexibleSavingsAmt(e.target.value)}
                    className="flex-1 ds-bg-3 border ds-border rounded-xl py-2 px-3 text-xs font-bold ds-t1 outline-none focus:border-[var(--a1)] transition-all" />
                  <button onClick={() => handleModifySavings(goal.id, goal.current_amount, "add")} className="px-3 py-2 font-black text-label uppercase tracking-wider rounded-xl active:scale-95 transition-all" style={{ background: "var(--income)", color: "#0f172a" }}>
                    + Tabung
                  </button>
                  <button onClick={() => handleModifySavings(goal.id, goal.current_amount, "subtract")} className="px-3 py-2 text-white font-black text-label uppercase tracking-wider rounded-xl active:scale-95 transition-all" style={{ background: "color-mix(in srgb, var(--a3) 80%, #000)" }}>
                    - Pakai
                  </button>
                  <button onClick={() => { setActiveGoalInput(null); setFlexibleSavingsAmt(""); }} className="p-2 ds-t3 hover:ds-t2 text-xs font-bold">
                    Batal
                  </button>
                </motion.div>
              )}

              <AnimatePresence>
                {deleteConfirmId === goal.id && (
                  <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 280 }}
                    className="absolute inset-0 z-20 flex items-center justify-between px-5 backdrop-blur-md rounded-[24px]"
                    style={{ background: "color-mix(in srgb, var(--a3) 85%, var(--a2))", borderLeft: "3px solid var(--a3)", boxShadow: "inset 4px 0 20px color-mix(in srgb, var(--a3) 30%, transparent)" }}>
                    <div className="flex items-center gap-2">
                      <Trash2 size={15} className="text-white" />
                      <span className="text-[11px] font-black text-white uppercase tracking-widest">Hapus Permanen?</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 rounded-[10px] bg-white/20 text-white text-label font-black uppercase tracking-widest hover:bg-white/30 transition-colors">
                        Batal
                      </button>
                      <button onClick={() => void onDeleteGoal(goal.id).then(() => setDeleteConfirmId(null))} className="px-3 py-1.5 rounded-[10px] text-label font-black uppercase tracking-widest active:scale-95 transition-all" style={{ background: "rgba(255,255,255,0.9)", color: "var(--a2)" }}>
                        Hapus
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="text-center py-14 ds-bg-1/10 rounded-[28px] border border-dashed ds-border">
            <p className="text-label font-black ds-t3 uppercase tracking-[0.4em]">Belum Ada Target</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default SavingsTab;
