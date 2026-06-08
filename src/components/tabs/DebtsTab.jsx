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
 SortAsc, Clock
} from "lucide-react";

// ── Chart ─────────────────────────────────────────────────────────────────────
const DebtChart = memo(function DebtChart({ debts, balance }) {
 const totalInit = debts.filter(d => d.type === "debt").reduce((a,c) => a + Math.abs(Number(c.initial_amount)), 0);
 const totalDebt = debts.filter(d => d.type === "debt").reduce((a,c) => a + Math.abs(Number(c.amount)), 0);
 const terbayar = Math.max(0, totalInit - totalDebt);
 const totalRec = debts.filter(d => d.type === "receivable").reduce((a,c) => a + Math.abs(Number(c.amount)), 0);

 const bars = [
 { label: "Total Hutang", value: totalInit, colorVar: "var(--a3)" },
 { label: "Terbayar", value: terbayar, colorVar: "var(--income)" },
 { label: "Saldo", value: balance, colorVar: "var(--a1)" },
 { label: "Piutang", value: totalRec, colorVar: "var(--a2)" },
 ];
 const maxVal = Math.max(...bars.map(b => b.value), 1);

 return (
 <div className="ds-bg-1 border ds-border rounded-[24px] p-5 mb-4 shadow-sm">
 <p className="text-[9px] font-black ds-t3 uppercase tracking-[0.3em] mb-4">Ringkasan Visual</p>
 <div className="flex items-end gap-2 h-24 mb-3">
 {bars.map((bar, i) => {
 const pct = Math.max((bar.value / maxVal) * 100, 2);
 return (
 <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
 <span className="text-[8px] font-black ds-t3">{fmtShort(bar.value)}</span>
 <div className="w-full flex items-end" style={{ height: "72px" }}>
 <motion.div
 initial={{ height: 0 }}
 animate={{ height: `${pct}%` }}
 transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.08 }}
 className="w-full rounded-xl relative overflow-hidden"
 style={{ background: bar.colorVar, boxShadow: `0 4px 12px color-mix(in srgb, ${bar.colorVar} 30%, transparent)` }}
 >
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
 <span className="text-[8px] font-black ds-t3 uppercase tracking-wider truncate">{bar.label}</span>
 </div>
 ))}
 </div>
 {totalInit > 0 && (
 <div className="mt-3 pt-3 border-t ds-border">
 <div className="flex justify-between mb-1">
 <span className="text-[8px] font-black ds-t3 uppercase tracking-widest">Pelunasan Hutang</span>
 <span className="text-[8px] font-black" style={{ color: "var(--income)" }}>{((terbayar / totalInit) * 100).toFixed(0)}%</span>
 </div>
 <div className="w-full h-1.5 ds-bg-3 rounded-full overflow-hidden">
 <motion.div
 initial={{ width: 0 }}
 animate={{ width: `${(terbayar / totalInit) * 100}%` }}
 transition={{ duration: 1, ease: "easeOut" }}
 style={{ height: "100%", background: "var(--income)", borderRadius: "9999px" }}
 />
 </div>
 </div>
 )}
 </div>
 );
});

// ── Sort Options ──────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
 { key: "nominal", label: DEBT.SORT_NOMINAL, Icon: TrendingDown },
 { key: "percent", label: DEBT.SORT_PERCENT, Icon: SortAsc },
 { key: "duedate", label: DEBT.SORT_DUEDATE, Icon: Clock },
];

const sortDebts = (debts, sortKey) => {
 return [...debts].sort((a, b) => {
 if (sortKey === "nominal") return Math.abs(Number(b.amount)) - Math.abs(Number(a.amount));
 if (sortKey === "percent") {
 const pctA = a.initial_amount > 0 ? (1 - a.amount / a.initial_amount) : 0;
 const pctB = b.initial_amount > 0 ? (1 - b.amount / b.initial_amount) : 0;
 return pctB - pctA;
 }
 if (sortKey === "duedate") {
 if (!a.due_date && !b.due_date) return 0;
 if (!a.due_date) return 1;
 if (!b.due_date) return -1;
 return new Date(a.due_date) - new Date(b.due_date);
 }
 return 0;
 });
};

