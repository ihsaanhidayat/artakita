"use client";
import { memo, useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { parseFlexibleNumber, fmt, CHART_COLORS } from "@/lib/utils";
import { STATS } from "@/lib/constants";
import {
  ChevronDown, PieChart, Target,
  AlertTriangle, CheckCircle2, Edit3,
  Save, X, Loader2
} from "lucide-react";

// ── Health Grade ──────────────────────────────────────────────────────────────
const getHealth = (exp, inc) => {
  if (inc === 0 && exp === 0) return { grade: "-",  color: "text-gray-400",   bg: "from-gray-500/10 to-transparent border-gray-500/20",    msg: STATS.GRADE["-"] };
  if (inc === 0 && exp > 0)  return { grade: "F",  color: "text-red-500",    bg: "from-red-500/20 to-red-500/5 border-red-500/30",        msg: STATS.GRADE.F };
  const r = exp / inc;
  if (r >= 0.9) return { grade: "D", color: "text-red-500",    bg: "from-red-500/20 to-red-500/5 border-red-500/30",        msg: STATS.GRADE.D };
  if (r >= 0.7) return { grade: "C", color: "text-orange-500", bg: "from-orange-500/20 to-orange-500/5 border-orange-500/30",msg: STATS.GRADE.C };
  if (r >= 0.5) return { grade: "B", color: "text-blue-500",   bg: "from-blue-500/20 to-blue-500/5 border-blue-500/30",     msg: STATS.GRADE.B };
  return              { grade: "A", color: "text-green-500",  bg: "from-green-500/20 to-green-500/5 border-green-500/30",  msg: STATS.GRADE.A };
};

// ── Budget Row ────────────────────────────────────────────────────────────────
const BudgetRow = memo(function BudgetRow({ category, spent, limit, index, onEdit }) {
  const pct       = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const sisa      = Math.max(0, limit - spent);
  const isOver    = spent > limit && limit > 0;
  const isDanger  = pct >= 80 && !isOver;
  const isWarn    = pct >= 50 && pct < 80;
  const noLimit   = limit === 0;

  const barColor  = isOver ? "bg-red-600" : isDanger ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-emerald-500";
  const pctColor  = isOver ? "text-red-500" : isDanger ? "text-red-400" : isWarn ? "text-amber-400" : "text-emerald-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`bg-white dark:bg-[#121827] border rounded-[20px] p-4 transition-all ${
        isOver   ? "border-red-200 dark:border-red-900/40 shadow-sm shadow-red-500/10"
        : noLimit ? "border-gray-100 dark:border-gray-800/40 opacity-60"
        :           "border-gray-100 dark:border-gray-800/60 shadow-sm"
      }`}
    >
      <div className="flex justify-between items-start mb-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="font-black text-sm text-gray-900 dark:text-white">{category}</p>
            {isOver && (
              <span className="flex items-center gap-1 text-[8px] font-black text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                <AlertTriangle size={8} /> {STATS.OVER_LIMIT}
              </span>
            )}
            {noLimit && (
              <span className="text-[8px] font-black text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                {STATS.NOT_SET}
              </span>
            )}
          </div>
          {!noLimit
            ? <p className="text-[9px] text-gray-400">Rp {fmt(spent)} / <span className="font-bold">Rp {fmt(limit)}</span></p>
            : <p className="text-[9px] text-gray-400">Terpakai: Rp {fmt(spent)}</p>
          }
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {!noLimit && (
            <div className="text-right mr-1">
              <p className={`text-xs font-black ${pctColor}`}>{pct.toFixed(0)}%</p>
              <p className="text-[9px] text-gray-400">{isOver ? "lebih" : `sisa Rp ${fmt(sisa)}`}</p>
            </div>
          )}
          <button
            onClick={() => onEdit(category, limit)}
            className="p-1.5 text-gray-400 hover:text-blue-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl transition-colors"
          >
            <Edit3 size={12} />
          </button>
        </div>
      </div>

      {!noLimit && (
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.05 }}
            className={`h-full rounded-full ${barColor} relative overflow-hidden`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
});

// ── Main ──────────────────────────────────────────────────────────────────────
const StatsTab = memo(function StatsTab({
  filteredTransactions, transactions,
  selectedMonth, balance,
}) {
  const [activeSection, setActiveSection]   = useState("pengeluaran");
  const [isCatExpanded, setIsCatExpanded]   = useState(true);
  const [budgets,        setBudgets]        = useState([]);
  const [editingBudget,  setEditingBudget]  = useState(null);
  const [editLimitVal,   setEditLimitVal]   = useState("");
  const [isSaving,       setIsSaving]       = useState(false);

  // Fetch budgets
  const fetchBudgets = useCallback(async () => {
    const { data } = await supabase.from("budgets").select("*").eq("month_year", selectedMonth);
    if (data) setBudgets(data);
  }, [selectedMonth]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const { statsData, totalExpense, totalIncome, health } = useMemo(() => {
    const safe     = Array.isArray(filteredTransactions) ? filteredTransactions : [];
    const expenses = safe.filter(t => t?.type === "expense" || !t?.type);
    const incomes  = safe.filter(t => t?.type === "income");
    const data     = expenses.reduce((acc, t) => {
      const amt = Number(t.amount) || 0;
      const cat = t.category || "Lainnya";
      const ex  = acc.find(i => i.name === cat);
      if (ex) ex.value += amt;
      else acc.push({ name: cat, value: amt });
      return acc;
    }, []).sort((a, b) => b.value - a.value);
    const totExp = data.reduce((s, i) => s + i.value, 0);
    const totInc = incomes.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return { statsData: data, totalExpense: totExp, totalIncome: totInc, health: getHealth(totExp, totInc) };
  }, [filteredTransactions]);

  const { allStatsData, allCategories, budgetMap, totalAlokasi, sisaSaldo, isOver } = useMemo(() => {
    const allExp = (Array.isArray(transactions) ? transactions : []).filter(t => t?.type === "expense" || !t?.type);
    const allData = allExp.reduce((acc, t) => {
      const amt = Number(t.amount) || 0;
      const cat = t.category || "Lainnya";
      const ex  = acc.find(i => i.name === cat);
      if (ex) ex.value += amt;
      else acc.push({ name: cat, value: amt });
      return acc;
    }, []).sort((a, b) => b.value - a.value);
    const cats   = allData.map(s => s.name);
    const bMap   = budgets.reduce((acc, b) => { acc[b.category_name] = Number(b.limit_amount); return acc; }, {});
    const totAlok = cats.reduce((sum, cat) => sum + (bMap[cat] || 0), 0);
    return {
      allStatsData: allData, allCategories: cats, budgetMap: bMap,
      totalAlokasi: totAlok, sisaSaldo: balance - totAlok, isOver: totAlok > balance
    };
  }, [transactions, budgets, balance]);

  // ── Save budget ────────────────────────────────────────────────────────────
  const handleSaveBudget = useCallback(async () => {
    if (!editingBudget) return;
    const newLimit = Math.abs(parseFlexibleNumber(editLimitVal));
    setIsSaving(true);
    try {
      const { data: ex } = await supabase
        .from("budgets")
        .select("id")
        .eq("category_name", editingBudget.category)
        .eq("month_year", selectedMonth)
        .single();

      if (ex) {
        await supabase.from("budgets").update({ limit_amount: newLimit }).eq("id", ex.id);
      } else {
        await supabase.from("budgets").insert([{
          category_name: editingBudget.category,
          limit_amount:  newLimit,
          month_year:    selectedMonth,
        }]);
      }
      await fetchBudgets();
      setEditingBudget(null);
      setEditLimitVal("");
    } finally {
      setIsSaving(false);
    }
  }, [editingBudget, editLimitVal, selectedMonth, fetchBudgets]);

  const handleDeleteBudget = useCallback(async () => {
    if (!editingBudget) return;
    setIsSaving(true);
    const { data: ex } = await supabase.from("budgets").select("id").eq("category_name", editingBudget.category).eq("month_year", selectedMonth).single();
    if (ex) await supabase.from("budgets").delete().eq("id", ex.id);
    await fetchBudgets();
    setEditingBudget(null);
    setIsSaving(false);
  }, [editingBudget, selectedMonth, fetchBudgets]);

  return (
    <motion.div
      key="stats"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="pt-8 px-3 pb-32 h-[100dvh] overflow-y-auto no-scrollbar w-full flex flex-col"
    >
      <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-5 flex-none">
        {STATS.TITLE}
      </h2>

      {/* Sub-tab */}
      <div className="flex bg-gray-100 dark:bg-[#121827] p-1 rounded-[14px] mb-5 border border-gray-200 dark:border-gray-800/60 shadow-inner flex-none">
        {[
          { key: "pengeluaran", label: STATS.TAB_EXPENSE, Icon: PieChart },
          { key: "alokasi",     label: STATS.TAB_ALLOCATION, Icon: Target },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex-1 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all duration-200 ${
              activeSection === key
                ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            }`}
          >
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      {/* ── Section A: Pengeluaran ── */}
      <AnimatePresence mode="wait">
        {activeSection === "pengeluaran" && (
          <motion.div
            key="pengeluaran"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
          >
            {/* Health grade */}
            <div className={`bg-gradient-to-br ${health.bg} rounded-[24px] p-5 border flex items-center justify-between`}>
              <div className="flex-1 pr-4">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{STATS.HEALTH_TITLE}</p>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-snug">{health.msg}</p>
              </div>
              <div className={`shrink-0 w-14 h-14 rounded-2xl bg-white dark:bg-[#121827] shadow-sm flex items-center justify-center text-2xl font-black ${health.color}`}>
                {health.grade}
              </div>
            </div>

            {/* Total */}
            <div className="bg-white dark:bg-[#121827] rounded-[28px] p-6 shadow-xl shadow-red-500/8 border border-gray-100 dark:border-gray-800/60 flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 via-orange-400 to-red-500 opacity-60" />
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">{STATS.TOTAL_EXPENSE}</p>
                <p className="text-3xl font-black text-red-500 tracking-tighter">
                  <span className="text-xl mr-0.5">Rp</span>{totalExpense.toLocaleString("id-ID")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{STATS.TOTAL_INCOME}</p>
                <p className="text-xl font-black text-green-500">Rp {fmt(totalIncome)}</p>
              </div>
            </div>

            {/* Collapsible category breakdown */}
            <div className="bg-white dark:bg-[#121827] rounded-[24px] border border-gray-100 dark:border-gray-800/60 shadow-sm overflow-hidden">
              <button
                onClick={() => setIsCatExpanded(!isCatExpanded)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <PieChart size={15} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">
                      {STATS.CATEGORY_DETAIL}
                    </p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{statsData.length} kategori</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isCatExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-gray-400"
                >
                  <ChevronDown size={18} />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isCatExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800/50 space-y-0">
                      {statsData.length > 0 ? statsData.map((item, idx) => {
                        const pct      = totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(1) : 0;
                        const barColor = CHART_COLORS[idx % CHART_COLORS.length];
                        return (
                          <div key={item.name} className="pt-4">
                            <div className="flex justify-between items-end mb-2">
                              <div>
                                <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{item.name}</p>
                                <p className="text-[9px] font-black text-gray-400 tracking-wider">{pct}%</p>
                              </div>
                              <p className="font-black text-sm text-gray-900 dark:text-white">
                                Rp {item.value.toLocaleString("id-ID")}
                              </p>
                            </div>
                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.07 }}
                                className="h-full rounded-full relative overflow-hidden"
                                style={{ backgroundColor: barColor }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
                              </motion.div>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="text-center py-8">
                          <p className="text-[9px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.4em]">
                            {STATS.NO_DATA}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── Section B: Alokasi ── */}
        {activeSection === "alokasi" && (
          <motion.div
            key="alokasi"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
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
                  <p className={`text-xl font-black ${isOver ? "text-red-500" : "text-blue-500"}`}>
                    Rp {fmt(totalAlokasi)}
                  </p>
                </div>
              </div>

              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                isOver
                  ? "bg-red-500/10 border border-red-500/20"
                  : "bg-green-500/10 border border-green-500/20"
              }`}>
                {isOver
                  ? <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  : <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                }
                <p className={`text-[10px] font-bold ${isOver ? "text-red-500" : "text-green-500"}`}>
                  {isOver
                    ? `Alokasi melebihi saldo! Kelebihan Rp ${fmt(Math.abs(sisaSaldo))}`
                    : `${STATS.AFTER_ALLOC}: Rp ${fmt(sisaSaldo)}`
                  }
                </p>
              </div>
            </div>

            {/* Warning */}
            <AnimatePresence>
              {isOver && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-red-500/10 border border-red-500/30 rounded-[20px] p-4 flex items-start gap-3"
                >
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-red-400 leading-relaxed">{STATS.WARNING_OVER}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Budget rows */}
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3 px-1">
                {STATS.ALLOCATION} — {allCategories.length} Kategori
              </p>
              {allCategories.length === 0 ? (
                <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-900/10 rounded-[24px] border border-dashed border-gray-200 dark:border-gray-800">
                  <p className="text-[9px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.4em]">
                    {STATS.NO_DATA}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {allCategories.map((cat, idx) => (
                    <BudgetRow
                      key={cat}
                      category={cat}
                      spent={allStatsData.find(s => s.name === cat)?.value || 0}
                      limit={budgetMap[cat] || 0}
                      index={idx}
                      onEdit={(category, currentLimit) => {
                        setEditingBudget({ category, currentLimit });
                        setEditLimitVal(currentLimit > 0 ? String(currentLimit) : "");
                      }}
                    />
                  ))}
                </div>
              )}
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
          >
            <motion.div
              initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-full max-w-lg bg-white dark:bg-[#0a0f1c] border-t border-gray-100 dark:border-gray-800 rounded-t-[32px] p-6 shadow-2xl pb-safe"
            >
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />

              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                    {STATS.SET_LIMIT}
                  </h3>
                  <p className="text-[10px] font-bold text-blue-400 mt-0.5 uppercase tracking-widest">
                    {editingBudget.category}
                  </p>
                </div>
                <button
                  onClick={() => { setEditingBudget(null); setEditLimitVal(""); }}
                  className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Info */}
              <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-3 mb-4 space-y-1">
                <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  <span>{STATS.USED_THIS_MONTH}</span>
                  <span>Rp {fmt(allStatsData.find(s => s.name === editingBudget.category)?.value || 0)}</span>
                </div>
                {editingBudget.currentLimit > 0 && (
                  <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    <span>{STATS.CURRENT_LIMIT}</span>
                    <span>Rp {fmt(editingBudget.currentLimit)}</span>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  {STATS.LIMIT_LABEL}
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder={STATS.LIMIT_HINT}
                  value={editLimitVal}
                  onChange={e => setEditLimitVal(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSaveBudget(); }}
                  className="w-full bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold text-sm p-4 rounded-2xl outline-none focus:border-blue-500 transition-all placeholder-gray-400"
                />
              </div>

              <div className="flex gap-2">
                {editingBudget.currentLimit > 0 && (
                  <button
                    onClick={handleDeleteBudget}
                    disabled={isSaving}
                    className="px-4 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50"
                  >
                    {STATS.DELETE_LIMIT}
                  </button>
                )}
                <button
                  onClick={handleSaveBudget}
                  disabled={isSaving || !editLimitVal.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-blue-500/30"
                >
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
