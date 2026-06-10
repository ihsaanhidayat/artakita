"use client";
import { memo, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { parseFlexibleNumber, fmt, CHART_COLORS } from "@/lib/utils";
import { STATS } from "@/lib/constants";
import { ChevronDown, AlertTriangle, CheckCircle2, Edit3, Save } from "lucide-react";
import type { Transaction, ActiveWallet } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DbBudget {
  id: string;
  category_name: string;
  limit_amount: number;
  month_year: string;
}

interface CategoryStat { name: string; value: number; }

interface HealthResult {
  grade: string;
  color: string;
  barStyle: React.CSSProperties;
  pct: number;
  msg: string;
}

interface EditingBudget { category: string; currentLimit: number; }

interface StatsTabProps {
  filteredTransactions: Transaction[];
  transactions: Transaction[];
  balance: number;
  activeWallet: ActiveWallet | null;
  allBudgets: DbBudget[];
  onBudgetsChange: () => void;
}

// ── Health helper ─────────────────────────────────────────────────────────────

const getHealth = (exp: number, inc: number): HealthResult => {
  if (inc === 0 && exp === 0) return { grade: "-", color: "ds-t3",          barStyle: { background: "var(--border)" },                                     pct: 0,              msg: STATS.GRADE["-"] };
  if (inc === 0 && exp > 0)   return { grade: "F", color: "ds-expense-glow", barStyle: { background: "var(--a3)" },                                          pct: 100,            msg: STATS.GRADE.F };
  const r = exp / inc;
  if (r >= 0.9) return { grade: "D", color: "ds-expense-glow", barStyle: { background: "linear-gradient(90deg, var(--a3), var(--a2))" },    pct: Math.min(r * 100, 100), msg: STATS.GRADE.D };
  if (r >= 0.7) return { grade: "C", color: "ds-aurora-text",  barStyle: { background: "linear-gradient(90deg, var(--a2), var(--a1))" },    pct: r * 100,                msg: STATS.GRADE.C };
  if (r >= 0.5) return { grade: "B", color: "ds-aurora-text",  barStyle: { background: "linear-gradient(90deg, var(--a1), var(--a2))" },    pct: r * 100,                msg: STATS.GRADE.B };
  return             { grade: "A", color: "ds-income-glow",  barStyle: { background: "linear-gradient(90deg, var(--income), var(--a1))" }, pct: r * 100,                msg: STATS.GRADE.A };
};

// ── Component ─────────────────────────────────────────────────────────────────

const StatsTab = memo(function StatsTab({ filteredTransactions, transactions, balance, activeWallet, allBudgets, onBudgetsChange }: StatsTabProps) {
  const [section,       setSection]       = useState("pengeluaran");
  const [catExpanded,   setCatExpanded]   = useState(false);
  const [allocExpanded, setAllocExpanded] = useState(false);
  const [editingBudget, setEditingBudget] = useState<EditingBudget | null>(null);
  const [editVal,       setEditVal]       = useState("");
  const [isSaving,      setIsSaving]      = useState(false);
  const [isDirtyBudget, setIsDirtyBudget] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const { statsData, totalExpense, totalIncome, health } = useMemo(() => {
    const safe = Array.isArray(filteredTransactions) ? filteredTransactions : [];
    const expenses = safe.filter(t => t?.type === "expense" || !t?.type);
    const incomes  = safe.filter(t => t?.type === "income");
    const data = expenses.reduce<CategoryStat[]>((acc, t) => {
      const amt = Number(t.amount) || 0;
      const cat = t.category || "Lainnya";
      const ex = acc.find(i => i.name === cat);
      if (ex) ex.value += amt; else acc.push({ name: cat, value: amt });
      return acc;
    }, []).sort((a, b) => b.value - a.value);
    const totExp = data.reduce((s, i) => s + i.value, 0);
    const totInc = incomes.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return { statsData: data, totalExpense: totExp, totalIncome: totInc, health: getHealth(totExp, totInc) };
  }, [filteredTransactions]);

  const { allStatsData, allCategories, budgetMap, totalAlokasi, sisaSaldo, isOver } = useMemo(() => {
    const allExp = (Array.isArray(transactions) ? transactions : []).filter(t => t?.type === "expense" || !t?.type);
    const allData = allExp.reduce<CategoryStat[]>((acc, t) => {
      const amt = Number(t.amount) || 0;
      const cat = t.category || "Lainnya";
      const ex = acc.find(i => i.name === cat);
      if (ex) ex.value += amt; else acc.push({ name: cat, value: amt });
      return acc;
    }, []).sort((a, b) => b.value - a.value);
    const cats = allData.map(s => s.name);
    const bMap = allBudgets.reduce<Record<string, number>>((acc, b) => { acc[b.category_name] = Number(b.limit_amount); return acc; }, {});
    const totAlok = cats.reduce((sum, cat) => sum + (bMap[cat] || 0), 0);
    return { allStatsData: allData, allCategories: cats, budgetMap: bMap, totalAlokasi: totAlok, sisaSaldo: balance - totAlok, isOver: totAlok > balance };
  }, [transactions, allBudgets, balance]);

  const handleSaveBudget = useCallback(async (): Promise<void> => {
    if (!editingBudget) return;
    const newLimit = Math.abs(parseFlexibleNumber(editVal));
    setIsSaving(true);
    try {
      const { data: ex } = await supabase.from("budgets").select("id").eq("category_name", editingBudget.category).eq("month_year", currentMonth).single();
      if (ex) await supabase.from("budgets").update({ limit_amount: newLimit }).eq("id", (ex as { id: string }).id);
      else await supabase.from("budgets").insert([{ category_name: editingBudget.category, limit_amount: newLimit, month_year: currentMonth }]);
      onBudgetsChange();
      setEditingBudget(null); setEditVal(""); setIsDirtyBudget(false);
    } finally { setIsSaving(false); }
  }, [editingBudget, editVal, currentMonth, onBudgetsChange]);

  const handleDeleteBudget = useCallback(async (): Promise<void> => {
    if (!editingBudget) return;
    setIsSaving(true);
    const { data: ex } = await supabase.from("budgets").select("id").eq("category_name", editingBudget.category).eq("month_year", currentMonth).single();
    if (ex) await supabase.from("budgets").delete().eq("id", (ex as { id: string }).id);
    onBudgetsChange();
    setEditingBudget(null); setIsSaving(false);
  }, [editingBudget, currentMonth, onBudgetsChange]);

  return (
    <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
      className="pt-8 px-3 pb-32 h-[100dvh] overflow-y-auto no-scrollbar w-full" style={{ background: "var(--bg-0)" }}>

      <div className="mb-5 flex-none">
        <h2 className="text-[26px] font-light tracking-[-1.5px] leading-none ds-t1">{STATS.TITLE}</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="ds-live-dot" />
          <p className="text-caption font-black tracking-[0.14em] uppercase ds-aurora-text">{activeWallet?.name}</p>
        </div>
      </div>

      <div className="flex p-1 rounded-[14px] mb-5" style={{ background: "var(--bg-3)", border: "1px solid var(--border)" }}>
        {([
          { key: "pengeluaran", label: STATS.TAB_EXPENSE },
          { key: "alokasi",     label: STATS.TAB_ALLOCATION },
        ] as { key: string; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setSection(key)}
            className={`flex-1 text-label font-black uppercase tracking-widest py-2.5 rounded-xl transition-all duration-200 ${section === key ? "ds-bg-1 ds-aurora-bg ds-aurora-text shadow-sm" : "ds-t3"}`}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── PENGELUARAN ── */}
        {section === "pengeluaran" && (
          <motion.div key="pengeluaran" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }} className="space-y-4">
            <div className="rounded-[28px] p-5 overflow-hidden relative" style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}>
              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-[28px]" style={{ background: "linear-gradient(90deg, var(--a1), var(--a3), var(--a2))", opacity: 0.7 }} />
              <div className="flex items-center gap-4 mb-5">
                <div className={`w-14 h-14 rounded-2xl ds-bg-3 flex items-center justify-center text-2xl font-black shrink-0 ${health.color}`} style={{ border: "1px solid var(--border)" }}>{health.grade}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-label font-black ds-t3 uppercase tracking-widest mb-0.5">{STATS.HEALTH_TITLE}</p>
                  <p className="text-xs font-bold ds-t1 leading-snug">{health.msg}</p>
                </div>
              </div>
              {totalIncome > 0 && (
                <div className="mb-5">
                  <div className="flex justify-between text-2xs font-black ds-t3 uppercase tracking-widest mb-1.5">
                    <span>Pengeluaran vs Pemasukan</span>
                    <span className={health.color}>{Math.min(100, (totalExpense / totalIncome * 100)).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-3)" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (totalExpense / totalIncome) * 100)}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full" style={health.barStyle} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-3" style={{ background: "color-mix(in srgb, var(--a3) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--a3) 18%, transparent)" }}>
                  <p className="text-2xs font-black uppercase tracking-widest mb-1" style={{ color: "var(--a3)" }}>{STATS.TOTAL_EXPENSE}</p>
                  <p className="text-base font-black ds-expense-glow ff-mono">Rp {fmt(totalExpense)}</p>
                </div>
                <div className="rounded-2xl p-3" style={{ background: "color-mix(in srgb, var(--income) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--income) 18%, transparent)" }}>
                  <p className="text-2xs font-black uppercase tracking-widest mb-1" style={{ color: "var(--income)" }}>{STATS.TOTAL_INCOME}</p>
                  <p className="text-base font-black ds-income-glow ff-mono">Rp {fmt(totalIncome)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] overflow-hidden mb-3" style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}>
              <button onClick={() => setCatExpanded(!catExpanded)} className="w-full flex items-center justify-between p-5">
                <p className="text-xs font-black ds-t1 uppercase tracking-widest">{STATS.CATEGORY_DETAIL}</p>
                <div className="flex items-center gap-2">
                  <span className="text-label font-black ds-t3">{statsData.length} kategori</span>
                  <motion.div animate={{ rotate: catExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={16} className="ds-t3" /></motion.div>
                </div>
              </button>
              <AnimatePresence initial={false}>
                {catExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                    <div className="px-5 pb-5 border-t ds-border space-y-0">
                      {statsData.length > 0 ? statsData.map((item, idx) => {
                        const pct = totalExpense > 0 ? Math.min(100, (item.value / totalExpense) * 100) : 0;
                        return (
                          <div key={item.name} className="pt-4">
                            <div className="flex justify-between items-end mb-2">
                              <div><p className="font-bold text-sm ds-t1">{item.name}</p><p className="text-label font-black ds-t3">{pct.toFixed(1)}%</p></div>
                              <p className="font-black text-sm ds-t1 ff-mono">Rp {item.value.toLocaleString("id-ID")}</p>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-3)" }}>
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: "easeOut", delay: idx * 0.05 }} className="h-full rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                            </div>
                          </div>
                        );
                      }) : <p className="text-center py-8 text-label font-black ds-t3 uppercase tracking-[0.4em]">{STATS.NO_DATA}</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── ALOKASI ── */}
        {section === "alokasi" && (
          <motion.div key="alokasi" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }} className="space-y-4">
            <div className="ds-aurora-card p-5" style={{ border: "1px solid var(--border)" }}>
              <div className="flex justify-between items-start mb-4">
                <div><p className="text-label font-black ds-t3 uppercase tracking-widest mb-1">Saldo Dompet</p><p className="text-2xl font-black ds-t1 ff-mono">Rp {fmt(balance)}</p></div>
                <div className="text-right"><p className="text-label font-black ds-t3 uppercase tracking-widest mb-1">{STATS.ALLOCATION}</p><p className={`text-xl font-black ff-mono ${isOver ? "ds-expense-glow" : "ds-aurora-text"}`}>Rp {fmt(totalAlokasi)}</p></div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: isOver ? "color-mix(in srgb, var(--a3) 8%, transparent)" : "color-mix(in srgb, var(--income) 8%, transparent)", border: `1px solid ${isOver ? "color-mix(in srgb, var(--a3) 20%, transparent)" : "color-mix(in srgb, var(--income) 20%, transparent)"}` }}>
                {isOver ? <AlertTriangle size={14} className="shrink-0" style={{ color: "var(--a3)" }} /> : <CheckCircle2 size={14} className="shrink-0" style={{ color: "var(--income)" }} />}
                <p className="text-caption font-bold" style={{ color: isOver ? "var(--a3)" : "var(--income)" }}>
                  {isOver ? `Alokasi melebihi saldo! Kelebihan Rp ${fmt(Math.abs(sisaSaldo))}` : `${STATS.AFTER_ALLOC}: Rp ${fmt(sisaSaldo)}`}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] overflow-hidden mb-3" style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}>
              <button onClick={() => setAllocExpanded(!allocExpanded)} className="w-full flex items-center justify-between p-5">
                <p className="text-xs font-black ds-t1 uppercase tracking-widest">{STATS.ALLOCATION}</p>
                <div className="flex items-center gap-2">
                  <span className="text-label font-black ds-t3">{allCategories.length} kategori</span>
                  <motion.div animate={{ rotate: allocExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={16} className="ds-t3" /></motion.div>
                </div>
              </button>
              <AnimatePresence initial={false}>
                {allocExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                    <div className="px-5 pb-5 border-t ds-border space-y-2.5 pt-4">
                      {allCategories.length === 0 ? (
                        <p className="text-center py-6 text-label font-black ds-t3 uppercase tracking-[0.4em]">{STATS.NO_DATA}</p>
                      ) : allCategories.map((cat, idx) => {
                        const spent = allStatsData.find(s => s.name === cat)?.value ?? 0;
                        const limit = budgetMap[cat] ?? 0;
                        const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
                        const isCatOver = spent > limit && limit > 0;
                        const barStyle: React.CSSProperties = isCatOver
                          ? { background: "linear-gradient(90deg, var(--a3), var(--a2))" }
                          : pct >= 80 ? { background: "linear-gradient(90deg, var(--a2), var(--a3))" }
                          : pct >= 50 ? { background: "linear-gradient(90deg, var(--a1), var(--a2))" }
                          : { background: "linear-gradient(90deg, var(--income), var(--a1))" };
                        const noLim = limit === 0;
                        return (
                          <div key={cat} className="ds-bg-3 rounded-[18px] p-4" style={{ border: isCatOver ? "1px solid color-mix(in srgb, var(--a3) 25%, transparent)" : "1px solid transparent" }}>
                            <div className="flex justify-between items-start mb-2.5">
                              <div className="min-w-0 flex-1">
                                <p className="font-black text-sm ds-t1">{cat}</p>
                                <p className="text-label ds-t3 mt-0.5">{noLim ? `Terpakai: Rp ${fmt(spent)}` : `Rp ${fmt(spent)} / Rp ${fmt(limit)}`}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {!noLim && <span className={`text-xs font-black ${isCatOver || pct >= 80 ? "ds-expense-glow" : "ds-t2"}`}>{pct.toFixed(0)}%</span>}
                                <button onClick={() => {
                                  if (editingBudget?.category === cat) { setEditingBudget(null); setEditVal(""); setIsDirtyBudget(false); }
                                  else { setEditingBudget({ category: cat, currentLimit: limit }); setEditVal(limit > 0 ? limit.toLocaleString("id-ID") : ""); setIsDirtyBudget(false); }
                                }} className={`p-2.5 rounded-xl transition-colors ${editingBudget?.category === cat ? "ds-aurora-text ds-aurora-bg" : "ds-t3 ds-bg-1"}`}>
                                  <Edit3 size={12} />
                                </button>
                              </div>
                            </div>
                            {!noLim && (
                              <div className="w-full h-1.5 ds-bg-3 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: "easeOut", delay: idx * 0.04 }} className="h-full rounded-full" style={barStyle} />
                              </div>
                            )}
                            <AnimatePresence>
                              {editingBudget?.category === cat && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                                  <div className="pt-2.5 flex items-center gap-2">
                                    <input autoFocus type="text" placeholder="50k · 1jt · 500rb" value={editVal ?? ""} onChange={e => { setEditVal(e.target.value); setIsDirtyBudget(true); }}
                                      onKeyDown={e => { if (e.key === "Enter") void handleSaveBudget(); }}
                                      className="flex-1 ds-bg-3 rounded-xl px-3 py-2 text-sm font-bold ds-t1 outline-none ds-border"
                                      onFocus={e => { e.target.style.borderColor = "color-mix(in srgb, var(--a1) 60%, transparent)"; }}
                                      onBlur={e => { e.target.style.borderColor = ""; const p = parseFlexibleNumber(e.target.value); if (p > 0) setEditVal(p.toLocaleString("id-ID")); }} />
                                    <button onClick={() => void handleSaveBudget()} disabled={isSaving || !editVal.trim()}
                                      className="flex items-center gap-1 px-3 py-2 rounded-xl font-black text-label uppercase tracking-widest transition-all disabled:opacity-40"
                                      style={isDirtyBudget ? { background: "linear-gradient(135deg, var(--a1), var(--a2))", color: "#fff" } : { background: "var(--bg-3)", color: "var(--text-3)" }}>
                                      <Save size={10} /> {isSaving ? "..." : "OK"}
                                    </button>
                                    {editingBudget.currentLimit > 0 && (
                                      <button onClick={() => void handleDeleteBudget()} disabled={isSaving}
                                        className="px-3 py-2 rounded-xl font-black text-label uppercase tracking-widest"
                                        style={{ background: "color-mix(in srgb, var(--a3) 12%, transparent)", color: "var(--a3)" }}>
                                        Hapus
                                      </button>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
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
    </motion.div>
  );
});

export default StatsTab;