// ── Debt Card ─────────────────────────────────────────────────────────────────
const DebtCard = memo(function DebtCard({
 d, balance, isExpanded, onToggle,
 onPay, onEdit, onDelete,
}) {
 const [isEditMode, setIsEditMode] = useState(false);
 const [editData, setEditData] = useState({ person_name: "", initial_amount: "", due_date: "" });
 const [isEditSaving, setIsEditSaving] = useState(false);
 const [payAmount, setPayAmount] = useState("");
 const [payError, setPayError] = useState("");
 const [isPayOpen, setIsPayOpen] = useState(false);
 const [isPayLoading, setIsPayLoading] = useState(false);

 const rawAmount = Math.abs(Number(d.amount));
 const rawInitial = Math.abs(Number(d.initial_amount));
 const paid = Math.max(0, rawInitial - rawAmount);
 const progress = rawInitial > 0 ? Math.min((paid / rawInitial) * 100, 100) : 0;
 const isDebt = d.type === "debt";
 const isLunas = progress >= 100 && rawAmount <= 0;

 // Due date info
 const getDueInfo = () => {
 if (!d.due_date) return null;
 const diff = Math.ceil((new Date(d.due_date) - new Date()) / (1000 * 60 * 60 * 24));
 if (diff < 0) return { label: `Terlambat ${Math.abs(diff)} hari`, style: { color: "var(--a3)" } };
 if (diff === 0) return { label: "Jatuh tempo hari ini!", style: { color: "#f59e0b" } };
 if (diff <= 3) return { label: `${diff} hari lagi`, style: { color: "#f59e0b" } };
 return { label: new Date(d.due_date).toLocaleDateString("id-ID"), style: {} };
 };
 const dueInfo = getDueInfo();

 const barColorStyle = isLunas ? "var(--income)"
 : progress < 30 ? "var(--a3)"
 : progress < 70 ? "#f59e0b"
 : "var(--income)";

 const startEdit = () => {
 setIsEditMode(true);
 setEditData({
 person_name: d.person_name,
 initial_amount: String(d.initial_amount),
 due_date: d.due_date || "",
 });
 };

 const saveEdit = async () => {
 try {
 const newInitial = Math.abs(parseFlexibleNumber(editData.initial_amount));
 if (newInitial <= 0) return;
 if (!editData.person_name.trim()) return;
 setIsEditSaving(true);
 const sudahDibayar = Math.max(0, rawInitial - rawAmount);
 const newAmount = Math.max(0, newInitial - sudahDibayar);
 const { error } = await supabase.from("debts").update({
 person_name: editData.person_name.trim(),
 initial_amount: newInitial,
 amount: newAmount,
 status: newAmount <= 0 ? "paid" : "unpaid",
 due_date: editData.due_date || null,
 }).eq("id", d.id);
 setIsEditSaving(false);
 if (!error) { setIsEditMode(false); onEdit(); }
 } catch (err) {
 setIsEditSaving(false);
 }
 };

 const handlePay = async () => {
 try {
 const amount = parseFlexibleNumber(payAmount);
 setPayError("");
 if (amount <= 0) { setPayError(DEBT.EXCEED_ZERO); return; }
 if (amount > rawAmount) { setPayError(DEBT.EXCEED_DEBT(fmt(rawAmount))); return; }
 if (isDebt && amount > balance) { setPayError(DEBT.EXCEED_BAL(fmt(balance))); return; }
 setIsPayLoading(true);
 const rpc = isDebt ? "process_debt_payment" : "process_receivable_payment";
 const { error } = await supabase.rpc(rpc, { debt_id_input: d.id, payment_amount: amount });
 setIsPayLoading(false);
 if (!error) { setIsPayOpen(false); setPayAmount(""); onPay(); }
 else setPayError("Gagal: " + error.message);
 } catch (err) {
 setPayError("Gagal: " + err.message);
 setIsPayLoading(false);
 }
 };

 return (
 <motion.div
 layout
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 className="ds-bg-1 border ds-border rounded-[22px] shadow-sm overflow-hidden"
 >
 {/* Accent strip */}
 <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: isLunas ? "var(--income)" : isDebt ? "var(--a3)" : "var(--a1)" }} />

 {/* ── COLLAPSED HEADER ── */}
 <button
 onClick={() => !isEditMode && onToggle()}
 className="w-full flex items-center justify-between px-5 py-4 pl-6 text-left"
 >
 <div className="flex items-center gap-2 flex-wrap min-w-0">
 <p className="font-black text-sm ds-t1 truncate">{d.person_name}</p>
 {/* Badge tipe */}
 <span
 className="flex items-center gap-0.5 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0"
 style={isDebt
 ? { background: "color-mix(in srgb, var(--a3) 12%, transparent)", color: "var(--a3)" }
 : { background: "color-mix(in srgb, var(--a1) 12%, transparent)", color: "var(--a1)" }}
 >
 {isDebt ? <ArrowUpRight size={9} /> : <ArrowDownLeft size={9} />}
 {isDebt ? DEBT.TAB_DEBT : DEBT.TAB_RECEIVE}
 </span>
 {/* Badge lunas */}
 {isLunas && (
 <span className="flex items-center gap-2 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0 border" style={{ color: "var(--income)", background: "color-mix(in srgb, var(--income) 10%, transparent)", borderColor: "color-mix(in srgb, var(--income) 25%, transparent)" }}>
 <CheckCircle2 size={8} /> {DEBT.PAID_BADGE}
 </span>
 )}
 {/* Due date kritis */}
 {dueInfo && !isLunas && (
 <span className="text-[8px] font-black ds-t3" style={dueInfo.style}>{dueInfo.label}</span>
 )}
 </div>

 {/* Chevron saja — tidak ada nominal saat collapsed */}
 <motion.div
 animate={{ rotate: isExpanded ? 180 : 0 }}
 transition={{ duration: 0.2 }}
 className="ds-t3 shrink-0 ml-2"
 >
 <ChevronDown size={16} />
 </motion.div>
 </button>

 {/* Progress bar tipis — visual indicator saat collapsed */}
 {!isLunas && rawInitial > 0 && (
 <div className="w-full h-0.5 ds-bg-3 overflow-hidden">
 <div style={{ height: "100%", width: `${progress}%`, background: barColorStyle }} />
 </div>
 )}

 {/* ── EXPANDED DETAIL ── */}
 <AnimatePresence initial={false}>
 {isExpanded && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: "auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.22, ease: "easeInOut" }}
 className="overflow-hidden"
 >
 <div className="px-5 pb-5 pl-6 pt-3 border-t ds-border">

 {/* ── Edit Mode ── */}
 <AnimatePresence mode="wait">
 {isEditMode ? (
 <motion.div
 key="edit"
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="space-y-3 mb-3"
 >
 <div>
 <label className="block text-[8px] font-black ds-t3 uppercase tracking-widest mb-1">{DEBT.PERSON_NAME}</label>
 <input
 autoFocus
 type="text"
 value={editData.person_name ?? ""}
 onChange={e => setEditData(p => ({ ...p, person_name: e.target.value }))}
 className="w-full ds-bg-3 border ds-border rounded-xl py-2.5 px-3 text-sm font-bold ds-t1 outline-none focus:border-[var(--a1)] transition-all"
 />
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="block text-[8px] font-black ds-t3 uppercase tracking-widest mb-1">{DEBT.NOMINAL}</label>
 <input
 type="text"
 value={editData.initial_amount ?? ""}
 onChange={e => setEditData(p => ({ ...p, initial_amount: e.target.value }))}
 placeholder="Cth: 500k, 1jt, 500rb"
 className="w-full ds-bg-3 border ds-border rounded-xl py-2.5 px-3 text-sm font-bold ds-t1 outline-none focus:border-[var(--a1)] transition-all placeholder-gray-400"
 />
 </div>
 <div>
 <label className="block text-[8px] font-black ds-t3 uppercase tracking-widest mb-1">{DEBT.DUE_DATE}</label>
 <input
 type="date"
 value={editData.due_date ?? ""}
 onChange={e => setEditData(p => ({ ...p, due_date: e.target.value }))}
 className="w-full ds-bg-3 border ds-border rounded-xl py-2.5 px-3 text-sm font-bold ds-t1 outline-none focus:border-[var(--a1)] transition-all"
 />
 </div>
 </div>
 <p className="text-[8px] ds-t3 ds-bg-3 px-3 py-2 rounded-lg">
 Sisa hutang dihitung otomatis: nominal baru − yang sudah dibayar
 </p>
 <div className="flex gap-2">
 <button
 onClick={saveEdit}
 disabled={isEditSaving}
 className="flex-1 flex items-center justify-center gap-1.5 py-2.5 disabled:opacity-50 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
 style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))" }}
 >
 <Save size={12} /> {isEditSaving ? "Menyimpan..." : DEBT.SAVE}
 </button>
 <button
 onClick={() => setIsEditMode(false)}
 className="px-4 py-2.5 ds-t3 ds-bg-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
 >
 {DEBT.CANCEL}
 </button>
 </div>
 </motion.div>
 ) : (
 <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
 {/* Nominal detail */}
 <div className="flex justify-between items-center mb-3">
 <div>
 <p className="font-black text-lg ds-t1 ff-mono">
 Rp {fmt(rawAmount)}
 </p>
 <p className="text-[9px] ds-t3 ff-mono">
 dari Rp {fmt(rawInitial)}
 </p>
 </div>
 <div className="text-right">
 <p className="text-[9px] font-black ds-t3 uppercase tracking-widest">{DEBT.PAID_PERCENT}</p>
 <p className="font-black text-sm" style={isLunas ? { color: "var(--income)" } : undefined}>
 {progress.toFixed(0)}%
 </p>
 </div>
 </div>

 {/* Progress bar */}
 <div className="w-full h-2 ds-bg-3 rounded-full overflow-hidden mb-3">
 <motion.div
 initial={{ width: 0 }}
 animate={{ width: `${progress}%` }}
 transition={{ duration: 0.8, ease: "easeOut" }}
 style={{ height: "100%", borderRadius: "9999px", background: barColorStyle }}
 />
 </div>

 {/* Due date */}
 {d.due_date && (
 <div className="flex items-center gap-1.5 mb-3">
 <Calendar size={11} className="ds-t3" />
 <span className="text-[9px] font-bold ds-t3">Jatuh tempo: </span>
 <span className="text-[9px] font-black ds-t3" style={dueInfo?.style}>
 {dueInfo?.label}
 </span>
 </div>
 )}

 {/* Action buttons */}
 {!isLunas && (
 <div className="flex gap-2">
 <button
 onClick={() => onDelete(d.id)}
 className="p-2.5 ds-t3 hover:text-fuchsia-400 ds-bg-3 rounded-xl transition-colors"
 >
 <Trash2 size={14} />
 </button>
 <button
 onClick={startEdit}
 className="p-2.5 ds-t3 hover:ds-aurora-text ds-bg-3 rounded-xl transition-colors"
 >
 <Edit3 size={14} />
 </button>
 <button
 onClick={() => { setIsPayOpen(!isPayOpen); setPayAmount(""); setPayError(""); }}
 className="flex-1 font-black text-[9px] uppercase tracking-widest rounded-xl py-2.5 transition-all active:scale-95 border"
 style={isPayOpen
 ? undefined
 : isDebt
 ? { background: "color-mix(in srgb, var(--a3) 10%, transparent)", color: "var(--a3)", borderColor: "color-mix(in srgb, var(--a3) 25%, transparent)" }
 : { background: "color-mix(in srgb, var(--a1) 10%, transparent)", color: "var(--a1)", borderColor: "color-mix(in srgb, var(--a1) 25%, transparent)" }}
 >
 {isPayOpen ? DEBT.CANCEL : isDebt ? DEBT.PAY_DEBT : DEBT.RECEIVE}
 </button>
 </div>
 )}

 {isLunas && (
 <button
 onClick={() => onDelete(d.id)}
 className="w-full py-2 text-[9px] font-black ds-t3 hover:text-fuchsia-400 uppercase tracking-widest transition-colors text-center rounded-xl hover:bg-fuchsia-500/5"
 >
 {DEBT.DELETE} Catatan
 </button>
 )}

 {/* Payment panel */}
 <AnimatePresence>
 {isPayOpen && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: "auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="overflow-hidden"
 >
 <div className="mt-3 pt-3 border-t ds-border">
 {isDebt && (
 <div className="flex items-center gap-1.5 mb-2">
 <Wallet size={11} className="ds-t3" />
 <span className="text-[9px] font-black ds-t3 ff-mono uppercase tracking-widest">
 {DEBT.WALLET_BALANCE}: Rp {fmt(balance)}
 </span>
 </div>
 )}
 <div className="flex gap-2">
 <input
 autoFocus
 type="text"
 placeholder="Cth: 500k, 1jt, 500rb"
 value={payAmount ?? ""}
 onChange={e => { setPayAmount(e.target.value); setPayError(""); }}
 onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handlePay(); } }}
 className="flex-1 ds-bg-3 border ds-border ds-t1 text-sm font-bold p-3 rounded-xl outline-none focus:border-[var(--a1)] transition-all"
 />
 <button
 onClick={handlePay}
 disabled={isPayLoading}
 className="px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 text-white"
 style={{ background: isDebt ? "var(--a3)" : "var(--income)", color: isDebt ? "#fff" : "#000" }}
 >
 {isPayLoading ? "..." : "OK"}
 </button>
 </div>
 <AnimatePresence>
 {payError && (
 <motion.p
 initial={{ opacity: 0, y: -4 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0 }}
 className="text-[9px] font-bold mt-2 px-3 py-1.5 rounded-lg" style={{ color: "var(--a3)", background: "color-mix(in srgb, var(--a3) 10%, transparent)" }}
 >
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
 </motion.div>
 );
});

