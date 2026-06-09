"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { parseFlexibleNumber, fmt, CHART_COLORS } from "@/lib/utils";
import {
  ChevronDown, TrendingDown, AlertTriangle,
  Target, CheckCircle2, Edit3, Save, X,
  PieChart, Wallet, Plus
} from "lucide-react";

// ── Health Grade ──────────────────────────────────────────────────────────────
const getHealthGrade = (totalExpense, totalIncome) => {
  const _a3bg   = { background: "linear-gradient(135deg, color-mix(in srgb, var(--a3) 15%, transparent), color-mix(in srgb, var(--a3) 3%, transparent))", borderColor: "color-mix(in srgb, var(--a3) 25%, transparent)" };
  const _a1bg   = { background: "linear-gradient(135deg, color-mix(in srgb, var(--a1) 15%, transparent), color-mix(in srgb, var(--a1) 3%, transparent))", borderColor: "color-mix(in srgb, var(--a1) 25%, transparent)" };
  const _incbg  = { background: "linear-gradient(135deg, color-mix(in srgb, var(--income) 15%, transparent), color-mix(in srgb, var(--income) 3%, transparent))", borderColor: "color-mix(in srgb, var(--income) 25%, transparent)" };
  const _ambbg  = { background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.03))", borderColor: "rgba(245,158,11,0.25)" };
  if (totalIncome === 0 && totalExpense === 0) return { grade: "-", message: "Belum ada transaksi bulan ini.", textStyle: { color: "#9ca3af" }, bgStyle: { background: "linear-gradient(135deg, rgba(107,114,128,0.08), transparent)", borderColor: "rgba(107,114,128,0.2)" } };
  if (totalIncome === 0 && totalExpense > 0)  return { grade: "F", message: "Minus! Belum ada pemasukan yang tercatat.", textStyle: { color: "var(--a3)" }, bgStyle: _a3bg };
  const ratio = totalExpense / totalIncome;
  if (ratio >= 0.9) return { grade: "D", message: "Bahaya! Pengeluaran nyaris melebihi pemasukan.",   textStyle: { color: "var(--a3)" },    bgStyle: _a3bg };
  if (ratio >= 0.7) return { grade: "C", message: "Waspada. Kurangi pengeluaran yang tidak perlu.",   textStyle: { color: "rgb(245,158,11)" }, bgStyle: _ambbg };
  if (ratio >= 0.5) return { grade: "B", message: "Bagus. Keuangan Anda cukup stabil bulan ini.",     textStyle: { color: "var(--a1)" },    bgStyle: _a1bg };
  return                   { grade: "A", message: "Sangat Sehat! Surplus kas Anda aman.",              textStyle: { color: "var(--income)" }, bgStyle: _incbg };
};

