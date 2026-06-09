"use client";
import { memo, useState, useCallback, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import GuideTab from "@/components/tabs/GuideTab";
import { motion, AnimatePresence } from "framer-motion";
import {
 Download, Info, LogOut,
 Heart, ChevronRight, Shield,
 Globe, BookOpen, Trash2
} from "lucide-react";
import { MORE, ABOUT, SAVINGS, APP_NAME, APP_TAGLINE, APP_AUTHOR, FORM } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient";
import { fmt } from "@/lib/utils";
import UserManagement from "@/components/UserManagement";

// ── About Page ────────────────────────────────────────────────────────────────
const AboutPage = memo(function AboutPage({ onClose }) {
 return (
 <motion.div
 initial={{ opacity: 0, x: 40 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: 40 }}
 transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
 className="fixed inset-0 z-[90] ds-bg-0 overflow-y-auto no-scrollbar"
 >
 <div className="w-full max-w-lg mx-auto pt-8 px-4 pb-32">

 {/* Breadcrumb dengan tombol kembali */}
 <div className="flex items-center justify-between mb-6">
 <span className="text-caption font-black ds-t3 uppercase tracking-widest">
 {MORE.ABOUT}
 </span>
 <button
 onClick={onClose}
 className="flex items-center gap-1.5 ds-aurora-text hover:ds-aurora-text active:scale-95 transition-all ds-aurora-bg border ds-aurora-border-c px-3 py-1.5 rounded-xl"
 >
 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
 <span className="text-label font-black uppercase tracking-widest">{MORE.TITLE}</span>
 </button>
 </div>

 {/* App card */}
 <div className="ds-aurora-card ds-aurora-glow-card rounded-[32px] p-8 mb-6 text-center relative overflow-hidden">
 <div className="absolute inset-0 rounded-[32px]" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--a1) 15%, transparent), color-mix(in srgb, var(--a2) 20%, transparent))" }} />
 <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl" style={{ background: "color-mix(in srgb, var(--a2) 20%, transparent)" }} />
 <div className="relative z-10">
 <h3 className="text-3xl font-black tracking-tight mb-1 ds-aurora-text">{APP_NAME}.</h3>
 <p className="text-caption font-bold uppercase tracking-widest mb-3 ds-t3">{APP_TAGLINE}</p>
 <span className="px-3 py-1 rounded-full text-caption font-black uppercase tracking-widest ds-aurora-bg border ds-aurora-border-c ds-t2">
 {ABOUT.VERSION}
 </span>
 </div>
 </div>

 {/* Description */}
 <div className="ds-bg-1 rounded-[24px] p-5 border ds-border mb-4 shadow-sm">
 <p className="text-sm ds-t2 leading-relaxed">{ABOUT.DESC}</p>
 </div>

 {/* Features */}
 <div className="ds-bg-1 rounded-[24px] p-5 border ds-border mb-6 shadow-sm">
 <p className="text-label font-black ds-t3 uppercase tracking-widest mb-3">{ABOUT.FEATURES}</p>
 <div className="space-y-2">
 {ABOUT.FEATURE_LIST.map((f, i) => (
 <div key={i} className="flex items-center gap-2.5">
 <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: i % 2 === 0 ? "var(--a1)" : "var(--a2)" }} />
 <p className="text-sm ds-t1 font-bold">{f}</p>
 </div>
 ))}
 </div>
 </div>

 {/* Made by */}
 <div className="flex items-center justify-center gap-1.5 mt-4">
 <p className="text-caption font-bold ds-t3">{ABOUT.TECH}</p>
 </div>
 <p className="text-center text-label ds-t3 mt-1">
 {MORE.BY_AUTHOR}
 </p>
 </div>
 </motion.div>
 );
});