// ── Paid Card (LUNAS tab) ─────────────────────────────────────────────────────
const PaidCard = memo(function PaidCard({ d, payments, isExpanded, onToggle, onDelete }) {
 const isDebt = d.type === "debt";
 const paidDate = payments?.[0]?.created_at;

 return (
 <motion.div
 layout
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="ds-bg-1 rounded-[22px] shadow-sm overflow-hidden opacity-80 border" style={{ borderColor: "color-mix(in srgb, var(--income) 20%, transparent)" }}
 >
 {/* Header */}
 <button
 onClick={onToggle}
 className="w-full flex items-center justify-between px-5 py-4 text-left"
 >
 <div className="flex items-center gap-2 flex-wrap min-w-0">
 <CheckCircle2 size={14} className="shrink-0" style={{ color: "var(--income)" }} />
 <p className="font-black text-sm ds-t1 truncate">{d.person_name}</p>
 <span
 className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
 style={isDebt
 ? { background: "color-mix(in srgb, var(--a3) 12%, transparent)", color: "var(--a3)" }
 : { background: "color-mix(in srgb, var(--a1) 12%, transparent)", color: "var(--a1)" }}
 >
 {isDebt ? DEBT.TAB_DEBT : DEBT.TAB_RECEIVE}
 </span>
 </div>
 <div className="flex items-center gap-2 shrink-0 ml-2">
 <p className="text-[9px] font-black ds-t3 ff-mono">Rp {fmt(d.initial_amount)}</p>
 <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="ds-t3">
 <ChevronDown size={14} />
 </motion.div>
 </div>
 </button>

 {/* Expanded: rincian pembayaran */}
 <AnimatePresence initial={false}>
 {isExpanded && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: "auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="overflow-hidden"
 >
 <div className="px-5 pb-4 border-t ds-border">
 <p className="text-[8px] font-black ds-t3 uppercase tracking-widest mt-3 mb-2">
 {DEBT.PAYMENT_HISTORY}
 </p>
 {payments?.length > 0 ? (
 <div className="space-y-2">
 {payments.map((p, i) => (
 <div key={p.id || i} className="flex justify-between items-center ds-bg-3 rounded-xl px-3 py-2">
 <div className="flex items-center gap-2">
 <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--income)" }} />
 <span className="text-[9px] font-bold ds-t2">
 {new Date(p.created_at).toLocaleDateString("id-ID")}
 </span>
 </div>
 <span className="text-[9px] font-black ff-mono" style={{ color: "var(--income)" }}>
 Rp {fmt(p.amount)}
 </span>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-[9px] ds-t3 italic">Tidak ada riwayat pembayaran tersimpan.</p>
 )}
 <button
 onClick={() => onDelete(d.id)}
 className="w-full mt-3 py-2 text-[9px] font-black ds-t3 hover:text-fuchsia-400 uppercase tracking-widest transition-colors text-center rounded-xl hover:bg-fuchsia-500/5"
 >
 Hapus Riwayat
 </button>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </motion.div>
 );
});

// ── Main ──────────────────────────────────────────────────────────────────────
const DebtsTabComponent = memo(function DebtsTab({ activeWallet, balance, refreshKey }) {
 const [debts, setDebts] = useState([]);
 const [payments, setPayments] = useState({}); // { debt_id: [trx] }
 const [activeTab, setActiveTab] = useState("debt"); // "debt"|"receivable"|"paid"
 const [sortKey, setSortKey] = useState("nominal");
 const [isSortOpen, setIsSortOpen] = useState(false);
 const [expandedId, setExpandedId] = useState(null);
 const [deleteModal, setDeleteModal] = useState({ show: false, id: null });
 const [toast, setToast] = useState({ show: false, msg: "", type: "error" });

 const showToast = (msg, type = "error") => {
 setToast({ show: true, msg, type });
 setTimeout(() => setToast({ show: false, msg: "", type: "error" }), 3000);
 };

 // ── Fetch ──────────────────────────────────────────────────────────────────
 const fetchDebts = useCallback(async () => {
 if (!activeWallet?.id) return;
 const { data } = await supabase
 .from("debts")
 .select("*")
 .eq("wallet_id", activeWallet.id)
 .order("created_at", { ascending: false });
 if (data) setDebts(data);
 }, [activeWallet?.id]);

 // Fetch payment history untuk debts lunas
 const fetchPayments = useCallback(async (debtIds) => {
 if (!debtIds?.length) return;
 const { data } = await supabase
 .from("transactions")
 .select("id, amount, created_at, debt_id")
 .in("debt_id", debtIds)
 .order("created_at", { ascending: true });
 if (data) {
 const map = {};
 data.forEach(p => {
 if (!map[p.debt_id]) map[p.debt_id] = [];
 map[p.debt_id].push(p);
 });
 setPayments(map);
 }
 }, []);

 useEffect(() => { fetchDebts(); }, [fetchDebts, refreshKey]);

 // Fetch payments saat tab LUNAS aktif
 useEffect(() => {
 if (activeTab === "paid") {
 const paidIds = debts.filter(d => d.status === "paid").map(d => d.id);
 fetchPayments(paidIds);
 }
 }, [activeTab, debts, fetchPayments]);

 // ── Derived ────────────────────────────────────────────────────────────────
 const activeDebts = useMemo(() =>
 debts.filter(d => d.type === "debt" && d.status !== "paid"),
 [debts]
 );
 const activeReceive = useMemo(() =>
 debts.filter(d => d.type === "receivable" && d.status !== "paid"),
 [debts]
 );
 const paidDebts = useMemo(() =>
 debts.filter(d => d.status === "paid"),
 [debts]
 );
 const totalDebt = useMemo(() =>
 activeDebts.reduce((a,c) => a + Number(c.amount), 0),
 [activeDebts]
 );
 const totalReceive = useMemo(() =>
 activeReceive.reduce((a,c) => a + Number(c.amount), 0),
 [activeReceive]
 );
 const currentList = useMemo(() =>
 activeTab === "debt" ? sortDebts(activeDebts, sortKey)
 : activeTab === "receivable" ? sortDebts(activeReceive, sortKey)
 : sortDebts(paidDebts, sortKey),
 [activeTab, activeDebts, activeReceive, paidDebts, sortKey]
 );
 const emptyMsg = activeTab === "debt" ? DEBT.EMPTY_DEBT
 : activeTab === "receivable" ? DEBT.EMPTY_REC
 : DEBT.EMPTY_PAID;

 const confirmDelete = useCallback(async () => {
 if (deleteModal.id) {
 await supabase.from("debts").delete().eq("id", deleteModal.id);
 fetchDebts();
 }
 setDeleteModal({ show: false, id: null });
 }, [deleteModal, fetchDebts]);

 const currentSortLabel = SORT_OPTIONS.find(s => s.key === sortKey)?.label || DEBT.SORT;

 return (
 <div className="pt-6 px-3 pb-32 h-[100dvh] overflow-y-auto no-scrollbar w-full flex flex-col">

 {/* Header */}
 <div className="flex justify-between items-start mb-4 flex-none">
 <div>
 <h2 className="text-xl font-black ds-t1 tracking-tight">{DEBT.TITLE}</h2>
 <div className="flex items-center gap-1.5 mt-0.5">
 <Wallet size={10} className="ds-aurora-text" />
 <p className="text-[9px] font-black ds-aurora-text uppercase tracking-[0.2em]">{activeWallet?.name}</p>
 </div>
 </div>
 </div>

 {/* Summary pills */}
 <div className="grid grid-cols-2 gap-2.5 mb-4 flex-none">
 {[
 { label: DEBT.TOTAL_DEBT, value: totalDebt, Icon: TrendingDown, colorVar: "var(--a3)", count: activeDebts.length },
 { label: DEBT.TOTAL_REC, value: totalReceive, Icon: TrendingUp, colorVar: "var(--a1)", count: activeReceive.length },
 ].map(({ label, value, Icon, colorVar, count }) => (
 <div key={label} className="ds-bg-1 border ds-border rounded-[20px] p-3.5 shadow-sm">
 <div className="flex items-center gap-1.5 mb-1.5" style={{ color: colorVar }}>
 <Icon size={12} />
 <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
 </div>
 <p className="font-black text-base ds-t1 ff-mono leading-tight">Rp {fmt(value)}</p>
 <p className="text-[8px] ds-t3 mt-0.5">{count} catatan</p>
 </div>
 ))}
 </div>

 {/* Chart */}
 {debts.length > 0 && <DebtChart debts={debts} balance={balance} />}

 {/* Tab + Sort header */}
 <div className="flex items-center gap-2 mb-3 flex-none">
 {/* Tab pills */}
 <div className="flex flex-1 ds-bg-3 p-2 rounded-[14px] border ds-border shadow-inner">
 {[
 { key: "debt", label: DEBT.TAB_DEBT, count: activeDebts.length },
 { key: "receivable", label: DEBT.TAB_RECEIVE, count: activeReceive.length },
 { key: "paid", label: DEBT.TAB_PAID, count: paidDebts.length },
 ].map(({ key, label, count }) => (
 <button
 key={key}
 onClick={() => { setActiveTab(key); setExpandedId(null); }}
 className={`flex-1 flex items-center justify-center gap-2 text-[8px] font-black uppercase tracking-widest py-2 rounded-xl transition-all duration-200 ${
 activeTab === key
 ? "ds-bg-1 ds-aurora-bg ds-aurora-text ds-t1 shadow-sm"
 : "ds-t3"
 }`}
 >
 {label}
 {count > 0 && (
 <span className={`text-[9px] font-black px-1 py-0.5 rounded-full ${
 activeTab === key ? "ds-aurora-bg ds-aurora-text" : "ds-bg-3 ds-t2"
 }`}>
 {count}
 </span>
 )}
 </button>
 ))}
 </div>

 {/* Sort dropdown */}
 {activeTab !== "paid" && (
 <div className="relative">
 <button
 onClick={() => setIsSortOpen(!isSortOpen)}
 className="flex items-center gap-1.5 px-3 py-2 ds-bg-1 border ds-border rounded-xl text-[8px] font-black ds-t2 uppercase tracking-widest transition-all hover:ds-aurora-border-c"
 >
 <ArrowUpDown size={11} />
 </button>

 <AnimatePresence>
 {isSortOpen && (
 <>
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-40"
 onClick={() => setIsSortOpen(false)}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: -4 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: -4 }}
 transition={{ duration: 0.15 }}
 className="absolute right-0 top-full mt-1.5 w-48 ds-bg-1 border ds-border rounded-2xl shadow-xl z-50 overflow-hidden"
 >
 <p className="text-[8px] font-black ds-t3 uppercase tracking-widest px-3 pt-3 pb-1">{DEBT.SORT}</p>
 {SORT_OPTIONS.map(opt => (
 <button
 key={opt.key}
 onClick={() => { setSortKey(opt.key); setIsSortOpen(false); }}
 className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
 sortKey === opt.key
 ? "ds-aurora-bg ds-aurora-text"
 : "ds-t1 hover:ds-bg-3 /50"
 }`}
 >
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

 {/* List */}
 <div className="space-y-2.5 flex-1">
 {currentList.length === 0 && (
 <div className="text-center py-14 ds-bg-1/10 rounded-[24px] border border-dashed ds-border">
 <p className="text-[9px] font-black ds-t3 uppercase tracking-[0.4em]">{emptyMsg}</p>
 </div>
 )}

 {activeTab !== "paid" && currentList.map(d => (
 <DebtCard
 key={d.id}
 d={d}
 balance={balance}
 isExpanded={expandedId === d.id}
 onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
 onPay={fetchDebts}
 onEdit={fetchDebts}
 onDelete={id => setDeleteModal({ show: true, id })}
 />
 ))}

 {activeTab === "paid" && currentList.map(d => (
 <PaidCard
 key={d.id}
 d={d}
 payments={payments[d.id] || []}
 isExpanded={expandedId === d.id}
 onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
 onDelete={id => setDeleteModal({ show: true, id })}
 />
 ))}
 </div>

 {/* Delete Modal */}
 <AnimatePresence>
 {deleteModal.show && (
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
 >
 <motion.div
 initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
 transition={{ type: "spring", damping: 25, stiffness: 300 }}
 className="w-full max-w-sm ds-bg-1 rounded-[32px] p-6 shadow-2xl border border-red-100 text-center"
 >
 <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
 <Trash2 className="text-red-500" size={22} />
 </div>
 <h3 className="text-sm font-black ds-t1 uppercase tracking-widest mb-2">Hapus Catatan?</h3>
 <p className="text-xs ds-t2 mb-6">{DEBT.CONDITION || "Tindakan ini permanen."}</p>
 <div className="flex gap-3">
 <button onClick={() => setDeleteModal({ show: false, id: null })} className="flex-1 ds-bg-3ds-t1 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all">{DEBT.CANCEL}</button>
 <button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-red-500/30">{DEBT.DELETE}</button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Toast */}
 <AnimatePresence>
 {toast.show && (
 <motion.div
 initial={{ opacity: 0, y: -40, scale: 0.9 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: -20, scale: 0.9 }}
 className="fixed top-6 left-0 right-0 z-[50] flex justify-center px-4 pointer-events-none"
 >
 <div className={`flex items-center gap-3 px-5 py-3.5 rounded-full shadow-2xl backdrop-blur-xl border ${
 toast.type === "error"
 ? "bg-red-500/10 border-red-500/20 text-red-500"
 : "bg-green-500/10 border-green-500/20 text-green-500"
 }`}>
 <span className="text-xs font-bold tracking-wide">{toast.msg}</span>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
});

export default DebtsTabComponent;