// ── Budget Row — progress bar per kategori ────────────────────────────────────
const BudgetRow = ({ category, spent, limit, balance, onEdit, index }) => {
  const pct         = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const sisa        = Math.max(0, limit - spent);
  const isOver      = spent > limit && limit > 0;
  const isDanger    = pct >= 80 && !isOver;
  const isWarning   = pct >= 50 && pct < 80;
  const barColorVar  = isOver || isDanger ? "var(--a3)" : isWarning ? "rgb(245,158,11)" : "var(--income)";
  const textColorVar = isOver || isDanger ? "var(--a3)" : isWarning ? "rgb(245,158,11)" : "var(--income)";
  const hasNoLimit  = limit === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-white dark:bg-[#121827] border rounded-[20px] p-4 transition-all"
      style={isOver
        ? { borderColor: "color-mix(in srgb, var(--a3) 30%, transparent)", boxShadow: "0 2px 8px color-mix(in srgb, var(--a3) 10%, transparent)" }
        : hasNoLimit
        ? { borderColor: "rgba(107,114,128,0.2)", opacity: 0.6 }
        : { borderColor: "rgba(107,114,128,0.1)" }
      }
    >
      <div className="flex justify-between items-start mb-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black text-sm ds-t1 truncate">{category}</p>
            {isOver && (
              <span className="flex items-center gap-1 text-2xs font-black px-2 py-0.5 rounded-full border uppercase tracking-widest shrink-0" style={{ color: "var(--a3)", background: "color-mix(in srgb, var(--a3) 12%, transparent)", borderColor: "color-mix(in srgb, var(--a3) 25%, transparent)" }}>
                <AlertTriangle size={8} /> Melebihi!
              </span>
            )}
            {hasNoLimit && (
              <span className="text-2xs font-black ds-t3 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                Belum diset
              </span>
            )}
          </div>
          {!hasNoLimit && (
            <p className="text-label ds-t3 ff-mono mt-0.5">
              Rp {fmt(spent)} / <span className="font-bold">Rp {fmt(limit)}</span>
            </p>
          )}
          {hasNoLimit && (
            <p className="text-label ds-t3 ff-mono mt-0.5">Terpakai: Rp {fmt(spent)}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          {!hasNoLimit && (
            <div className="text-right mr-1">
              <p className="text-xs font-black" style={{ color: textColorVar }}>{pct.toFixed(0)}%</p>
              <p className="text-label ds-t3 ff-mono">{isOver ? "lebih" : `sisa Rp ${fmt(sisa)}`}</p>
            </div>
          )}
          <button
            onClick={() => onEdit(category, limit)}
            className="p-1.5 ds-t3 hover:text-[var(--a1)] bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-colors"
            title="Set limit"
          >
            <Edit3 size={12} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {!hasNoLimit && (
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.05 }}
            className="h-full rounded-full relative overflow-hidden"
            style={{ background: barColorVar }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

// ── Main AnalyticsTab ─────────────────────────────────────────────────────────
export default function AnalyticsTab({ filteredTransactions, transactions, selectedMonth, balance }) {
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(true);
  const [budgets, setBudgets]                        = useState([]);
  const [editingBudget, setEditingBudget]            = useState(null); // { category, currentLimit }
  const [editLimitValue, setEditLimitValue]          = useState("");
  const [isSavingBudget, setIsSavingBudget]          = useState(false);
  const [activeSection, setActiveSection]            = useState("pengeluaran"); // "pengeluaran" | "alokasi"

  // Fetch budgets for this month
  const fetchBudgets = useCallback(async () => {
    const { data } = await supabase
      .from("budgets")
      .select("*")
      .eq("month_year", selectedMonth);
    if (data) setBudgets(data);
  }, [selectedMonth]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const safe     = Array.isArray(filteredTransactions) ? filteredTransactions : [];
  const expenses = safe.filter(t => t?.type === "expense" || !t?.type);
  const incomes  = safe.filter(t => t?.type === "income");

  const statsData = expenses
    .reduce((acc, trx) => {
      const amt = Number(trx.amount) || 0;
      const cat = trx.category || "Lainnya";
      const ex  = acc.find(i => i.name === cat);
      if (ex) ex.value += amt;
      else acc.push({ name: cat, value: amt });
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value);

  const totalExpense  = statsData.reduce((s, i) => s + i.value, 0);
  const totalIncome   = incomes.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const health        = getHealthGrade(totalExpense, totalIncome);

  // Budget map: { [category_name]: limit_amount }
  const budgetMap = budgets.reduce((acc, b) => {
    acc[b.category_name] = Number(b.limit_amount);
    return acc;
  }, {});

  // Semua transaksi bulan ini UNFILTERED (tidak terpengaruh filter HomeTab)
  const allTransactions = Array.isArray(transactions) ? transactions : [];
  const allExpenses     = allTransactions.filter(t => t?.type === "expense" || !t?.type);
  const allStatsData    = allExpenses.reduce((acc, trx) => {
    const amt = Number(trx.amount) || 0;
    const cat = trx.category || "Lainnya";
    const ex  = acc.find(i => i.name === cat);
    if (ex) ex.value += amt;
    else acc.push({ name: cat, value: amt });
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  // Semua kategori dari data unfiltered
  const allCategories = allStatsData.map(s => s.name);

  // Total alokasi vs saldo
  const totalAlokasi    = allCategories.reduce((sum, cat) => sum + (budgetMap[cat] || 0), 0);
  const sisaSaldoSetelah = balance - totalAlokasi;
  const isAlokasiMelebihi = totalAlokasi > balance;

  // ── Budget Save ─────────────────────────────────────────────────────────────
  const handleSaveBudget = async () => {
    if (!editingBudget) return;
    const newLimit = Math.abs(parseFlexibleNumber(editLimitValue));

    setIsSavingBudget(true);
    try {
      // Cek apakah sudah ada entry untuk kategori + bulan ini
      const { data: existing } = await supabase
        .from("budgets")
        .select("id")
        .eq("category_name", editingBudget.category)
        .eq("month_year", selectedMonth)
        .single();

      if (existing) {
        // Update
        await supabase
          .from("budgets")
          .update({ limit_amount: newLimit })
          .eq("id", existing.id);
      } else {
        // Insert baru
        await supabase.from("budgets").insert([{
          category_name: editingBudget.category,
          limit_amount:  newLimit,
          month_year:    selectedMonth,
        }]);
      }

      await fetchBudgets();
      setEditingBudget(null);
      setEditLimitValue("");
    } catch (err) {
      console.error("Gagal simpan budget:", err.message);
    } finally {
      setIsSavingBudget(false);
    }
  };

  return (
    <motion.div
      key="analytics"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="pt-8 px-3 pb-32 h-[100dvh] overflow-y-auto no-scrollbar w-full flex flex-col"
    >
      <h2 className="text-xl font-bold ds-t1 mb-6 tracking-tight flex-none">
        Analitik & Alokasi
      </h2>

      {/* ── Section Tab ── */}
      <div className="flex bg-gray-100 dark:bg-[#121827] p-1 rounded-[16px] mb-6 border border-gray-200 dark:border-gray-800/60 shadow-inner flex-none">
        {[
          { key: "pengeluaran", label: "Pengeluaran", Icon: PieChart },
          { key: "alokasi",     label: "Alokasi",     Icon: Target },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex-1 flex items-center justify-center gap-2 text-label font-black uppercase tracking-widest py-2.5 rounded-xl transition-all duration-300 ${
              activeSection === key
                ? "text-white shadow-sm"
                : "ds-t3 hover:ds-t1"
            }`}
            style={activeSection === key ? { background: "linear-gradient(135deg, var(--a1), var(--a2))" } : undefined}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* ================================================================
          SECTION A — PENGELUARAN
      ================================================================ */}
      <AnimatePresence mode="wait">
        {activeSection === "pengeluaran" && (
          <motion.div
            key="pengeluaran"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Health grade */}
            <div className="rounded-[24px] p-5 border shadow-sm flex items-center justify-between" style={health.bgStyle}>
              <div>
                <p className="text-caption font-black ds-t3 uppercase tracking-widest mb-1.5">Status Keuangan</p>
                <p className="text-xs font-bold ds-t1 leading-snug pr-4">{health.message}</p>
              </div>
              <div className="shrink-0 w-14 h-14 rounded-2xl bg-white dark:bg-[#121827] shadow-sm flex items-center justify-center text-2xl font-black" style={health.textStyle}>
                {health.grade}
              </div>
            </div>

            {/* Total pengeluaran */}
            <div className="bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800/60 flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 opacity-60" style={{ background: "linear-gradient(90deg, var(--a3), var(--a2), var(--a3))" }} />
              <div>
                <p className="text-caption font-black ds-t3 uppercase tracking-[0.3em] mb-1">Total Pengeluaran</p>
                <p className="text-3xl font-black ff-mono tracking-tighter" style={{ color: "var(--a3)" }}>
                  <span className="text-lg mr-0.5">Rp</span>{totalExpense.toLocaleString("id-ID")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-caption font-black ds-t3 uppercase tracking-widest mb-1">Pemasukan</p>
                <p className="text-lg font-black ff-mono" style={{ color: "var(--income)" }}>Rp {fmt(totalIncome)}</p>
              </div>
            </div>

            {/* ── Rincian Kategori — collapsible ── */}
            <div className="bg-white dark:bg-[#121827] rounded-[28px] border border-gray-100 dark:border-gray-800/60 shadow-sm overflow-hidden">
              <button
                onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl" style={{ background: "color-mix(in srgb, var(--a1) 12%, transparent)" }}>
                    <PieChart size={16} style={{ color: "var(--a1)" }} />
                  </div>
                  <div>
                    <p className="text-xs font-black ds-t1 uppercase tracking-widest">Rincian Kategori</p>
                    <p className="text-label ds-t3 mt-0.5">{statsData.length} kategori bulan ini</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isCategoryExpanded ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="ds-t3"
                >
                  <ChevronDown size={18} />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isCategoryExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-0 space-y-3 border-t border-gray-100 dark:border-gray-800/50">
                      {statsData.length > 0 ? statsData.map((item, index) => {
                        const pct      = totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(1) : 0;
                        const barColor = CHART_COLORS[index % CHART_COLORS.length];
                        return (
                          <div key={item.name} className="pt-3">
                            <div className="flex justify-between items-end mb-2">
                              <div>
                                <p className="font-bold text-sm ds-t1">{item.name}</p>
                                <p className="text-caption font-black ds-t3 mt-0.5 tracking-wider">{pct}%</p>
                              </div>
                              <p className="font-black text-sm ds-t1 ff-mono">
                                Rp {item.value.toLocaleString("id-ID")}
                              </p>
                            </div>
                            <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.08 }}
                                className="h-full rounded-full relative overflow-hidden"
                                style={{ backgroundColor: barColor }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
                              </motion.div>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="text-center py-10">
                          <p className="text-caption font-black ds-t4 uppercase tracking-[0.4em]">Belum Ada Data</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ================================================================
            SECTION B — ALOKASI ANGGARAN
        ================================================================ */}
        {activeSection === "alokasi" && (
          <motion.div
            key="alokasi"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Saldo overview */}
            <div className="bg-white dark:bg-[#121827] border border-gray-100 dark:border-gray-800/60 rounded-[24px] p-5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-label font-black ds-t3 uppercase tracking-widest mb-1">Saldo Dompet</p>
                  <p className="text-2xl font-black ds-t1 ff-mono">Rp {fmt(balance)}</p>
                </div>
                <div className="text-right">
                  <p className="text-label font-black ds-t3 uppercase tracking-widest mb-1">Total Alokasi</p>
                  <p className="text-xl font-black ff-mono" style={{ color: isAlokasiMelebihi ? "var(--a3)" : "var(--a1)" }}>
                    Rp {fmt(totalAlokasi)}
                  </p>
                </div>
              </div>

              {/* Saldo setelah alokasi */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                style={isAlokasiMelebihi
                  ? { background: "color-mix(in srgb, var(--a3) 10%, transparent)", borderColor: "color-mix(in srgb, var(--a3) 22%, transparent)" }
                  : { background: "color-mix(in srgb, var(--income) 10%, transparent)", borderColor: "color-mix(in srgb, var(--income) 22%, transparent)" }
                }
              >
                {isAlokasiMelebihi
                  ? <AlertTriangle size={14} className="shrink-0" style={{ color: "var(--a3)" }} />
                  : <CheckCircle2 size={14} className="shrink-0" style={{ color: "var(--income)" }} />
                }
                <p className="text-caption font-black" style={{ color: isAlokasiMelebihi ? "var(--a3)" : "var(--income)" }}>
                  {isAlokasiMelebihi
                    ? `⚠️ Alokasi melebihi saldo! Kelebihan Rp ${fmt(Math.abs(sisaSaldoSetelah))}`
                    : `Sisa saldo setelah alokasi: Rp ${fmt(sisaSaldoSetelah)}`
                  }
                </p>
              </div>
            </div>

            {/* Warning jika alokasi melebihi saldo */}
            <AnimatePresence>
              {isAlokasiMelebihi && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-[20px] p-4 flex items-start gap-3 border"
                  style={{ background: "color-mix(in srgb, var(--a3) 10%, transparent)", borderColor: "color-mix(in srgb, var(--a3) 25%, transparent)" }}
                >
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: "var(--a3)" }} />
                  <div>
                    <p className="text-caption font-black uppercase tracking-widest mb-1" style={{ color: "var(--a3)" }}>Peringatan Alokasi</p>
                    <p className="text-xs font-bold leading-relaxed" style={{ color: "color-mix(in srgb, var(--a3) 80%, #fff)" }}>
                      Total alokasi anggaran melebihi saldo dompet saat ini. Sesuaikan limit tiap kategori agar tidak defisit.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Budget per kategori */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-label font-black ds-t3 uppercase tracking-[0.3em]">
                  Alokasi per Kategori
                </p>
                <p className="text-label ds-t3">{allCategories.length} kategori</p>
              </div>

              {allCategories.length === 0 ? (
                <div className="text-center py-16 bg-gray-50/50 dark:bg-gray-900/10 rounded-[28px] border border-dashed border-gray-200 dark:border-gray-800">
                  <p className="text-caption font-black ds-t4 uppercase tracking-[0.4em]">Belum Ada Transaksi Bulan Ini</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {allCategories.map((cat, index) => {
                    const spent = allStatsData.find(s => s.name === cat)?.value || 0;
                    const limit = budgetMap[cat] || 0;
                    return (
                      <BudgetRow
                        key={cat}
                        category={cat}
                        spent={spent}
                        limit={limit}
                        balance={balance}
                        index={index}
                        onEdit={(category, currentLimit) => {
                          setEditingBudget({ category, currentLimit });
                          setEditLimitValue(currentLimit > 0 ? String(currentLimit) : "");
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal Edit Limit Budget ── */}
      <AnimatePresence>
        {editingBudget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm p-0"
          >
            <motion.div
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 200, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-full max-w-lg bg-white dark:bg-[#0a0f1c] border-t border-gray-100 dark:border-gray-800 rounded-t-[32px] p-6 shadow-2xl"
            >
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />

              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-sm font-black ds-t1 uppercase tracking-widest">
                    Set Limit Anggaran
                  </h3>
                  <p className="text-caption font-bold mt-0.5 uppercase tracking-widest" style={{ color: "var(--a1)" }}>
                    {editingBudget.category}
                  </p>
                </div>
                <button
                  onClick={() => { setEditingBudget(null); setEditLimitValue(""); }}
                  className="p-2 ds-t3 hover:text-fuchsia-400 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Info penggunaan saat ini */}
              <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-3 mb-4">
                <div className="flex justify-between text-label font-black ds-t3 uppercase tracking-widest">
                  <span>Terpakai bulan ini</span>
                  <span className="ff-mono">Rp {fmt(allStatsData.find(s => s.name === editingBudget.category)?.value || 0)}</span>
                </div>
                {editingBudget.currentLimit > 0 && (
                  <div className="flex justify-between text-label font-black ds-t3 uppercase tracking-widest mt-1">
                    <span>Limit sekarang</span>
                    <span className="ff-mono">Rp {fmt(editingBudget.currentLimit)}</span>
                  </div>
                )}
              </div>

              <div className="mb-5">
                <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-2">
                  Limit Baru
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Cth: 500k, 1jt, 2.5jt"
                  value={editLimitValue}
                  onChange={e => setEditLimitValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSaveBudget(); }}
                  className="w-full bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800 ds-t1 font-bold text-sm p-4 rounded-2xl outline-none focus:border-[var(--a1)] transition-all placeholder:opacity-40"
                />
              </div>

              <div className="flex gap-3">
                {editingBudget.currentLimit > 0 && (
                  <button
                    onClick={async () => {
                      setIsSavingBudget(true);
                      const { data: existing } = await supabase.from("budgets").select("id").eq("category_name", editingBudget.category).eq("month_year", selectedMonth).single();
                      if (existing) await supabase.from("budgets").delete().eq("id", existing.id);
                      await fetchBudgets();
                      setIsSavingBudget(false);
                      setEditingBudget(null);
                    }}
                    className="px-4 py-3.5 font-black text-caption uppercase tracking-widest rounded-2xl transition-all border"
                    style={{ color: "var(--a3)", background: "color-mix(in srgb, var(--a3) 10%, transparent)", borderColor: "color-mix(in srgb, var(--a3) 22%, transparent)" }}
                  >
                    Hapus Limit
                  </button>
                )}
                <button
                  onClick={handleSaveBudget}
                  disabled={isSavingBudget || !editLimitValue.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                  style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))" }}
                >
                  <Save size={14} /> {isSavingBudget ? "Menyimpan..." : "Simpan Limit"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
