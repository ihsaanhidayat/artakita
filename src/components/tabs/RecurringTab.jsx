"use client";
import { memo } from "react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { parseFlexibleNumber, fmt } from "@/lib/utils";
import {
 Trash2, Edit3, X, Save, RefreshCw,
 ArrowDownCircle, ArrowUpCircle,
 Play, Pause, ChevronDown, Loader2, Clock
} from "lucide-react";

const FREQ_OPTIONS = [
 { value: "daily", label: "Harian", sub: "Setiap hari" },
 { value: "weekly", label: "Mingguan", sub: "Setiap 7 hari" },
 { value: "monthly", label: "Bulanan", sub: "Setiap bulan" },
];

const getNextLabel = (dateStr) => {
 if (!dateStr) return "-";
 const next = new Date(dateStr);
 const today = new Date();
 today.setHours(0, 0, 0, 0);
 next.setHours(0, 0, 0, 0);
 const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
 if (diff < 0) return "Terlambat";
 if (diff === 0) return "Hari ini";
 if (diff === 1) return "Besok";
 return `${diff} hari lagi`;
};

const getNextStyle = (dateStr) => {
 if (!dateStr) return {};
 const next = new Date(dateStr);
 const today = new Date();
 today.setHours(0, 0, 0, 0);
 next.setHours(0, 0, 0, 0);
 const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
 if (diff < 0) return { color: "var(--a3)" };
 if (diff <= 1) return { color: "#f59e0b" };
 if (diff <= 3) return { color: "var(--a1)" };
 return {};
};

