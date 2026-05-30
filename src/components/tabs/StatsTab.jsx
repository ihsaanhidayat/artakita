"use client";
import { memo, useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { parseFlexibleNumber, fmt, CHART_COLORS } from "@/lib/utils";
import { STATS } from "@/lib/constants";
import { ChevronDown, Target, AlertTriangle, CheckCircle2, Edit3, Save, X, Loader2 } from "lucide-react";

const getHealth = (exp, inc) => {
  if (inc === 0 && exp === 0) return { grade: "-",  color: "text-gray-400",   bar: "bg-gray-400",   pct: 0,   msg: STATS.GRADE["-"] };
  if (inc === 0 && exp > 0)  return { grade: "F",  color: "text-red-500",    bar: "bg-red-500",    pct: 100, msg: STATS.GRADE.F };
  const r = exp / inc;
  if (r >= 0.9) return { grade: "D", color: "text-red-500",    bar: "bg-red-500",    pct: Math.min(r*100,100), msg: STATS.GRADE.D };
  if (r >= 0.7) return { grade: "C", color: "text-orange-500", bar: "bg-orange-500", pct: r*100,               msg: STATS.GRADE.C };
  if (r >= 0.5) return { grade: "B", color: "text-blue-500",   bar: "bg-blue-500",   pct: r*100,               msg: STATS.GRADE.B };
  return              { grade: "A", color: "text-emerald-500", bar: "bg-emerald-500",pct: r*100,               msg: STATS.GRADE.A };
};

const StatsTab = memo(function StatsTab({ filteredTransactions, transactions, selectedMonth, balance }) {
  const [section,       setSection]       = useState("pengeluaran");
  const [catExpanded,   setCatExpanded]   = useState(false);  // collapsed default
  const [allocExpanded, setAllocExpanded] = useState(false);  // collapsed default
  const [budgets,       setBudgets]       = useState([]);
  const [editingBudget, setEditingBudget] = useState(null);
  const [editVal,       setEditVal]       = useState("");
  const [isSaving,      setIsSaving]      = useState(false);

  const fetchBudgets = useCallback(async () => {
    const { data } = await supabase.from("budgets").select("*").eq("month_year", selectedMonth);
    if (data) setBudgets(data);
  }, [selectedMonth]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const { statsData, totalExpense, totalIncome, health } = useMemo(() => {
    const safe     = Array.isArray(filteredTransactions) ? filteredTransactions : [];
    const expenses = safe.filter(t => t?.type === "expense" || !t?.type);
    const incomes  = safe.filter(t => t?.type === "income");
    const data     = expenses.reduce((acc, t) => {
      const amt = Number(t.amount) || 0;
      const cat = t.category || "Lainnya";
      const ex  = acc.find(i => i.name === cat);
      if (ex) ex.value += amt; else acc.push({ name: cat, value: amt });
      return acc;
    }, []).sort((a, b) => b.value - a.value);
    const totExp = data.reduce((s, i) => s + i.value, 0);
    const totInc = incomes.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return { statsData: data, totalExpense: totExp, totalIncome: totInc, health: getHealth(totExp, totInc) };
  }, [filteredTransactions]);

  const { allStatsData, allCategories, budgetMap, totalAlokasi, sisaSaldo, isOver } = useMemo(() => {
    const allExp  = (Array.isArray(transactions) ? transactions : []).filter(t => t?.type === "expense" || !t?.type);
    const allData = allExp.reduce((acc, t) => {
      const amt = Number(t.amount) || 0;
      const cat = t.category || "Lainnya";
      const ex  = acc.find(i => i.name === cat);
      if (ex) ex.value += amt; else acc.push({ name: cat, value: amt });
      return acc;
    }, []).sort((a, b) => b.value - a.value);
    const cats    = allData.map(s => s.name);
    const bMap    = budgets.reduce((acc, b) => { acc[b.category_name] = Number(b.limit_amount); return acc; }, {});
    const totAlok = cats.reduce((sum, cat) => sum + (bMap[cat] || 0), 0);
    return { allStatsData: allData, allCategories: cats, budgetMap: bMap, totalAlokasi: totAlok, sisaSaldo: balance - totAlok, isOver: totAlok > balance };
  }, [transactions, budgets, balance]);

  const handleSaveBudget = useCallback(async () => {
    if (!editingBudget) return;
    const newLimit = Math.abs(parseFlexibleNumber(editVal));
    setIsSaving(true);
    try {
      const { data: ex } = await supabase.from("budgets").select("id").eq("category_name", editingBudget.category).eq("month_year", selectedMonth).single();
      if (ex) await supabase.from("budgets").update({ limit_amount: newLimit }).eq("id", ex.id);
      else    await supabase.from("budgets").insert([{ category_name: editingBudget.category, limit_amount: newLimit, month_year: selectedMonth }]);
      await fetchBudgets();
      setEditingBudget(null); setEditVal("");
    } finally { setIsSaving(false); }
  }, [editingBudget, editVal, selectedMonth, fetchBudgets]);

  const handleDeleteBudget = useCallback(async () => {
    if (!editingBudget) return;
    setIsSaving(true);
    const { data: ex } = await supabase.from("budgets").select("id").eq("category_name", editingBudget.category).eq("month_year", selectedMonth).single();
    if (ex) await supabase.from("budgets").delete().eq("id", ex.id);
    await fetchBudgets();
    setEditingBudget(null); setIsSaving(false);
  }, [editingBudget, selectedMonth, fetchBudgets]);

  return (
    <motion.div
      key="stats"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="pt-8 px-3 pb-32 h-[100dvh] overflow-y-auto no-scrollbar w-full"
    >
      <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-5">{STATS.TITLE}</h2>

      {/* Sub-tab */}
      <div className="flex bg-gray-100 dark:bg-[#121827] p-1 rounded-[14px] mb-5 border border-gray-200 dark:border-gray-800/60 shadow-inner">
        {[
          { key: "pengeluaran", label: STATS.TAB_EXPENSE },
          { key: "alokasi",     label: STATS.TAB_ALLOCATION },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setSection(key)}
            className={`flex-1 text-[9px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all duration-200 ${
              section === key ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm" : "text-gray-400"
            }`}
          >{label}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── PENGELUARAN ── */}
        {section === "pengeluaran" && (
          <motion.div key="pengeluaran"
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.15 }} className="space-y-4"
          >
            {/* Hero card — grade + pengeluaran + pemasukan dalam 1 card */}
            <div className="bg-white dark:bg-[#121827] border border-gray-100 dark:border-gray-800/60 rounded-[28px] p-5 shadow-sm overflow-hidden relative">
              {/* Accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${health.bar} opacity-60`} />

              {/* Grade + message */}
              <div className="flex items-center gap-4 mb-5">
                <div className={`w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-2xl font-black shrink-0 ${health.color}`}>
                  {health.grade}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{STATS.HEALTH_TITLE}</p>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 leading-snug">{health.msg}</p>
                </div>
              </div>

              {/* Rasio bar */}
              {totalIncome > 0 && (
                <div className="mb-5">
                  <div className="flex justify-between text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    <span>Pengeluaran vs Pemasukan</span>
                    <span className={health.color}>{Math.min(100, (totalExpense / totalIncome * 100)).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (totalExpense / totalIncome) * 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full ${health.bar}`}
                    />
                  </div>
                </div>
              )}

              {/* Pengeluaran + Pemasukan */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-500/8 dark:bg-red-500/10 rounded-2xl p-3">
                  <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1">{STATS.TOTAL_EXPENSE}</p>
                  <p className="text-base font-black text-red-500">Rp {fmt(totalExpense)}</p>
                </div>
                <div className="bg-green-500/8 dark:bg-green-500/10 rounded-2xl p-3">
                  <p className="text-[8px] font-black text-green-500 uppercase tracking-widest mb-1">{STATS.TOTAL_INCOME}</p>
                  <p className="text-base font-black text-green-500">Rp {fmt(totalIncome)}</p>
                </div>
              </div>
            </div>

            {/* Rincian Kategori — collapsed default */}
            <div className="bg-white dark:bg-[#121827] rounded-[24px] border border-gray-100 dark:border-gray-800/60 shadow-sm overflow-hidden">
              <button onClick={() => setCatExpanded(!catExpanded)}
                className="w-full flex items-center justify-between p-5"
              >
                <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">{STATS.CATEGORY_DETAIL}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-gray-400">{statsData.length} kategori</span>
                  <motion.div animate={{ rotate: catExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={16} className="text-gray-400" /></motion.div>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {catExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }} className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800/50 space-y-0">
                      {statsData.length > 0 ? statsData.map((item, idx) => {
                        const pct = totalExpense > 0 ? Math.min(100, ((item.value / totalExpense) * 100)) : 0;
                        return (
                          <div key={item.name} className="pt-4">
                            <div className="flex justify-between items-end mb-2">
                              <div>
                                <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{item.name}</p>
                                <p className="text-[9px] font-black text-gray-400">{pct.toFixed(1)}%</p>
                              </div>
                              <p className="font-black text-sm text-gray-900 dark:text-white">Rp {item.value.toLocaleString("id-ID")}</p>
                            </div>
                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.7, ease: "easeOut", delay: idx * 0.05 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                              />
                            </div>
                          </div>
                        );
                      }) : (
                        <p className="text-center py-8 text-[9px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.4em]">{STATS.NO_DATA}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── ALOKASI ── */}
        {section === "alokasi" && (
          <motion.div key="alokasi"
            initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }} className="space-y-4"
          >
            {/* Saldo overview */}
            <div className="bg-white dark:bg-[#121827] border border-gray-100 dark:border-gray-800/60 rounded-[24px] p-5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Saldo Dompet</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">Rp {fmt(balance)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{STATS.ALLOCATION}</p>
                  <p className={`text-xl font-black ${isOver ? "text-red-500" : "text-blue-500"}`}>Rp {fmt(totalAlokasi)}</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isOver ? "bg-red-500/10 border border-red-500/20" : "bg-green-500/10 border border-green-500/20"}`}>
                {isOver ? <AlertTriangle size={14} className="text-red-500 shrink-0" /> : <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
                <p className={`text-[10px] font-bold ${isOver ? "text-red-500" : "text-green-500"}`}>
                  {isOver ? `Alokasi melebihi saldo! Kelebihan Rp ${fmt(Math.abs(sisaSaldo))}` : `${STATS.AFTER_ALLOC}: Rp ${fmt(sisaSaldo)}`}
                </p>
              </div>
            </div>

            {/* Alokasi per kategori — collapsed default */}
            <div className="bg-white dark:bg-[#121827] rounded-[24px] border border-gray-100 dark:border-gray-800/60 shadow-sm overflow-hidden">
              <button onClick={() => setAllocExpanded(!allocExpanded)}
                className="w-full flex items-center justify-between p-5"
              >
                <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">{STATS.ALLOCATION}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-gray-400">{allCategories.length} kategori</span>
                  <motion.div animate={{ rotate: allocExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={16} className="text-gray-400" /></motion.div>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {allocExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }} className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800/50 space-y-2.5 pt-4">
                      {allCategories.length === 0 ? (
                        <p className="text-center py-6 text-[9px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.4em]">{STATS.NO_DATA}</p>
                      ) : allCategories.map((cat, idx) => {
                        const spent = allStatsData.find(s => s.name === cat)?.value || 0;
                        const limit = budgetMap[cat] || 0;
                        const pct   = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
                        const sisa  = Math.max(0, limit - spent);
                        const isOver= spent > limit && limit > 0;
                        const barC  = isOver ? "bg-red-500" : pct >= 80 ? "bg-red-400" : pct >= 50 ? "bg-amber-400" : "bg-emerald-500";
                        const noLim = limit === 0;
                        return (
                          <div key={cat} className={`bg-gray-50 dark:bg-gray-900/40 rounded-[18px] p-4 ${isOver ? "border border-red-200 dark:border-red-900/40" : ""}`}>
                            <div className="flex justify-between items-start mb-2.5">
                              <div className="min-w-0 flex-1">
                                <p className="font-black text-sm text-gray-900 dark:text-white">{cat}</p>
                                <p className="text-[9px] text-gray-400 mt-0.5">
                                  {noLim ? `Terpakai: Rp ${fmt(spent)}` : `Rp ${fmt(spent)} / Rp ${fmt(limit)}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {!noLim && (
                                  <span className={`text-xs font-black ${isOver ? "text-red-500" : pct >= 80 ? "text-red-400" : "text-gray-500"}`}>
                                    {pct.toFixed(0)}%
                                  </span>
                                )}
                                <button onClick={() => { setEditingBudget({ category: cat, currentLimit: limit }); setEditVal(limit > 0 ? String(limit) : ""); }}
                                  className="p-1.5 text-gray-400 hover:text-blue-500 bg-white dark:bg-gray-800 rounded-xl transition-colors">
                                  <Edit3 size={12} />
                                </button>
                              </div>
                            </div>
                            {!noLim && (
                              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.7, ease: "easeOut", delay: idx * 0.04 }}
                                  className={`h-full rounded-full ${barC}`}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal Edit Budget ── */}
      <AnimatePresence>
        {editingBudget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) { setEditingBudget(null); setEditVal(""); } }}
          >
            <motion.div
              initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg bg-white dark:bg-[#0a0f1c] border-t border-gray-100 dark:border-gray-800 rounded-t-[32px] p-6 shadow-2xl"
            >
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{STATS.SET_LIMIT}</h3>
                  <p className="text-[10px] font-bold text-blue-400 mt-0.5 uppercase tracking-widest">{editingBudget.category}</p>
                </div>
                <button onClick={() => { setEditingBudget(null); setEditVal(""); }} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors"><X size={16} /></button>
              </div>
              <input
                type="text" autoFocus
                placeholder={STATS.LIMIT_HINT}
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSaveBudget(); }}
                className="w-full bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold text-sm p-4 rounded-2xl outline-none focus:border-blue-500 transition-all placeholder-gray-400 mb-4"
              />
              <p className="text-[9px] text-gray-400 mb-4 ml-1">Format: 500k · 1jt · 1.5jt · atau angka biasa</p>
              <div className="flex gap-2">
                {editingBudget.currentLimit > 0 && (
                  <button onClick={handleDeleteBudget} disabled={isSaving}
                    className="px-4 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50">
                    {STATS.DELETE_LIMIT}
                  </button>
                )}
                <button onClick={handleSaveBudget} disabled={isSaving || !editVal.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-blue-500/30">
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {isSaving ? "Menyimpan..." : STATS.SAVE_LIMIT}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default StatsTab;