// ── Wallets & Savings Page ─────────────────────────────────────────────────────
const WalletsSavingsPage = memo(function WalletsSavingsPage({
 goals, setGoals, isNewGoalOpen, setIsNewGoalOpen,
 newGoalData, setNewGoalData, handleAddGoal,
 activeGoalInput, setActiveGoalInput,
 flexibleSavingsAmt, setFlexibleSavingsAmt,
 handleModifySavings,
}) {
 const [deleteGoalId, setDeleteGoalId] = useState(null);
 return (
 <motion.div
 initial={{ opacity: 0, x: 40 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: 40 }}
 transition={{ type: "spring", stiffness: 400, damping: 35 }}
 className="fixed inset-0 z-[90] ds-bg-0 overflow-y-auto no-scrollbar"
 >
 <div className="w-full max-w-lg mx-auto pt-8 px-3 pb-32">
 <h2 className="text-xl font-black ds-t1 tracking-tight mb-6">
 {SAVINGS.TITLE}
 </h2>

 {/* New goal form toggle */}
 <div className="flex justify-between items-center mb-4">
 <p className="text-label font-black ds-t3 uppercase tracking-[0.3em]">{SAVINGS.SECTION_LABEL}</p>
 <button
 onClick={() => setIsNewGoalOpen(!isNewGoalOpen)}
 className="px-3 py-1.5 ds-aurora-bg border ds-aurora-border-c ds-aurora-text font-black text-label uppercase tracking-widest rounded-xl transition-all active:scale-95"
 >
 {isNewGoalOpen ? FORM.CANCEL : SAVINGS.ADD_GOAL}
 </button>
 </div>

 <AnimatePresence>
 {isNewGoalOpen && (
 <motion.form
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: "auto" }}
 exit={{ opacity: 0, height: 0 }}
 onSubmit={handleAddGoal}
 className="ds-bg-3 p-5 rounded-[24px] border ds-border space-y-3 mb-6 overflow-hidden"
 >
 <input
 type="text" required
 placeholder={SAVINGS.GOAL_NAME_HINT}
 value={newGoalData.name}
 onChange={e => setNewGoalData(p => ({ ...p, name: e.target.value }))}
 className="w-full ds-bg-1 border ds-border rounded-xl py-2.5 px-4 text-xs font-bold ds-t1 outline-none focus:border-[var(--a1)]"
 />
 <div className="grid grid-cols-2 gap-3">
 <input
 type="text" required
 placeholder={SAVINGS.GOAL_TARGET_HINT}
 value={newGoalData.target}
 onChange={e => setNewGoalData(p => ({ ...p, target: e.target.value }))}
 className="w-full ds-bg-1 border ds-border rounded-xl py-2.5 px-4 text-xs font-bold ds-t1 outline-none focus:border-[var(--a1)]"
 />
 <input
 type="text"
 placeholder={SAVINGS.GOAL_INIT_HINT}
 value={newGoalData.current}
 onChange={e => setNewGoalData(p => ({ ...p, current: e.target.value }))}
 className="w-full ds-bg-1 border ds-border rounded-xl py-2.5 px-4 text-xs font-bold ds-t1 outline-none focus:border-[var(--a1)]"
 />
 </div>
 <button type="submit" className="w-full py-2.5 text-white text-caption font-black uppercase tracking-widest rounded-xl transition-all active:scale-[0.98]" style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))" }}>
 {SAVINGS.SAVE_GOAL}
 </button>
 </motion.form>
 )}
 </AnimatePresence>

 {/* Goal list */}
 <div className="space-y-3">
 {goals.map(goal => {
 const pct = Math.min(100, ((goal.current_amount / goal.target_amount) * 100)).toFixed(0);
 const isOpen = activeGoalInput === goal.id;
 return (
 <div key={goal.id} className="relative overflow-hidden ds-bg-1 p-5 rounded-[24px] border ds-border shadow-sm">
 <div className="flex justify-between items-start mb-3">
 <div>
 <p className="font-black text-sm ds-t1">{goal.name}</p>
 <p className="text-label ds-t3 ff-mono mt-0.5">
 Rp {fmt(goal.current_amount)} / <span className="font-bold">Rp {fmt(goal.target_amount)}</span>
 </p>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-xs font-black ds-aurora-text">{pct}%</span>
 <button onClick={() => setDeleteGoalId(goal.id)} className="p-1.5 ds-t3 hover:text-fuchsia-400 transition-colors">
 <Trash2 size={14} />
 </button>
 </div>
 </div>

 <div className="w-full h-2 ds-bg-3 rounded-full overflow-hidden mb-4">
 <motion.div
 initial={{ width: 0 }}
 animate={{ width: `${pct}%` }}
 transition={{ duration: 1, ease: "easeOut" }}
 style={{ height: "100%", background: "linear-gradient(to right, var(--a1), var(--a2))", borderRadius: "9999px" }}
 />
 </div>

 {!isOpen ? (
 <div className="flex justify-between items-center">
 <button
 onClick={() => setActiveGoalInput(goal.id)}
 className="text-label font-black ds-aurora-text ds-aurora-bg border ds-aurora-border-c px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider"
 >
 {SAVINGS.MUTASI}
 </button>
 <button
 onClick={() => handleModifySavings(goal.id, goal.current_amount, "reset")}
 className="text-label font-black ds-t3 hover:text-fuchsia-400 px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider"
 >
 Reset
 </button>
 </div>
 ) : (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-center">
 <input
 type="text"
 placeholder={SAVINGS.AMOUNT_HINT}
 value={flexibleSavingsAmt}
 onChange={e => setFlexibleSavingsAmt(e.target.value)}
 className="flex-1 ds-bg-3 border ds-border rounded-xl py-2 px-3 text-xs font-bold ds-t1 outline-none focus:border-[var(--a1)]"
 />
 <button onClick={() => handleModifySavings(goal.id, goal.current_amount, "add")} className="px-3 py-2 text-white font-black text-label uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all" style={{ background: "var(--income)", color: "#000" }}>{SAVINGS.ADD_BTN}</button>
 <button onClick={() => handleModifySavings(goal.id, goal.current_amount, "subtract")} className="px-3 py-2 text-white font-black text-label uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all" style={{ background: "color-mix(in srgb, var(--a3) 80%, var(--a2))" }}>{SAVINGS.USE_BTN}</button>
 <button onClick={() => { setActiveGoalInput(null); setFlexibleSavingsAmt(""); }} className="p-2 ds-t3 hover:ds-t2 text-xs font-bold">{FORM.CANCEL}</button>
 </motion.div>
 )}

 {/* Inline delete confirm overlay */}
 <AnimatePresence>
 {deleteGoalId === goal.id && (
 <motion.div
 initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
 transition={{ type: "spring", damping: 25, stiffness: 280 }}
 className="absolute inset-0 z-20 flex items-center justify-between px-5 backdrop-blur-md rounded-[24px]"
 style={{
 background: "color-mix(in srgb, var(--a3) 85%, var(--a2))",
 borderLeft: "3px solid var(--a3)",
 boxShadow: "inset 4px 0 20px color-mix(in srgb, var(--a3) 30%, transparent)",
 }}
 >
 <div className="flex items-center gap-2">
 <Trash2 size={15} className="text-white" />
 <span className="text-[11px] font-black text-white uppercase tracking-widest">Hapus Permanen?</span>
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => setDeleteGoalId(null)}
 className="px-3 py-1.5 rounded-[10px] bg-white/20 text-white text-label font-black uppercase tracking-widest hover:bg-white/30 transition-colors"
 >
 {FORM.CANCEL}
 </button>
 <button
 onClick={async () => {
 await supabase.from("savings_goals").delete().eq("id", goal.id);
 setGoals(p => p.filter(g => g.id !== goal.id));
 setDeleteGoalId(null);
 }}
 className="px-3 py-1.5 rounded-[10px] text-label font-black uppercase tracking-widest active:scale-95 transition-all"
 style={{ background: "rgba(255,255,255,0.9)", color: "var(--a2)" }}
 >
 Hapus
 </button>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
 })}

 {goals.length === 0 && !isNewGoalOpen && (
 <div className="text-center py-12 ds-bg-1/10 rounded-[24px] border border-dashed ds-border">
 <p className="text-caption font-black ds-t3 uppercase tracking-[0.4em]">{SAVINGS.EMPTY}</p>
 </div>
 )}
 </div>
 </div>
 </motion.div>
 );
});

