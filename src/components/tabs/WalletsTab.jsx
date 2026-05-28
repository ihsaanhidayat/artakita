"use client";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownCircle, CreditCard, Edit3, Trash2 } from "lucide-react";
import { THEME_GRADIENTS } from "@/lib/utils";

export default function WalletsTab({
  wallets, activeWallet, setActiveWallet, setActiveTab,
  session,
  onEditWallet, onShareWallet,
  onNewWallet,
  goals, isNewGoalOpen, setIsNewGoalOpen,
  newGoalData, setNewGoalData,
  handleAddGoal,
  activeGoalInput, setActiveGoalInput,
  flexibleSavingsAmount, setFlexibleSavingsAmount,
  handleModifySavings, triggerDeleteGoal,
}) {
  return (
    <motion.div
      key="wallets"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="pt-8 px-3 pb-32 h-[100dvh] overflow-y-auto no-scrollbar w-full flex flex-col"
    >
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight flex-none">
        Pilih Dompet
      </h2>

      <div className="space-y-4 mb-10">
        {wallets.length === 0 && (
          <p className="text-center text-xs font-bold text-gray-500">Memuat Rekening...</p>
        )}

        {wallets.map((wallet, idx) => {
          const isOwner = session?.user?.id === wallet.user_id;
          const isActive = activeWallet.id === wallet.id;
          return (
            <motion.div
              key={wallet.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setActiveWallet({ id: wallet.id, name: wallet.name }); setActiveTab("home"); }}
              className={`w-full text-left relative overflow-hidden rounded-[32px] p-6 transition-all border-2 cursor-pointer ${
                isActive
                  ? "border-blue-500 shadow-xl shadow-blue-500/20"
                  : "border-transparent shadow-lg hover:border-gray-300 dark:hover:border-gray-700"
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${THEME_GRADIENTS[idx % THEME_GRADIENTS.length]} opacity-90`} />
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -left-8 -bottom-8 w-24 h-24 rounded-full bg-black/10 blur-xl" />

              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.3em] mb-1">
                    {isOwner ? "Rekening Pribadi" : "🤝 Rekening Dibagikan"}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-white text-2xl font-bold tracking-tight">
                      {wallet.name}
                      {!isOwner && <span className="text-sm font-normal opacity-80 ml-1">(Shared)</span>}
                    </h3>
                    {isActive && (
                      <span className="px-2.5 py-1 rounded-lg bg-white/20 border border-white/40 text-white text-[9px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                        Aktif
                      </span>
                    )}
                    {isOwner && (
                      <div className="flex gap-1.5 opacity-60 hover:opacity-100 transition-opacity ml-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditWallet(wallet); }}
                          className="p-1.5 bg-white/20 rounded-full hover:bg-white/40 transition-colors backdrop-blur-md"
                        >
                          <Edit3 size={12} className="text-white" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onShareWallet(wallet); }}
                          className="p-1.5 bg-white/20 rounded-full hover:bg-white/40 transition-colors backdrop-blur-md"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md bg-white/20 border border-white/30 text-white ${isActive ? "opacity-100" : "opacity-50"}`}>
                  {isActive ? <ArrowDownCircle size={20} /> : <CreditCard size={20} />}
                </div>
              </div>
            </motion.div>
          );
        })}

        <button
          onClick={onNewWallet}
          className="w-full p-5 rounded-[24px] border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400 hover:text-blue-500 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
        >
          <span>+</span> Tambah Rekening Baru
        </button>
      </div>

      {/* Celengan / Savings Goals */}
      <div className="border-t border-gray-100 dark:border-gray-800/80 pt-8 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-600 tracking-[0.3em] uppercase">
            Target Impian (Celengan)
          </h2>
          <button
            onClick={() => setIsNewGoalOpen(!isNewGoalOpen)}
            className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all active:scale-95"
          >
            {isNewGoalOpen ? "Batal" : "+ Target"}
          </button>
        </div>

        <AnimatePresence>
          {isNewGoalOpen && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddGoal}
              className="bg-gray-50 dark:bg-gray-900/40 p-5 rounded-[24px] border border-gray-100 dark:border-gray-800/50 space-y-3 mb-6 overflow-hidden"
            >
              <input
                type="text" required
                placeholder="Nama impian (Cth: Laptop Baru, Dana Darurat)"
                value={newGoalData.name}
                onChange={(e) => setNewGoalData({ ...newGoalData, name: e.target.value })}
                className="w-full bg-white dark:bg-[#121827] border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-4 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text" required
                  placeholder="Target (Cth: 5jt, 500k)"
                  value={newGoalData.target}
                  onChange={(e) => setNewGoalData({ ...newGoalData, target: e.target.value })}
                  className="w-full bg-white dark:bg-[#121827] border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-4 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Isi Awal (Opsional)"
                  value={newGoalData.current}
                  onChange={(e) => setNewGoalData({ ...newGoalData, current: e.target.value })}
                  className="w-full bg-white dark:bg-[#121827] border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-4 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md transition-all">
                Simpan Target
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {goals.map((goal) => {
          const pct         = Math.min(100, ((goal.current_amount / goal.target_amount) * 100)).toFixed(0);
          const isInputOpen = activeGoalInput === goal.id;
          return (
            <div key={goal.id} className="bg-white dark:bg-[#121827] p-5 rounded-[24px] border border-gray-100 dark:border-gray-800/60 shadow-sm relative overflow-hidden mb-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white tracking-tight">{goal.name}</p>
                  <p className="text-[10px] text-gray-400 font-normal mt-0.5">
                    Rp {Number(goal.current_amount).toLocaleString("id-ID")} /{" "}
                    <span className="font-bold text-gray-500 dark:text-gray-400">
                      Rp {Number(goal.target_amount).toLocaleString("id-ID")}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-blue-500 mr-2">{pct}%</span>
                  <button onClick={() => triggerDeleteGoal(goal.id, goal.name)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-3 mb-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                />
              </div>

              <div className="pt-2 border-t border-gray-50 dark:border-gray-800/40">
                {!isInputOpen ? (
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setActiveGoalInput(goal.id)}
                      className="text-[9px] font-black text-blue-500 bg-blue-500/10 border border-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500 hover:text-white transition-all uppercase tracking-wider"
                    >
                      Mutasi Saldo
                    </button>
                    <button
                      onClick={() => handleModifySavings(goal.id, goal.current_amount, "reset")}
                      className="text-[9px] font-black text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider"
                    >
                      Reset Nominal
                    </button>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Isi angka (Cth: 10k, 50k, 1jt)"
                      value={flexibleSavingsAmount}
                      onChange={(e) => setFlexibleSavingsAmount(e.target.value)}
                      className="flex-1 bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-xl py-2 px-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500"
                    />
                    <button onClick={() => handleModifySavings(goal.id, goal.current_amount, "add")} className="px-3 py-2 bg-green-600 text-white font-black text-[9px] uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all">
                      + Tabung
                    </button>
                    <button onClick={() => handleModifySavings(goal.id, goal.current_amount, "subtract")} className="px-3 py-2 bg-red-600 text-white font-black text-[9px] uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all">
                      - Pakai
                    </button>
                    <button onClick={() => { setActiveGoalInput(null); setFlexibleSavingsAmount(""); }} className="p-2 text-gray-400 hover:text-gray-600 text-xs font-bold">
                      Batal
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          );
        })}

        {goals.length === 0 && !isNewGoalOpen && (
          <div className="text-center py-10 bg-gray-50/50 dark:bg-gray-900/10 rounded-[24px] border border-dashed border-gray-200 dark:border-gray-800">
            <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.4em]">Belum Ada Target</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