const RecurringTabComponent = memo(function RecurringTab({ activeWallet, onNotify, refreshKey }) {
 const [items, setItems] = useState([]);
 const [isLoading, setIsLoading] = useState(false);
 const [isFormOpen, setIsFormOpen] = useState(false);
 const [editingId, setEditingId] = useState(null);
 const [expandedId, setExpandedId] = useState(null);
 const [deleteModal, setDeleteModal] = useState({ show: false, id: null, note: "" });
 const [isSaving, setIsSaving] = useState(false);
 const [runningId, setRunningId] = useState(null);

 const [form, setForm] = useState({
 note: "", amount: "", category: "",
 type: "expense", frequency: "monthly",
 next_run_date: new Date().toISOString().slice(0, 10),
 });

 const showNotif = (msg, type = "error") => onNotify?.(msg, type);

 // ── Fetch ──────────────────────────────────────────────────────────────
 const fetchItems = useCallback(async () => {
 if (!activeWallet?.id) return;
 setIsLoading(true);
 const { data } = await supabase
 .from("recurring_transactions")
 .select("*")
 .eq("wallet_id", activeWallet.id)
 .order("next_run_date", { ascending: true });
 if (data) setItems(data);
 setIsLoading(false);
 }, [activeWallet?.id]);

 useEffect(() => { fetchItems(); }, [fetchItems, refreshKey]);

 const resetForm = () => {
 setForm({
 note: "", amount: "", category: "",
 type: "expense", frequency: "monthly",
 next_run_date: new Date().toISOString().slice(0, 10),
 });
 setEditingId(null);
 };

 // ── Save ────────────────────────────────────────────────────────────────
 const handleSave = async (e) => {
 e.preventDefault();
 if (!form.note.trim() || !form.amount || !form.category.trim()) {
 showNotif("Catatan, nominal, dan kategori wajib diisi.");
 return;
 }
 const parsedAmount = parseFlexibleNumber(form.amount);
 if (parsedAmount <= 0) { showNotif("Nominal harus lebih dari 0."); return; }

 setIsSaving(true);
 try {
 const { data: { session } } = await supabase.auth.getSession();
 const payload = {
 note: form.note.trim(),
 amount: parsedAmount,
 category: form.category.trim(),
 type: form.type,
 frequency: form.frequency,
 next_run_date: form.next_run_date,
 wallet_id: activeWallet.id,
 is_active: true,
 };

 if (editingId) {
 const { error } = await supabase.from("recurring_transactions").update(payload).eq("id", editingId);
 if (error) throw error;
 } else {
 const { error } = await supabase.from("recurring_transactions").insert([{ ...payload, user_id: session.user.id }]);
 if (error) throw error;
 }

 showNotif(editingId ? "Berhasil diperbarui!" : "Transaksi rutin ditambahkan!", "success");
 resetForm();
 setIsFormOpen(false);
 fetchItems();
 } catch (err) {
 showNotif("Gagal: " + err.message);
 } finally {
 setIsSaving(false);
 }
 };

 // ── Toggle active ──────────────────────────────────────────────────────
 const handleToggle = async (item) => {
 const { error } = await supabase
 .from("recurring_transactions")
 .update({ is_active: !item.is_active })
 .eq("id", item.id);
 if (!error) {
 setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i));
 }
 };

 // ── Run now (jalankan manual) ──────────────────────────────────────────
 const handleRunNow = async (item) => {
 setRunningId(item.id);
 try {
 const { data: { session } } = await supabase.auth.getSession();

 // Insert transaksi
 const { error } = await supabase.from("transactions").insert([{
 user_id: session.user.id,
 wallet_id: item.wallet_id,
 note: item.note,
 amount: item.amount,
 category: item.category,
 type: item.type,
 }]);
 if (error) throw error;

 // Hitung next_run_date
 const current = new Date(item.next_run_date);
 let nextDate = new Date(current);
 if (item.frequency === "daily") nextDate.setDate(current.getDate() + 1);
 if (item.frequency === "weekly") nextDate.setDate(current.getDate() + 7);
 if (item.frequency === "monthly") nextDate.setMonth(current.getMonth() + 1);

 await supabase
 .from("recurring_transactions")
 .update({ next_run_date: nextDate.toISOString().slice(0, 10) })
 .eq("id", item.id);

 showNotif(`Transaksi "${item.note}" berhasil dicatat!`, "success");
 fetchItems();
 } catch (err) {
 showNotif("Gagal: " + err.message);
 } finally {
 setRunningId(null);
 }
 };

 // ── Delete ─────────────────────────────────────────────────────────────
 const confirmDelete = async () => {
 await supabase.from("recurring_transactions").delete().eq("id", deleteModal.id);
 setDeleteModal({ show: false, id: null, note: "" });
 showNotif("Dihapus.", "success");
 fetchItems();
 };

 // Hitung berapa yang jatuh tempo hari ini / terlambat
 const dueTodayCount = items.filter(i => {
 if (!i.is_active) return false;
 const diff = Math.ceil((new Date(i.next_run_date) - new Date()) / (1000 * 60 * 60 * 24));
 return diff <= 0;
 }).length;

 return (
 <div className="pt-8 px-3 pb-32 h-[100dvh] overflow-y-auto no-scrollbar w-full flex flex-col">

 {/* Header */}
 <div className="mb-6 flex-none">
 <h2 className="text-[26px] font-light tracking-[-1.5px] leading-none ds-t1">Transaksi Rutin</h2>
 <div className="flex items-center gap-2 mt-1">
  <span className="ds-live-dot" />
  <p className="text-caption font-black tracking-[0.14em] uppercase ds-aurora-text">{activeWallet?.name}</p>
 </div>
 </div>

 {/* Alert jika ada yang jatuh tempo */}
 <AnimatePresence>
 {dueTodayCount > 0 && (
 <motion.div
 initial={{ opacity: 0, y: -8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0 }}
 className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-[20px] p-4 flex items-center gap-3 flex-none"
 >
 <Clock size={18} className="text-amber-500 shrink-0" />
 <div>
 <p className="text-caption font-black text-amber-500 uppercase tracking-widest">Perlu Dijalankan</p>
 <p className="text-xs font-bold text-amber-400/80">
 {dueTodayCount} transaksi rutin sudah jatuh tempo. Klik "Jalankan" untuk mencatat.
 </p>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Summary */}
 <div className="grid grid-cols-3 gap-2 mb-6 flex-none">
 {[
 { label: "Total", value: items.length, colorVar: "var(--a1)" },
 { label: "Aktif", value: items.filter(i => i.is_active).length, colorVar: "var(--income)" },
 { label: "Jatuh Tempo", value: dueTodayCount, colorVar: "#f59e0b" },
 ].map(s => (
 <div key={s.label} className="ds-bg-1 border ds-border rounded-[20px] p-3 text-center shadow-sm">
 <p className="text-xl font-black" style={{ color: s.colorVar }}>{s.value}</p>
 <p className="text-2xs font-black ds-t3 uppercase tracking-widest">{s.label}</p>
 </div>
 ))}
 </div>

 {/* List */}
 <div className="space-y-3 flex-1">
 {isLoading && items.length === 0 && (
 <div className="space-y-3">
 {[1,2].map(i => <div key={i} className="h-16 ds-bg-3 rounded-[24px] animate-pulse" />)}
 </div>
 )}

 {!isLoading && items.length === 0 && (
 <div className="text-center py-16 ds-bg-1/10 rounded-[28px] border border-dashed ds-border">
 <RefreshCw size={32} className="ds-t3 mx-auto mb-3" />
 <p className="text-caption font-black ds-t3 uppercase tracking-[0.4em]">Belum Ada Transaksi Rutin</p>
 </div>
 )}

 {items.map((item, index) => {
 const isExpanded = expandedId === item.id;
 const nextLabel = getNextLabel(item.next_run_date);
 const nextStyle = getNextStyle(item.next_run_date);
 const isRunning = runningId === item.id;
 const freqLabel = FREQ_OPTIONS.find(f => f.value === item.frequency)?.label || item.frequency;

 return (
 <motion.div
 key={item.id}
 layout
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: index * 0.04 }}
 className={`ds-bg-1 border rounded-[24px] shadow-sm overflow-hidden transition-all ${
 !item.is_active ? "opacity-50 ds-border" : "ds-border"
 }`}
 >
 {/* Accent strip */}
 <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: item.type === "income" ? "var(--income)" : "var(--a3)" }} />

 <button
 onClick={() => setExpandedId(isExpanded ? null : item.id)}
 className="w-full flex items-center gap-3 px-4 py-3.5 pl-5 text-left relative"
 >
 {/* Type icon */}
 <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
 style={item.type === "income"
 ? { background: "color-mix(in srgb, var(--income) 12%, transparent)", color: "var(--income)" }
 : { background: "color-mix(in srgb, var(--a3) 12%, transparent)", color: "var(--a3)" }}
 >
 {item.type === "income" ? <ArrowDownCircle size={18} /> : <ArrowUpCircle size={18} />}
 </div>

 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <p className="font-black text-sm ds-t1 truncate">{item.note}</p>
 {!item.is_active && (
 <span className="text-2xs font-black ds-t3 ds-bg-3px-2 py-0.5 rounded-full uppercase shrink-0">Nonaktif</span>
 )}
 </div>
 <div className="flex items-center gap-2 mt-0.5">
 <span className="text-label font-black ds-t3">{freqLabel}</span>
 <span className="ds-t3">·</span>
 <span className="text-label font-black ds-t3" style={nextStyle}>{nextLabel}</span>
 </div>
 </div>

 <div className="flex items-center gap-2 shrink-0">
 <p className="font-black text-sm ff-mono" style={{ color: item.type === "income" ? "var(--income)" : "var(--a3)" }}>
 Rp {fmt(item.amount)}
 </p>
 <motion.div
 animate={{ rotate: isExpanded ? 180 : 0 }}
 transition={{ duration: 0.2 }}
 className="ds-t3"
 >
 <ChevronDown size={14} />
 </motion.div>
 </div>
 </button>

 {/* Expanded */}
 <AnimatePresence initial={false}>
 {isExpanded && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: "auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="overflow-hidden"
 >
 <div className="px-4 pb-4 pt-2 border-t ds-border space-y-3">
 <div className="grid grid-cols-2 gap-2 text-label">
 <div>
 <p className="font-black ds-t3 uppercase tracking-widest mb-0.5">Kategori</p>
 <p className="font-bold ds-t1">{item.category}</p>
 </div>
 <div>
 <p className="font-black ds-t3 uppercase tracking-widest mb-0.5">Frekuensi</p>
 <p className="font-bold ds-t1">{freqLabel}</p>
 </div>
 <div>
 <p className="font-black ds-t3 uppercase tracking-widest mb-0.5">Jadwal Berikutnya</p>
 <p className="font-bold ds-t3" style={nextStyle}>
 {item.next_run_date
 ? new Date(item.next_run_date).toLocaleDateString("id-ID")
 : "-"}
 </p>
 </div>
 <div>
 <p className="font-black ds-t3 uppercase tracking-widest mb-0.5">Status</p>
 <p className="font-bold ds-t3" style={item.is_active ? { color: "var(--income)" } : undefined}>
 {item.is_active ? "Aktif" : "Nonaktif"}
 </p>
 </div>
 </div>

 {/* Action buttons */}
 <div className="flex gap-2 pt-1 flex-wrap">
 {/* Jalankan sekarang */}
 {item.is_active && (
 <button
 onClick={() => handleRunNow(item)}
 disabled={isRunning}
 className="flex items-center gap-1.5 px-3 py-2 ds-aurora-bg border ds-aurora-border-c ds-aurora-text font-black text-label uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
 >
 {isRunning ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
 {isRunning ? "Memproses..." : "Jalankan"}
 </button>
 )}

 {/* Toggle aktif */}
 <button
 onClick={() => handleToggle(item)}
 className="flex items-center gap-1.5 px-3 py-2 border font-black text-label uppercase tracking-widest rounded-xl transition-all"
 style={item.is_active
 ? undefined
 : { background: "color-mix(in srgb, var(--income) 12%, transparent)", borderColor: "color-mix(in srgb, var(--income) 25%, transparent)", color: "var(--income)" }}
 >
 {item.is_active ? <><Pause size={11} /> Nonaktifkan</> : <><Play size={11} /> Aktifkan</>}
 </button>

 {/* Edit */}
 <button
 onClick={() => {
 setForm({
 note: item.note,
 amount: String(item.amount),
 category: item.category,
 type: item.type,
 frequency: item.frequency,
 next_run_date: item.next_run_date,
 });
 setEditingId(item.id);
 setIsFormOpen(true);
 setExpandedId(null);
 }}
 className="flex items-center gap-1.5 px-3 py-2 ds-bg-3 border ds-border ds-t3 hover:ds-aurora-text font-black text-label uppercase tracking-widest rounded-xl transition-all"
 >
 <Edit3 size={11} /> Edit
 </button>

 {/* Hapus */}
 <button
 onClick={() => setDeleteModal({ show: true, id: item.id, note: item.note })}
 className="p-2 ds-t3 hover:text-fuchsia-400 ds-bg-3 rounded-xl transition-colors ml-auto"
 >
 <Trash2 size={14} />
 </button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </motion.div>
 );
 })}
 </div>

 {/* Bottom Sheet Form (edit only) */}
 <AnimatePresence>
 {isFormOpen && (
 <>
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
 onClick={() => { if (!isSaving) { resetForm(); setIsFormOpen(false); } }}
 />
 <motion.form
 initial={{ y: 500, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 exit={{ y: 500, opacity: 0 }}
 transition={{ type: "spring", damping: 28, stiffness: 280 }}
 onSubmit={handleSave}
 className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto ds-bg-1 border-t ds-border rounded-t-[32px] pb-safe shadow-2xl z-50 max-h-[92dvh] overflow-y-auto no-scrollbar"
 >
 <div className="p-6 pb-8 space-y-4">
 <div className="w-10 h-1 ds-bg-3 rounded-full mx-auto mb-1" />
 <div className="flex justify-between items-center">
 <h3 className="text-sm font-black ds-t1 uppercase tracking-widest">
 {"Edit Transaksi Rutin"}
 </h3>
 <button type="button" onClick={() => { if (!isSaving) { resetForm(); setIsFormOpen(false); } }} className="p-2 ds-t3 hover:text-fuchsia-400 ds-bg-3 rounded-full transition-colors">
 <X size={18} />
 </button>
 </div>

 {/* Tipe */}
 <div className="flex ds-bg-3 p-2 rounded-2xl">
 {[{ val: "expense", label: "Pengeluaran", Icon: ArrowUpCircle, activeStyle: { color: "var(--a3)", background: "color-mix(in srgb, var(--a3) 8%, transparent)", borderColor: "color-mix(in srgb, var(--a3) 20%, transparent)" } },
 { val: "income", label: "Pemasukan", Icon: ArrowDownCircle, activeStyle: { color: "var(--income)", background: "color-mix(in srgb, var(--income) 8%, transparent)", borderColor: "color-mix(in srgb, var(--income) 20%, transparent)" } },
 ].map(({ val, label, Icon, activeStyle }) => (
 <button key={val} type="button" onClick={() => setForm(p => ({ ...p, type: val }))}
 className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-caption uppercase tracking-widest border transition-all"
 style={form.type === val ? activeStyle : { borderColor: "transparent" }}
 >
 <Icon size={13} /> {label}
 </button>
 ))}
 </div>

 {/* Catatan */}
 <div>
 <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-1.5">Catatan *</label>
 <input type="text" required autoFocus placeholder="Cth: Gaji, Cicilan, Netflix"
 value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
 className="w-full ds-bg-3 border ds-border ds-t1 font-bold text-sm p-4 rounded-2xl outline-none focus:border-[var(--a1)] transition-all placeholder:opacity-40"
 />
 </div>

 {/* Nominal + Kategori */}
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-1.5">Nominal *</label>
 <input type="text" required placeholder="5jt, 500k..."
 value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
 className="w-full ds-bg-3 border ds-border ds-t1 font-bold text-sm p-3 rounded-2xl outline-none focus:border-[var(--a1)] transition-all placeholder:opacity-40"
 />
 </div>
 <div>
 <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-1.5">Kategori *</label>
 <input type="text" required placeholder="Gaji, Tagihan..."
 value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
 className="w-full ds-bg-3 border ds-border ds-t1 font-bold text-sm p-3 rounded-2xl outline-none focus:border-[var(--a1)] transition-all placeholder:opacity-40"
 />
 </div>
 </div>

 {/* Frekuensi */}
 <div>
 <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-2">Frekuensi</label>
 <div className="grid grid-cols-3 gap-2">
 {FREQ_OPTIONS.map(f => (
 <button key={f.value} type="button" onClick={() => setForm(p => ({ ...p, frequency: f.value }))}
 className={`py-3 rounded-2xl font-black text-label uppercase tracking-widest border transition-all text-center ${
 form.frequency === f.value
 ? "ds-aurora-bg ds-aurora-border-c ds-aurora-text shadow-sm"
 : "ds-bg-3 ds-border ds-t3"
 }`}
 >
 <p>{f.label}</p>
 <p className="text-2xs font-bold normal-case tracking-normal mt-0.5 opacity-70">{f.sub}</p>
 </button>
 ))}
 </div>
 </div>

 {/* Next run date */}
 <div>
 <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-1.5">Jadwal Pertama / Berikutnya</label>
 <input type="date" required
 value={form.next_run_date}
 onChange={e => setForm(p => ({ ...p, next_run_date: e.target.value }))}
 className="w-full ds-bg-3 border ds-border ds-t1 font-bold text-sm p-4 rounded-2xl outline-none focus:border-[var(--a1)] transition-all"
 />
 </div>

 <button type="submit" disabled={isSaving}
 className="w-full flex items-center justify-center gap-2 py-4 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
 style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))" }}
 >
 {isSaving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Save size={14} /> {"Simpan Perubahan"}</>}
 </button>
 </div>
 </motion.form>
 </>
 )}
 </AnimatePresence>

 {/* Delete Modal */}
 <AnimatePresence>
 {deleteModal.show && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
 >
 <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
 transition={{ type: "spring", damping: 25, stiffness: 300 }}
 className="w-full max-w-sm ds-bg-1 rounded-[32px] p-6 shadow-2xl border border-red-100 text-center"
 >
 <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
 <Trash2 className="text-red-500" size={24} />
 </div>
 <h3 className="text-sm font-black ds-t1 uppercase tracking-widest mb-2">Hapus Jadwal?</h3>
 <p className="text-xs ds-t2 mb-6"><strong>{deleteModal.note}</strong> akan dihapus permanen.</p>
 <div className="flex gap-3">
 <button onClick={() => setDeleteModal({ show: false, id: null, note: "" })} className="flex-1 ds-bg-3ds-t1 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all">Batal</button>
 <button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-red-500/30">Hapus</button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );

});

export default RecurringTabComponent;
