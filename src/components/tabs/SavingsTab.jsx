"use client";
import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import { fmt } from "@/lib/utils";
import CategoryPills from "@/components/CategoryPills";

const SavingsTab = memo(function SavingsTab({
 goals, setGoals,
 isNewGoalOpen, setIsNewGoalOpen,
 newGoalData, setNewGoalData,
 handleAddGoal,
 activeGoalInput, setActiveGoalInput,
 flexibleSavingsAmt, setFlexibleSavingsAmt,
 handleModifySavings, triggerDeleteGoal,
}) {
 return (
 <div className="px-3 pb-32 pt-2">

 {/* Header + tombol tambah */}
 <div className="flex justify-between items-center mb-5">
 <p className="text-[9px] font-black ds-t3 uppercase tracking-[0.3em]">
 Target Impian
 </p>
 <button
 onClick={() => setIsNewGoalOpen(!isNewGoalOpen)}
 className="px-3 py-1.5 ds-aurora-bg border ds-aurora-border-c ds-aurora-text font-black text-[9px] uppercase tracking-widest rounded-xl transition-all active:scale-95"
 >
 {isNewGoalOpen ? "Batal" : "+ Target"}
 </button>
 </div>

 {/* Form tambah target */}
 <AnimatePresence>
 {isNewGoalOpen && (
 <motion.form
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: "auto" }}
 exit={{ opacity: 0, height: 0 }}
 onSubmit={handleAddGoal}
 className="ds-bg-3 p-5 rounded-[24px] border ds-border space-y-3 mb-5 overflow-hidden"
 >
 <input
 type="text" required
 placeholder="Nama target (Cth: Laptop, Dana Darurat)"
 value={newGoalData.name ?? ""}
 onChange={e => setNewGoalData(p => ({ ...p, name: e.target.value }))}
 className="w-full ds-bg-1 border ds-border rounded-xl py-2.5 px-4 text-sm font-bold ds-t1 outline-none focus:border-blue-500 transition-all placeholder-gray-400"
 />
 <div className="grid grid-cols-2 gap-3">
 <input
 type="text" required
 placeholder="Target (Cth: 5jt)"
 value={newGoalData.target ?? ""}
 onChange={e => setNewGoalData(p => ({ ...p, target: e.target.value }))}
 className="w-full ds-bg-1 border ds-border rounded-xl py-2.5 px-4 text-sm font-bold ds-t1 outline-none focus:border-blue-500 transition-all placeholder-gray-400"
 />
 <input
 type="text"
 placeholder="Isi awal (opsional)"
 value={newGoalData.current ?? ""}
 onChange={e => setNewGoalData(p => ({ ...p, current: e.target.value }))}
 className="w-full ds-bg-1 border ds-border rounded-xl py-2.5 px-4 text-sm font-bold ds-t1 outline-none focus:border-blue-500 transition-all placeholder-gray-400"
 />
 </div>
 <button
 type="submit"
 className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md transition-all"
 >
 Simpan Target
 </button>
 </motion.form>
 )}
 </AnimatePresence>

 {/* Goal list */}
 <div className="space-y-3">
 {goals.map(goal => {
 const pct = Math.min(100, ((goal.current_amount / goal.target_amount) * 100)).toFixed(0);
 const isOpen = activeGoalInput === goal.id;
 const barColor = Number(pct) >= 100 ? "from-emerald-500 to-emerald-600"
 : Number(pct) >= 70 ? "from-blue-500 to-indigo-500"
 : Number(pct) >= 40 ? "from-amber-400 to-orange-500"
 : "from-blue-500 to-indigo-500";

 return (
 <div
 key={goal.id}
 className="ds-bg-1 p-5 rounded-[24px] border ds-border shadow-sm"
 >
 <div className="flex justify-between items-start mb-3">
 <div className="min-w-0 flex-1">
 <p className="font-black text-sm ds-t1 truncate">{goal.name}</p>
 <p className="text-[9px] ds-t3 mt-0.5">
 Rp {fmt(goal.current_amount)}
 <span className="ds-t3 mx-1">/</span>
 <span className="font-bold ds-t2">Rp {fmt(goal.target_amount)}</span>
 </p>
 </div>
 <div className="flex items-center gap-2 shrink-0 ml-2">
 <span className="text-xs font-black ds-aurora-text">{pct}%</span>
 <button
 onClick={() => triggerDeleteGoal(goal.id)}
 className="p-1.5 ds-t3 hover:text-red-500 transition-colors"
 >
 <Trash2 size={13} />
 </button>
 </div>
 </div>

 {/* Progress bar */}
 <div className="w-full h-2 ds-bg-3 rounded-full overflow-hidden mt-2 mb-4">
 <motion.div
 initial={{ width: 0 }}
 animate={{ width: `${pct}%` }}
 transition={{ duration: 1, ease: "easeOut" }}
 className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
 />
 </div>

 {/* Actions */}
 {!isOpen ? (
 <div className="flex justify-between items-center">
 <button
 onClick={() => setActiveGoalInput(goal.id)}
 className="text-[9px] font-black ds-aurora-text ds-aurora-bg border border-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500 hover:text-white transition-all uppercase tracking-wider"
 >
 Mutasi Saldo
 </button>
 <button
 onClick={() => handleModifySavings(goal.id, goal.current_amount, "reset")}
 className="text-[9px] font-black ds-t3 hover:text-red-500 px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider"
 >
 Reset
 </button>
 </div>
 ) : (
 <motion.div
 initial={{ opacity: 0, y: -4 }}
 animate={{ opacity: 1, y: 0 }}
 className="flex gap-2 items-center"
 >
 <input
 type="text"
 autoFocus
 placeholder="Nominal (Cth: 10k, 50k)"
 value={flexibleSavingsAmt ?? ""}
 onChange={e => setFlexibleSavingsAmt(e.target.value)}
 className="flex-1 ds-bg-3 border ds-border rounded-xl py-2 px-3 text-xs font-bold ds-t1 outline-none focus:border-blue-500 transition-all"
 />
 <button
 onClick={() => handleModifySavings(goal.id, goal.current_amount, "add")}
 className="px-3 py-2 bg-green-600 text-white font-black text-[9px] uppercase tracking-wider rounded-xl active:scale-95 transition-all"
 >
 + Tabung
 </button>
 <button
 onClick={() => handleModifySavings(goal.id, goal.current_amount, "subtract")}
 className="px-3 py-2 bg-red-600 text-white font-black text-[9px] uppercase tracking-wider rounded-xl active:scale-95 transition-all"
 >
 - Pakai
 </button>
 <button
 onClick={() => { setActiveGoalInput(null); setFlexibleSavingsAmt(""); }}
 className="p-2 ds-t3 hover:ds-t2 text-xs font-bold"
 >
 Batal
 </button>
 </motion.div>
 )}
 </div>
 );
 })}

 {goals.length === 0 && !isNewGoalOpen && (
 <div className="text-center py-14 ds-bg-1/10 rounded-[28px] border border-dashed ds-border">
 <p className="text-[9px] font-black ds-t3 uppercase tracking-[0.4em]">
 Belum Ada Target
 </p>
 </div>
 )}
 </div>
 </div>
 );
});

export default SavingsTab;
