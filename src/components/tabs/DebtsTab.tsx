"use client";
import { useState, useEffect, useCallback, useMemo, memo } from "react";
import CategoryPills from "@/components/CategoryPills";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { parseFlexibleNumber, fmt, fmtShort } from "@/lib/utils";
import { DEBT } from "@/lib/constants";
import {
  Trash2, ChevronDown, ArrowDownLeft, ArrowUpRight,
  CheckCircle2, Wallet, TrendingDown, TrendingUp,
  Edit3, Save, ArrowUpDown, Calendar,
  SortAsc, Clock,
} from "lucide-react";
import type { ActiveWallet } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Debt {
  id: string;
  person_name: string;
  amount: number;
  initial_amount: number;
  type: "debt" | "receivable";
  status: "paid" | "unpaid";
  due_date: string | null;
  wallet_id: string;
}

interface Payment { id: string; amount: number; created_at: string; debt_id: string; }

type SortKey = "nominal" | "percent" | "duedate";

interface DebtsTabProps {
  activeWallet: ActiveWallet | null;
  balance: number;
  refreshKey?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { key: SortKey; label: string; Icon: React.ElementType }[] = [
  { key: "nominal", label: DEBT.SORT_NOMINAL as string, Icon: TrendingDown },
  { key: "percent", label: DEBT.SORT_PERCENT as string, Icon: SortAsc },
  { key: "duedate", label: DEBT.SORT_DUEDATE as string, Icon: Clock },
];

const sortDebts = (debts: Debt[], sortKey: SortKey): Debt[] => {
  return [...debts].sort((a, b) => {
    if (sortKey === "nominal") return Math.abs(Number(b.amount)) - Math.abs(Number(a.amount));
    if (sortKey === "percent") {
      const pctA = a.initial_amount > 0 ? 1 - a.amount / a.initial_amount : 0;
      const pctB = b.initial_amount > 0 ? 1 - b.amount / b.initial_amount : 0;
      return pctB - pctA;
    }
    if (sortKey === "duedate") {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1; if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    return 0;
  });
};

// ── DebtChart ─────────────────────────────────────────────────────────────────

const DebtChart = memo(function DebtChart({ debts, balance }: { debts: Debt[]; balance: number }) {
  const totalInit = debts.filter(d => d.type === "debt").reduce((a, c) => a + Math.abs(Number(c.initial_amount)), 0);
  const totalDebt = debts.filter(d => d.type === "debt").reduce((a, c) => a + Math.abs(Number(c.amount)), 0);
  const terbayar  = Math.max(0, totalInit - totalDebt);
  const totalRec  = debts.filter(d => d.type === "receivable").reduce((a, c) => a + Math.abs(Number(c.amount)), 0);
  const bars = [
    { label: "Total Hutang", value: totalInit,  colorVar: "var(--a3)" },
    { label: "Terbayar",     value: terbayar,   colorVar: "var(--income)" },
    { label: "Saldo",        value: balance,    colorVar: "var(--a1)" },
    { label: "Piutang",      value: totalRec,   colorVar: "var(--a2)" },
  ];
  const maxVal = Math.max(...bars.map(b => b.value), 1);
  return (
    <div className="ds-bg-1 border ds-border rounded-[24px] p-5 mb-4 shadow-sm">
      <p className="text-label font-black ds-t3 uppercase tracking-[0.3em] mb-4">Ringkasan Visual</p>
      <div className="flex items-end gap-2 h-24 mb-3">
        {bars.map((bar, i) => {
          const pct = Math.max((bar.value / maxVal) * 100, 2);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <span className="text-2xs font-black ds-t3">{fmtShort(bar.value)}</span>
              <div className="w-full flex items-end" style={{ height: "72px" }}>
                <motion.div initial={{ height: 0 }} animate={{ height: `${pct}%` }} transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.08 }} className="w-full rounded-xl relative overflow-hidden" style={{ background: bar.colorVar, boxShadow: `0 4px 12px color-mix(in srgb, ${bar.colorVar} 30%, transparent)` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/20" />
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {bars.map((bar, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: bar.colorVar }} />
            <span className="text-2xs font-black ds-t3 uppercase tracking-wider truncate">{bar.label}</span>
          </div>
        ))}
      </div>
      {totalInit > 0 && (
        <div className="mt-3 pt-3 border-t ds-border">
          <div className="flex justify-between mb-1">
            <span className="text-2xs font-black ds-t3 uppercase tracking-widest">Pelunasan Hutang</span>
            <span className="text-2xs font-black" style={{ color: "var(--income)" }}>{((terbayar / totalInit) * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full h-1.5 ds-bg-3 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(terbayar / totalInit) * 100}%` }} transition={{ duration: 1, ease: "easeOut" }} style={{ height: "100%", background: "var(--income)", borderRadius: "9999px" }} />
          </div>
        </div>
      )}
    </div>
  );
});

// ── DebtCard ─────────────────────────────────────────────────────────────────

interface DebtCardProps { d: Debt; balance: number; isExpanded: boolean; onToggle: () => void; onPay: () => void; onEdit: () => void; onDelete: (id: string) => void; }

const DebtCard = memo(function DebtCard({ d, balance, isExpanded, onToggle, onPay, onEdit, onDelete }: DebtCardProps) {
  const [isEditMode,    setIsEditMode]   = useState(false);
  const [editData,      setEditData]     = useState({ person_name: "", initial_amount: "", due_date: "" });
  const [isEditSaving,  setIsEditSaving] = useState(false);
  const [payAmount,     setPayAmount]    = useState("");
  const [payError,      setPayError]     = useState("");
  const [isPayOpen,     setIsPayOpen]    = useState(false);
  const [isPayLoading,  setIsPayLoading] = useState(false);
  const [showConfirm,   setShowConfirm]  = useState(false);

  const rawAmount  = Math.abs(Number(d.amount));
  const rawInitial = Math.abs(Number(d.initial_amount));
  const paid       = Math.max(0, rawInitial - rawAmount);
  const progress   = rawInitial > 0 ? Math.min((paid / rawInitial) * 100, 100) : 0;
  const isDebt     = d.type === "debt";
  const isLunas    = progress >= 100 && rawAmount <= 0;

  const getDueInfo = (): { label: string; style: React.CSSProperties } | null => {
    if (!d.due_date) return null;
    const diff = Math.ceil((new Date(d.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0)  return { label: `Terlambat ${Math.abs(diff)} hari`, style: { color: "var(--a3)" } };
    if (diff === 0) return { label: "Jatuh tempo hari ini!", style: { color: "#f59e0b" } };
    if (diff <= 3)  return { label: `${diff} hari lagi`, style: { color: "#f59e0b" } };
    return { label: new Date(d.due_date).toLocaleDateString("id-ID"), style: {} };
  };
  const dueInfo = getDueInfo();

  const barColorStyle = isLunas ? "var(--income)" : progress < 30 ? "var(--a3)" : progress < 70 ? "#f59e0b" : "var(--income)";

  const startEdit = () => { setIsEditMode(true); setEditData({ person_name: d.person_name, initial_amount: String(d.initial_amount), due_date: d.due_date || "" }); };

  const saveEdit = async (): Promise<void> => {
    try {
      const newInitial = Math.abs(parseFlexibleNumber(editData.initial_amount));
      if (newInitial <= 0 || !editData.person_name.trim()) return;
      setIsEditSaving(true);
      const sudahDibayar = Math.max(0, rawInitial - rawAmount);
      const newAmount = Math.max(0, newInitial - sudahDibayar);
      const { error } = await supabase.from("debts").update({
        person_name: editData.person_name.trim(), initial_amount: newInitial, amount: newAmount,
        status: newAmount <= 0 ? "paid" : "unpaid", due_date: editData.due_date || null,
      }).eq("id", d.id);
      setIsEditSaving(false);
      if (!error) { setIsEditMode(false); onEdit(); }
    } catch { setIsEditSaving(false); }
  };

  const handlePay = async (): Promise<void> => {
    try {
      const amount = parseFlexibleNumber(payAmount);
      setPayError("");
      if (amount <= 0) { setPayError(DEBT.EXCEED_ZERO as string); return; }
      if (amount > rawAmount) { setPayError((DEBT.EXCEED_DEBT as (s: string) => string)(fmt(rawAmount))); return; }
      if (isDebt && amount > balance) { setPayError((DEBT.EXCEED_BAL as (s: string) => string)(fmt(balance))); return; }
      setIsPayLoading(true);
      const rpc = isDebt ? "process_debt_payment" : "process_receivable_payment";
      const { error } = await supabase.rpc(rpc, { debt_id_input: d.id, payment_amount: amount });
      setIsPayLoading(false);
      if (!error) { setIsPayOpen(false); setPayAmount(""); onPay(); }
      else setPayError("Gagal: " + error.message);
    } catch (err) { setPayError("Gagal: " + (err as Error).message); setIsPayLoading(false); }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ds-bg-1 border ds-border rounded-[22px] shadow-sm overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: isLunas ? "var(--income)" : isDebt ? "var(--a3)" : "var(--a1)" }} />
      <button onClick={() => !isEditMode && onToggle()} className="w-full flex items-center justify-between px-5 py-4 pl-6 text-left">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <p className="font-black text-sm ds-t1 truncate">{d.person_name}</p>
          <span className="flex items-center gap-0.5 text-2xs font-black px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0"
            style={isDebt ? { background: "color-mix(in srgb, var(--a3) 12%, transparent)", color: "var(--a3)" } : { background: "color-mix(in srgb, var(--a1) 12%, transparent)", color: "var(--a1)" }}>
            {isDebt ? <ArrowUpRight size={9} /> : <ArrowDownLeft size={9} />}
            {isDebt ? DEBT.TAB_DEBT as string : DEBT.TAB_RECEIVE as string}
          </span>
          {isLunas && (
            <span className="flex items-center gap-2 text-2xs font-black px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0 border"
              style={{ color: "var(--income)", background: "color-mix(in srgb, var(--income) 10%, transparent)", borderColor: "color-mix(in srgb, var(--income) 25%, transparent)" }}>
              <CheckCircle2 size={8} /> {DEBT.PAID_BADGE as string}
            </span>
          )}
          {dueInfo && !isLunas && <span className="text-2xs font-black ds-t3" style={dueInfo.style}>{dueInfo.label}</span>}
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="ds-t3 shrink-0 ml-2"><ChevronDown size={16} /></motion.div>
      </button>

      {!isLunas && rawInitial > 0 && (
        <div className="w-full h-0.5 ds-bg-3 overflow-hidden">
          <div style={{ height: "100%", width: `${progress}%`, background: barColorStyle }} />
        </div>
      )}

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeInOut" }} className="overflow-hidden">
            <div className="px-5 pb-5 pl-6 pt-3 border-t ds-border">
              <AnimatePresence mode="wait">
                {isEditMode ? (
                  <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3 mb-3">
                    <div>
                      <label className="block text-2xs font-black ds-t3 uppercase tracking-widest mb-1">{DEBT.PERSON_NAME as string}</label>
                      <input autoFocus type="text" value={editData.person_name ?? ""} onChange={e => setEditData(p => ({ ...p, person_name: e.target.value }))} className="w-full ds-bg-3 border ds-border rounded-xl py-2.5 px-3 text-sm font-bold ds-t1 outline-none focus:border-[var(--a1)] transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-2xs font-black ds-t3 uppercase tracking-widest mb-1">{DEBT.NOMINAL as string}</label>
                        <input type="text" value={editData.initial_amount ?? ""} onChange={e => setEditData(p => ({ ...p, initial_amount: e.target.value }))} placeholder="Cth: 500k, 1jt" className="w-full ds-bg-3 border ds-border rounded-xl py-2.5 px-3 text-sm font-bold ds-t1 outline-none focus:border-[var(--a1)] transition-all placeholder-gray-400" />
                      </div>
                      <div>
                        <label className="block text-2xs font-black ds-t3 uppercase tracking-widest mb-1">{DEBT.DUE_DATE as string}</label>
                        <input type="date" value={editData.due_date ?? ""} onChange={e => setEditData(p => ({ ...p, due_date: e.target.value }))} className="w-full ds-bg-3 border ds-border rounded-xl py-2.5 px-3 text-sm font-bold ds-t1 outline-none focus:border-[var(--a1)] transition-all" />
                      </div>
                    </div>
                    <p className="text-2xs ds-t3 ds-bg-3 px-3 py-2 rounded-lg">Sisa hutang dihitung otomatis: nominal baru − yang sudah dibayar</p>
                    <div className="flex gap-2">
                      <button onClick={() => void saveEdit()} disabled={isEditSaving} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 disabled:opacity-50 text-white font-black text-label uppercase tracking-widest rounded-xl transition-all" style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))" }}>
                        <Save size={12} /> {isEditSaving ? "Menyimpan..." : DEBT.SAVE as string}
                      </button>
                      <button onClick={() => setIsEditMode(false)} className="px-4 py-2.5 ds-t3 ds-bg-3 rounded-xl font-black text-label uppercase tracking-widest transition-all">{DEBT.CANCEL as string}</button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <p className="font-black text-lg ds-t1 ff-mono">Rp {fmt(rawAmount)}</p>
                        <p className="text-label ds-t3 ff-mono">dari Rp {fmt(rawInitial)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-label font-black ds-t3 uppercase tracking-widest">{DEBT.PAID_PERCENT as string}</p>
                        <p className="font-black text-sm" style={isLunas ? { color: "var(--income)" } : undefined}>{progress.toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="w-full h-2 ds-bg-3 rounded-full overflow-hidden mb-3">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8, ease: "easeOut" }} style={{ height: "100%", borderRadius: "9999px", background: barColorStyle }} />
                    </div>
                    {d.due_date && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <Calendar size={11} className="ds-t3" />
                        <span className="text-label font-bold ds-t3">Jatuh tempo: </span>
                        <span className="text-label font-black ds-t3" style={dueInfo?.style}>{dueInfo?.label}</span>
                      </div>
                    )}
                    {!isLunas && (
                      <div className="flex gap-2">
                        <button onClick={() => setShowConfirm(true)} className="p-2.5 ds-t3 hover:text-fuchsia-400 ds-bg-3 rounded-xl transition-colors"><Trash2 size={14} /></button>
                        <button onClick={startEdit} className="p-2.5 ds-t3 hover:ds-aurora-text ds-bg-3 rounded-xl transition-colors"><Edit3 size={14} /></button>
                        <button onClick={() => { setIsPayOpen(!isPayOpen); setPayAmount(""); setPayError(""); }}
                          className="flex-1 font-black text-label uppercase tracking-widest rounded-xl py-2.5 transition-all active:scale-95 border"
                          style={isPayOpen ? undefined : isDebt ? { background: "color-mix(in srgb, var(--a3) 10%, transparent)", color: "var(--a3)", borderColor: "color-mix(in srgb, var(--a3) 25%, transparent)" } : { background: "color-mix(in srgb, var(--a1) 10%, transparent)", color: "var(--a1)", borderColor: "color-mix(in srgb, var(--a1) 25%, transparent)" }}>
                          {isPayOpen ? DEBT.CANCEL as string : isDebt ? DEBT.PAY_DEBT as string : DEBT.RECEIVE as string}
                        </button>
                      </div>
                    )}
                    {isLunas && (
                      <button onClick={() => setShowConfirm(true)} className="w-full py-2 text-label font-black ds-t3 hover:text-fuchsia-400 uppercase tracking-widest transition-colors text-center rounded-xl hover:bg-fuchsia-500/5">
                        {DEBT.DELETE as string} Catatan
                      </button>
                    )}
                    <AnimatePresence>
                      {isPayOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                          <div className="mt-3 pt-3 border-t ds-border">
                            {isDebt && <div className="flex items-center gap-1.5 mb-2"><Wallet size={11} className="ds-t3" /><span className="text-label font-black ds-t3 ff-mono uppercase tracking-widest">{DEBT.WALLET_BALANCE as string}: Rp {fmt(balance)}</span></div>}
                            <div className="flex gap-2">
                              <input autoFocus type="text" placeholder="Cth: 500k, 1jt" value={payAmount ?? ""}
                                onChange={e => { setPayAmount(e.target.value); setPayError(""); }}
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void handlePay(); } }}
                                className="flex-1 ds-bg-3 border ds-border ds-t1 text-sm font-bold p-3 rounded-xl outline-none focus:border-[var(--a1)] transition-all" />
                              <button onClick={() => void handlePay()} disabled={isPayLoading} className="px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 text-white"
                                style={{ background: isDebt ? "var(--a3)" : "var(--income)", color: isDebt ? "#fff" : "#000" }}>
                                {isPayLoading ? "..." : "OK"}
                              </button>
                            </div>
                            <AnimatePresence>
                              {payError && (
                                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-label font-bold mt-2 px-3 py-1.5 rounded-lg" style={{ color: "var(--a3)", background: "color-mix(in srgb, var(--a3) 10%, transparent)" }}>
                                  {payError}
                                </motion.p>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirm && (
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 280 }}
            className="absolute inset-0 z-20 flex items-center justify-between px-5 backdrop-blur-md"
            style={{ background: "color-mix(in srgb, var(--a3) 85%, var(--a2))", borderLeft: "3px solid var(--a3)", boxShadow: "inset 4px 0 20px color-mix(in srgb, var(--a3) 30%, transparent)" }}>
            <div className="flex items-center gap-2"><Trash2 size={15} className="text-white" /><span className="text-[11px] font-black text-white uppercase tracking-widest">Hapus Permanen?</span></div>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className="px-3 py-1.5 rounded-[10px] bg-white/20 text-white text-label font-black uppercase tracking-widest hover:bg-white/30 transition-colors">Batal</button>
              <button onClick={() => { onDelete(d.id); setShowConfirm(false); }} className="px-3 py-1.5 rounded-[10px] text-label font-black uppercase tracking-widest active:scale-95 transition-all" style={{ background: "rgba(255,255,255,0.9)", color: "var(--a2)" }}>Hapus</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// ── PaidCard ──────────────────────────────────────────────────────────────────

interface PaidCardProps { d: Debt; payments: Payment[]; isExpanded: boolean; onToggle: () => void; onDelete: (id: string) => void; }

const PaidCard = memo(function PaidCard({ d, payments, isExpanded, onToggle, onDelete }: PaidCardProps) {
  const isDebt = d.type === "debt";
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ds-bg-1 rounded-[22px] shadow-sm overflow-hidden opacity-80 border relative" style={{ borderColor: "color-mix(in srgb, var(--income) 20%, transparent)" }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 text-left">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <CheckCircle2 size={14} className="shrink-0" style={{ color: "var(--income)" }} />
          <p className="font-black text-sm ds-t1 truncate">{d.person_name}</p>
          <span className="text-2xs font-black px-2 py-0.5 rounded-full uppercase tracking-widest" style={isDebt ? { background: "color-mix(in srgb, var(--a3) 12%, transparent)", color: "var(--a3)" } : { background: "color-mix(in srgb, var(--a1) 12%, transparent)", color: "var(--a1)" }}>
            {isDebt ? DEBT.TAB_DEBT as string : DEBT.TAB_RECEIVE as string}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <p className="text-label font-black ds-t3 ff-mono">Rp {fmt(d.initial_amount)}</p>
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="ds-t3"><ChevronDown size={14} /></motion.div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-5 pb-4 border-t ds-border">
              <p className="text-2xs font-black ds-t3 uppercase tracking-widest mt-3 mb-2">{DEBT.PAYMENT_HISTORY as string}</p>
              {payments?.length > 0 ? (
                <div className="space-y-2">
                  {payments.map((p, i) => (
                    <div key={p.id ?? i} className="flex justify-between items-center ds-bg-3 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--income)" }} /><span className="text-label font-bold ds-t2">{new Date(p.created_at).toLocaleDateString("id-ID")}</span></div>
                      <span className="text-label font-black ff-mono" style={{ color: "var(--income)" }}>Rp {fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-label ds-t3 italic">Tidak ada riwayat pembayaran tersimpan.</p>}
              <button onClick={() => setShowConfirm(true)} className="w-full mt-3 py-2 text-label font-black ds-t3 hover:text-fuchsia-400 uppercase tracking-widest transition-colors text-center rounded-xl hover:bg-fuchsia-500/5">Hapus Riwayat</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showConfirm && (
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 280 }}
            className="absolute inset-0 z-20 flex items-center justify-between px-5 backdrop-blur-md"
            style={{ background: "color-mix(in srgb, var(--a3) 85%, var(--a2))", borderLeft: "3px solid var(--a3)", boxShadow: "inset 4px 0 20px color-mix(in srgb, var(--a3) 30%, transparent)" }}>
            <div className="flex items-center gap-2"><Trash2 size={15} className="text-white" /><span className="text-[11px] font-black text-white uppercase tracking-widest">Hapus Permanen?</span></div>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className="px-3 py-1.5 rounded-[10px] bg-white/20 text-white text-label font-black uppercase tracking-widest hover:bg-white/30 transition-colors">Batal</button>
              <button onClick={() => { onDelete(d.id); setShowConfirm(false); }} className="px-3 py-1.5 rounded-[10px] text-label font-black uppercase tracking-widest active:scale-95 transition-all" style={{ background: "rgba(255,255,255,0.9)", color: "var(--a2)" }}>Hapus</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// ── Main ──────────────────────────────────────────────────────────────────────

type ActiveTab = "debt" | "receivable" | "paid";

const DebtsTabComponent = memo(function DebtsTab({ activeWallet, balance, refreshKey }: DebtsTabProps) {
  const [debts,      setDebts]      = useState<Debt[]>([]);
  const [payments,   setPayments]   = useState<Record<string, Payment[]>>({});
  const [activeTab,  setActiveTab]  = useState<ActiveTab>("debt");
  const [sortKey,    setSortKey]    = useState<SortKey>("nominal");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast,      setToast]      = useState({ show: false, msg: "", type: "error" });

  const showToast = (msg: string, type: "success" | "error" = "error") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "error" }), 3000);
  };

  const fetchDebts = useCallback(async (): Promise<void> => {
    if (!activeWallet?.id) return;
    const { data } = await supabase.from("debts").select("*").eq("wallet_id", activeWallet.id).order("created_at", { ascending: false });
    if (data) setDebts(data as Debt[]);
  }, [activeWallet?.id]);

  const fetchPayments = useCallback(async (debtIds: string[]): Promise<void> => {
    if (!debtIds?.length) return;
    const { data } = await supabase.from("transactions").select("id, amount, created_at, debt_id").in("debt_id", debtIds).order("created_at", { ascending: true });
    if (data) {
      const map: Record<string, Payment[]> = {};
      (data as Payment[]).forEach(p => { if (!map[p.debt_id]) map[p.debt_id] = []; map[p.debt_id].push(p); });
      setPayments(map);
    }
  }, []);

  useEffect(() => { void fetchDebts(); }, [fetchDebts, refreshKey]);
  useEffect(() => {
    if (activeTab === "paid") { const ids = debts.filter(d => d.status === "paid").map(d => d.id); void fetchPayments(ids); }
  }, [activeTab, debts, fetchPayments]);

  const activeDebts   = useMemo(() => debts.filter(d => d.type === "debt" && d.status !== "paid"), [debts]);
  const activeReceive = useMemo(() => debts.filter(d => d.type === "receivable" && d.status !== "paid"), [debts]);
  const paidDebts     = useMemo(() => debts.filter(d => d.status === "paid"), [debts]);
  const totalDebt     = useMemo(() => activeDebts.reduce((a, c) => a + Number(c.amount), 0), [activeDebts]);
  const totalReceive  = useMemo(() => activeReceive.reduce((a, c) => a + Number(c.amount), 0), [activeReceive]);
  const currentList   = useMemo(() => activeTab === "debt" ? sortDebts(activeDebts, sortKey) : activeTab === "receivable" ? sortDebts(activeReceive, sortKey) : sortDebts(paidDebts, sortKey), [activeTab, activeDebts, activeReceive, paidDebts, sortKey]);
  const emptyMsg      = activeTab === "debt" ? DEBT.EMPTY_DEBT as string : activeTab === "receivable" ? DEBT.EMPTY_REC as string : DEBT.EMPTY_PAID as string;

  const confirmDelete = useCallback(async (id: string): Promise<void> => {
    await supabase.from("debts").delete().eq("id", id);
    void fetchDebts();
  }, [fetchDebts]);

  return (
    <div className="pt-6 px-3 pb-32 h-[100dvh] overflow-y-auto no-scrollbar w-full flex flex-col">
      <div className="mb-4 flex-none">
        <h2 className="text-[26px] font-light tracking-[-1.5px] leading-none ds-t1">{DEBT.TITLE as string}</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="ds-live-dot" />
          <p className="text-caption font-black tracking-[0.14em] uppercase ds-aurora-text">{activeWallet?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-4 flex-none">
        {([
          { label: DEBT.TOTAL_DEBT as string, value: totalDebt,    Icon: TrendingDown, colorVar: "var(--a3)", count: activeDebts.length },
          { label: DEBT.TOTAL_REC as string,  value: totalReceive, Icon: TrendingUp,   colorVar: "var(--a1)", count: activeReceive.length },
        ] as { label: string; value: number; Icon: React.ElementType; colorVar: string; count: number }[]).map(({ label, value, Icon, colorVar, count }) => (
          <div key={label} className="ds-bg-1 border ds-border rounded-[20px] p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5" style={{ color: colorVar }}><Icon size={12} /><span className="text-2xs font-black uppercase tracking-widest">{label}</span></div>
            <p className="font-black text-base ds-t1 ff-mono leading-tight">Rp {fmt(value)}</p>
            <p className="text-2xs ds-t3 mt-0.5">{count} catatan</p>
          </div>
        ))}
      </div>

      {debts.length > 0 && <DebtChart debts={debts} balance={balance} />}

      <div className="flex items-center gap-2 mb-3 flex-none">
        <div className="flex flex-1 ds-bg-3 p-2 rounded-[14px] border ds-border shadow-inner">
          {([
            { key: "debt",        label: DEBT.TAB_DEBT as string,    count: activeDebts.length },
            { key: "receivable",  label: DEBT.TAB_RECEIVE as string, count: activeReceive.length },
            { key: "paid",        label: DEBT.TAB_PAID as string,    count: paidDebts.length },
          ] as { key: ActiveTab; label: string; count: number }[]).map(({ key, label, count }) => (
            <button key={key} onClick={() => { setActiveTab(key); setExpandedId(null); }}
              className={`flex-1 flex items-center justify-center gap-2 text-2xs font-black uppercase tracking-widest py-2 rounded-xl transition-all duration-200 ${activeTab === key ? "ds-bg-1 ds-aurora-bg ds-aurora-text ds-t1 shadow-sm" : "ds-t3"}`}>
              {label}
              {count > 0 && <span className={`text-label font-black px-1 py-0.5 rounded-full ${activeTab === key ? "ds-aurora-bg ds-aurora-text" : "ds-bg-3 ds-t2"}`}>{count}</span>}
            </button>
          ))}
        </div>
        {activeTab !== "paid" && (
          <div className="relative">
            <button onClick={() => setIsSortOpen(!isSortOpen)} className="flex items-center gap-1.5 px-3 py-2 ds-bg-1 border ds-border rounded-xl text-2xs font-black ds-t2 uppercase tracking-widest transition-all hover:ds-aurora-border-c">
              <ArrowUpDown size={11} />
            </button>
            <AnimatePresence>
              {isSortOpen && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.15 }} className="absolute right-0 top-full mt-1.5 w-48 ds-bg-1 border ds-border rounded-2xl shadow-xl z-50 overflow-hidden">
                    <p className="text-2xs font-black ds-t3 uppercase tracking-widest px-3 pt-3 pb-1">{DEBT.SORT as string}</p>
                    {SORT_OPTIONS.map(opt => (
                      <button key={opt.key} onClick={() => { setSortKey(opt.key); setIsSortOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${sortKey === opt.key ? "ds-aurora-bg ds-aurora-text" : "ds-t1"}`}>
                        <opt.Icon size={13} />
                        <span className="text-xs font-bold">{opt.label}</span>
                        {sortKey === opt.key && <CheckCircle2 size={12} className="ml-auto ds-aurora-text" />}
                      </button>
                    ))}
                    <div className="h-2" />
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="space-y-2.5 flex-1">
        {currentList.length === 0 && (
          <div className="text-center py-14 ds-bg-1/10 rounded-[24px] border border-dashed ds-border">
            <p className="text-label font-black ds-t3 uppercase tracking-[0.4em]">{emptyMsg}</p>
          </div>
        )}
        {activeTab !== "paid" && currentList.map(d => (
          <DebtCard key={d.id} d={d} balance={balance} isExpanded={expandedId === d.id}
            onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
            onPay={() => void fetchDebts()} onEdit={() => void fetchDebts()} onDelete={id => void confirmDelete(id)} />
        ))}
        {activeTab === "paid" && currentList.map(d => (
          <PaidCard key={d.id} d={d} payments={payments[d.id] ?? []} isExpanded={expandedId === d.id}
            onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
            onDelete={id => void confirmDelete(id)} />
        ))}
      </div>

      <AnimatePresence>
        {toast.show && (
          <motion.div initial={{ opacity: 0, y: -40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} className="fixed top-6 left-0 right-0 z-[50] flex justify-center px-4 pointer-events-none">
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-full shadow-2xl backdrop-blur-xl border"
              style={toast.type === "error"
                ? { background: "color-mix(in srgb, var(--a3) 12%, transparent)", borderColor: "color-mix(in srgb, var(--a3) 25%, transparent)", color: "var(--a3)" }
                : { background: "color-mix(in srgb, var(--income) 12%, transparent)", borderColor: "color-mix(in srgb, var(--income) 25%, transparent)", color: "var(--income)" }}>
              <span className="text-xs font-bold tracking-wide">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default DebtsTabComponent;