// ── Main MoreTab ──────────────────────────────────────────────────────────────
const MoreTab = memo(function MoreTab({
 isAdmin, activeWallet, transactions,
 handleLogout, onNotify, onOpenAddUser,
}) {
 const [subPage, setSubPage] = useState(null);
 const [confirmLogout, setConfirmLogout] = useState(false);
 const [isExporting, setIsExporting] = useState(false);
 const { lang, setLang, isID } = useLanguage();

 // ── Export XLSX ────────────────────────────────────────────────────────────
 const handleExport = useCallback(async () => {
 if (!transactions?.length) {
 onNotify?.("Tidak ada data untuk diekspor.", "error");
 return;
 }
 setIsExporting(true);
 try {
 // Import XLSX secara dynamic agar tidak membebani initial load
 const XLSX = (await import("xlsx")).default;

 // Fetch semua data
 const walletId = activeWallet?.id;
 const [
 { data: debts },
 { data: assets },
 { data: recurring },
 { data: goalsData },
 ] = await Promise.all([
 supabase.from("debts").select("*").eq("wallet_id", walletId),
 supabase.from("assets").select("*").eq("wallet_id", walletId),
 supabase.from("recurring_transactions").select("*").eq("wallet_id", walletId),
 supabase.from("savings_goals").select("*"),
 ]);

 const wb = XLSX.utils.book_new();

 // Sheet 1: Transaksi
 const trxRows = (transactions || []).map(t => ({
 "Tanggal": new Date(t.created_at).toLocaleDateString("id-ID"),
 "Waktu": new Date(t.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
 "Catatan": t.note,
 "Kategori": t.category,
 "Jenis": t.type === "income" ? "Pemasukan" : "Pengeluaran",
 "Nominal": Number(t.amount),
 }));
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trxRows), "Transaksi");

 // Sheet 2: Hutang & Piutang
 const debtRows = (debts || []).map(d => ({
 "Nama": d.person_name,
 "Jenis": d.type === "debt" ? "Hutang" : "Piutang",
 "Nominal Awal": Number(d.initial_amount),
 "Sisa": Number(d.amount),
 "Status": d.status === "paid" ? "Lunas" : "Belum Lunas",
 "Jatuh Tempo": d.due_date || "-",
 }));
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(debtRows), "Hutang Piutang");

 // Sheet 3: Aset
 const assetRows = (assets || []).map(a => ({
 "Nama Barang": a.name,
 "Toko": a.store_name || "-",
 "Tgl Beli": a.purchase_date || "-",
 "Harga Beli": Number(a.price),
 "Kondisi": a.condition,
 "Catatan": a.notes || "-",
 }));
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(assetRows), "Aset");

 // Sheet 4: Transaksi Rutin
 const recurRows = (recurring || []).map(r => ({
 "Catatan": r.note,
 "Nominal": Number(r.amount),
 "Kategori": r.category,
 "Jenis": r.type === "income" ? "Pemasukan" : "Pengeluaran",
 "Frekuensi": r.frequency === "monthly" ? "Bulanan" : r.frequency === "weekly" ? "Mingguan" : "Harian",
 "Jadwal": r.next_run_date,
 "Status": r.is_active ? "Aktif" : "Nonaktif",
 }));
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recurRows), "Transaksi Rutin");

 // Sheet 5: Target Impian
 const goalRows = (goalsData || []).map(g => ({
 "Nama Target": g.name,
 "Target": Number(g.target_amount),
 "Terkumpul": Number(g.current_amount),
 "Progress %": `${Math.min(100, ((g.current_amount / g.target_amount) * 100)).toFixed(1)}%`,
 }));
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(goalRows), "Target Impian");

 // Download
 const date = new Date().toLocaleDateString("id-ID").replace(/\//g, "-");
 const filename = `Laporan_ArtaKita_${date}.xlsx`;
 XLSX.writeFile(wb, filename);

 onNotify?.("Laporan berhasil diunduh!", "success");
 } catch (err) {
 onNotify?.("Gagal membuat laporan: " + err.message, "error");
 } finally {
 setIsExporting(false);
 }
 }, [transactions, activeWallet, onNotify]);

 // ── Menu items ─────────────────────────────────────────────────────────────
 const menuGroups = useMemo(() => [
 {
 items: [
 {
 Icon: Download, label: MORE.EXPORT,
 sub: MORE.EXPORT_SUB,
 color: "ds-aurora-text", bg: "ds-aurora-bg",
 action: handleExport,
 loading: isExporting,
 },
 {
 Icon: Globe, label: MORE.LANGUAGE,
 sub: MORE.LANGUAGE_SUB,
 color: "ds-aurora-text", bg: "ds-aurora-bg",
 action: null, // custom render
 isLang: true,
 },
 ],
 },
 ...(isAdmin ? [{
 label: MORE.ADMIN_LABEL,
 items: [
 {
 Icon: Shield, label: MORE.USER_MGMT,
 sub: MORE.USER_MGMT_SUB,
 color: "ds-aurora-text", bg: "ds-aurora-bg",
 action: () => setSubPage("users"),
 },
 ],
 }] : []),
 {
 items: [
 {
 Icon: BookOpen, label: MORE.PANDUAN,
 sub: MORE.PANDUAN_SUB,
 color: "ds-aurora-text", bg: "ds-aurora-bg",
 action: () => setSubPage("guide"),
 },
 {
 Icon: Info, label: MORE.ABOUT,
 sub: MORE.ABOUT_SUB,
 color: "ds-t2", bg: "bg-gray-500/10",
 action: () => setSubPage("about"),
 },
 ],
 },
 ], [isAdmin, isExporting, handleExport, setSubPage]);

 return (
 <>
 {/* ── Main MORE content ── */}
 <motion.div
 key="more"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.15 }}
 className="pt-8 px-3 h-[100dvh] overflow-y-auto no-scrollbar w-full flex flex-col"
 >
 <div className="mb-6 flex-none">
 <h2 className="text-[26px] font-light tracking-[-1.5px] leading-none ds-t1">{MORE.TITLE}</h2>
 <div className="flex items-center gap-2 mt-1">
  <span className="ds-live-dot" />
  <p className="text-caption font-black tracking-[0.14em] uppercase ds-aurora-text">{activeWallet?.name}</p>
 </div>
 </div>

 {/* Menu groups */}
 <div className="space-y-2 flex-1 pb-32">
 {menuGroups.map((group, gi) => (
 <div key={gi}>
 {group.label && (
 <p className="text-label font-black ds-t3 uppercase tracking-[0.3em] mb-2 px-1">
 {group.label}
 </p>
 )}
 <div className="ds-bg-1 rounded-[24px] border ds-border shadow-sm overflow-hidden">
 {group.items.map((item, ii) => item.isLang ? (
 /* ── Bahasa toggle ── */
 <div
 key={ii}
 className={`w-full flex items-center gap-3 p-4 ${
 ii < group.items.length - 1 ? "border-b ds-border" : ""
 }`}
 >
 <div className={`w-10 h-10 rounded-2xl ${item.bg} flex items-center justify-center shrink-0`}>
 <item.Icon size={18} className={item.color} />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-light" style={{ color:"var(--text-1)" }}>{item.label}</p>
 <p className="text-caption ds-t3 mt-0.5">{item.sub}</p>
 </div>
 {/* Toggle pill ID / EN */}
 <div className="flex items-center ds-bg-3 rounded-xl p-1 gap-1 shrink-0">
 {["id", "en"].map(l => (
 <button
 key={l}
 onClick={() => setLang(l)}
 className={`px-3 py-1.5 rounded-lg text-caption font-black uppercase tracking-widest transition-all ${
 lang === l
 ? "ds-bg-1 ds-aurora-bg ds-aurora-text ds-t1 shadow-sm"
 : "ds-t3 hover:ds-t2"
 }`}
 >
 {l === "id" ? "ID" : "EN"}
 </button>
 ))}
 </div>
 </div>
 ) : (
 <button
 key={ii}
 onClick={item.action}
 disabled={item.loading}
 className={`w-full flex items-center gap-3 p-4 text-left hover:ds-bg-3 /40 transition-colors active:scale-[0.99] disabled:opacity-60 ${
 ii < group.items.length - 1 ? "border-b ds-border" : ""
 }`}
 >
 <div className={`w-10 h-10 rounded-2xl ${item.bg} flex items-center justify-center shrink-0`}>
 <item.Icon size={18} className={item.color} />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-light" style={{ color:"var(--text-1)" }}>{item.label}</p>
 <p className="text-caption ds-t3 mt-0.5">{item.loading ? (isID ? "Memproses..." : "Processing...") : item.sub}</p>
 </div>
 <ChevronRight size={16} className="ds-t3 shrink-0" />
 </button>
 )
 )}
 </div>
 </div>
 ))}
 </div>

 {/* ── Logout fixed bottom ── */}
 <div className="fixed bottom-[76px] left-0 right-0 max-w-lg mx-auto px-3 pt-2 pb-4 ds-bg-0 border-t ds-border">
 {/* By author */}
 <div className="flex items-center justify-center gap-1.5 py-3">
 <p className="text-label font-bold ds-t3">{MORE.BY_AUTHOR}</p>
 </div>

 <AnimatePresence mode="wait">
 {!confirmLogout ? (
 <motion.button
 key="logout-btn"
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 onClick={() => setConfirmLogout(true)}
 className="w-full flex items-center justify-center gap-2 py-3.5 border font-black text-xs uppercase tracking-widest rounded-2xl transition-all" style={{ background: "color-mix(in srgb, var(--a3) 8%, transparent)", borderColor: "color-mix(in srgb, var(--a3) 20%, transparent)", color: "var(--a3)" }}
 >
 <LogOut size={16} /> {MORE.LOGOUT}
 </motion.button>
 ) : (
 <motion.div
 key="logout-confirm"
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="flex gap-2"
 >
 <button
 onClick={() => setConfirmLogout(false)}
 className="flex-1 py-3.5 ds-bg-3ds-t1 font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
 >
 {FORM.CANCEL}
 </button>
 <button
 onClick={handleLogout}
 className="flex-1 py-3.5 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98]" style={{ background: "color-mix(in srgb, var(--a3) 80%, var(--a2))", boxShadow: "0 4px 20px color-mix(in srgb, var(--a3) 25%, transparent)" }}
 >
 {MORE.LOGOUT_YES}
 </button>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </motion.div>

 {/* ── Sub-pages ── */}
 <AnimatePresence mode="wait">
 {subPage === "guide" && (
 <GuideTab key="guide" onBack={() => setSubPage(null)} />
 )}
 {subPage === "about" && (
 <AboutPage key="about" onClose={() => setSubPage(null)} />
 )}
 {subPage === "users" && isAdmin && (
 <motion.div
 key="users"
 initial={{ opacity: 0, x: 40 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: 40 }}
 transition={{ type: "spring", stiffness: 400, damping: 35 }}
 className="fixed inset-0 z-[90] ds-bg-0 overflow-y-auto no-scrollbar"
 >
 <div className="w-full max-w-lg mx-auto pt-8 px-3 pb-32">
 <h2 className="text-xl font-black ds-t1 tracking-tight mb-6">
 {MORE.USER_MGMT}
 </h2>
 <UserManagement onNotify={onNotify} />
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 </>
 );
});

export default MoreTab;
