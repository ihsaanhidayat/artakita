"use client";
import { memo, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Sun, Wallet, ArrowDownCircle, ArrowUpCircle,
  Edit3, Trash2, Eye, Loader2,
  Search, SlidersHorizontal, X, Camera, Image, Calendar,
} from "lucide-react";
import PhotoViewer from "@/components/PhotoViewer";
import BudgetAlert from "@/components/BudgetAlert";
import { formatDateTime } from "@/lib/utils";
import { HOME } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient";

const signedUrlCache = {};
async function getSignedUrl(path) {
  if (!path) return null;
  if (signedUrlCache[path]?.exp > Date.now()) return signedUrlCache[path].url;
  try {
    const sp = path.includes('/object/')
      ? path.split('/object/').pop().replace(/^(sign|public)\/artakita_bucket\//, '')
      : path;
    const { data, error } = await supabase.storage.from('artakita_bucket').createSignedUrl(sp, 3600);
    if (error || !data?.signedUrl) return null;
    signedUrlCache[path] = { url: data.signedUrl, exp: Date.now() + 3500000 };
    return data.signedUrl;
  } catch { return null; }
}

const Skeleton = () => (
  <div className="flex items-center gap-3 p-4 mb-2 ds-card-sm animate-pulse">
    <div className="w-11 h-11 rounded-2xl ds-bg-3 shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-32 ds-bg-3 rounded-full" />
      <div className="h-2 w-20 ds-bg-3 rounded-full" />
    </div>
    <div className="h-4 w-20 ds-bg-3 rounded-full" />
  </div>
);

const FilterBar = memo(function FilterBar({ searchQuery, setSearchQuery, dateRange, setDateRange, totalCount, filteredCount }) {
  const [open, setOpen] = useState(false);
  const active = [searchQuery.length > 0, !!(dateRange.from || dateRange.to)].filter(Boolean).length;

  const clearAll = useCallback(() => {
    setSearchQuery(""); setDateRange({ from: "", to: "" });
  }, [setSearchQuery, setDateRange]);

  const fmt = (d) => {
    if (!d) return "—";
    const [, m, day] = d.split("-");
    return `${parseInt(day)} ${["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][parseInt(m) - 1]}`;
  };

  return (
    <div className="mb-3">
      {/* Single inline row — label | [inputs expand here] | toggle */}
      <div className="flex items-center gap-2 h-9">

        {/* Left: label + count — shrink saat filter buka */}
        <div className={`flex items-center gap-1.5 shrink-0 transition-all duration-200 ${open ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] ds-t3 whitespace-nowrap">{HOME.ACTIVITY_LOG}</span>
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text-3)" }}>
            {totalCount && totalCount > filteredCount ? `${filteredCount} / ${totalCount}` : filteredCount}
          </span>
        </div>

        {/* Middle: filter inputs — expand inline */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto", flex: 1 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              className="flex items-center overflow-hidden min-w-0"
              style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 12, height: 36 }}
            >
              {/* Search */}
              <div className="flex items-center gap-1.5 min-w-0 px-2.5" style={{ flex: 2 }}>
                <Search size={12} className="ds-t3 shrink-0" />
                <input type="text" placeholder="Cari..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)} autoFocus
                  className="min-w-0 w-full bg-transparent outline-none text-[12px] ds-t1"
                  style={{ fontFamily: "var(--ff-sans)" }} />
                {searchQuery && <button onClick={() => setSearchQuery("")} className="shrink-0 ds-t3"><X size={10} /></button>}
              </div>
              <div className="w-px h-4 shrink-0" style={{ background: "var(--border)" }} />
              {/* Dari */}
              <label className="flex items-center gap-1 shrink-0 px-2.5 cursor-pointer" style={{ flex: 1 }}>
                <span className="text-[9px] font-black uppercase tracking-wide ds-t3 shrink-0">Dari</span>
                <span className={`text-[11px] font-black ff-mono ${dateRange.from ? "ds-t1" : "ds-t4"}`}>{fmt(dateRange.from)}</span>
                {dateRange.from && <span onClick={e => { e.preventDefault(); setDateRange(p => ({ ...p, from: "" })) }} className="ds-t3"><X size={8} /></span>}
                <input type="date" value={dateRange.from ?? ""} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))} className="sr-only" />
              </label>
              <div className="w-px h-4 shrink-0" style={{ background: "var(--border)" }} />
              {/* Sampai */}
              <label className="flex items-center gap-1 shrink-0 px-2.5 cursor-pointer" style={{ flex: 1 }}>
                <span className="text-[9px] font-black uppercase tracking-wide ds-t3 shrink-0">Sampai</span>
                <span className={`text-[11px] font-black ff-mono ${dateRange.to ? "ds-t1" : "ds-t4"}`}>{fmt(dateRange.to)}</span>
                {dateRange.to && <span onClick={e => { e.preventDefault(); setDateRange(p => ({ ...p, to: "" })) }} className="ds-t3"><X size={8} /></span>}
                <input type="date" value={dateRange.to ?? ""} min={dateRange.from} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))} className="sr-only" />
              </label>
              {active > 0 && (
                <><div className="w-px h-4 shrink-0" style={{ background: "var(--border)" }} />
                  <button onClick={clearAll} className="px-2.5 ds-t3 shrink-0"><X size={12} /></button></>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right: toggle button */}
        <button
          onClick={() => setOpen(p => !p)}
          className="flex items-center gap-1.5 px-2.5 shrink-0 rounded-full border text-[10px] font-black uppercase tracking-wide transition-all active:scale-95 ml-auto"
          style={{
            height: 32,
            borderColor: open ? "color-mix(in srgb,var(--a2) 40%,transparent)" : active > 0 ? "color-mix(in srgb,var(--a1) 35%,transparent)" : "var(--border)",
            color: open ? "var(--a2)" : active > 0 ? "var(--a1)" : "var(--text-3)",
            background: open ? "color-mix(in srgb,var(--a2) 8%,transparent)" : active > 0 ? "color-mix(in srgb,var(--a1) 6%,transparent)" : "transparent",
          }}
        >
          <SlidersHorizontal size={11} />
          {open ? "Tutup" : "Filter"}
          {active > 0 && (
            <span className="w-4 h-4 rounded-full text-[8px] font-black text-black flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,var(--a1),var(--a2))" }}>
              {active}
            </span>
          )}
        </button>
      </div>
    </div>
  );
});

const FotoInline = memo(function FotoInline({ trxId, userId, category, type, onPhotoAdded }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null); const camRef = useRef(null); const galRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setIsOpen(false); setIsUploading(true);
    try {
      const { uploadPhoto: up } = await import("@/lib/imageUtils");
      const url = await up(file, `receipts/${userId}/${trxId}.jpg`, supabase);
      await supabase.from("transactions").update({ receipt_url: url }).eq("id", trxId);
      onPhotoAdded?.(trxId, url);
    } catch { } finally { setIsUploading(false); }
  }, [trxId, userId, onPhotoAdded]);

  const handleOpen = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.top - 8, left: r.left });
    setIsOpen(p => !p);
  }, []);

  const initials = (category || "?").slice(0, 2).toUpperCase();

  return (
    <div className="relative shrink-0">
      <button ref={btnRef} onClick={handleOpen} disabled={isUploading}
        className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-[11px] transition-all active:scale-90"
        style={{
          background: type === "income" ? "color-mix(in srgb, var(--income) 10%, transparent)" : "color-mix(in srgb, var(--a3) 10%, transparent)",
          color: type === "income" ? "var(--income)" : "var(--a3)",
          border: `1px solid ${type === "income" ? "color-mix(in srgb, var(--income) 20%, transparent)" : "color-mix(in srgb, var(--a3) 20%, transparent)"}`,
        }}>
        {isUploading ? <Loader2 size={14} className="animate-spin" /> : initials}
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[50]" onClick={() => setIsOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.1 }}
              style={{ position: "fixed", top: pos.top, left: pos.left, transform: "translateY(-100%)", zIndex: 51 }}
              className="flex flex-col gap-1">
              {[["Kamera", Camera, () => camRef.current?.click()], ["Galeri", Image, () => galRef.current?.click()]].map(([label, Icon, onClick]) => (
                <button key={label} onClick={() => { setIsOpen(false); onClick(); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest whitespace-nowrap rounded-xl"
                  style={{ background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}>
                  <Icon size={11} /> {label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ""; }} className="hidden" />
      <input ref={galRef} type="file" accept="image/*" onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ""; }} className="hidden" />
    </div>
  );
});

const HomeTabComponent = memo(function HomeTab({
  isDarkMode, setIsDarkMode,
  activeWallet, onOpenWalletModal,
  balance, filteredIncome, filteredExpense,
  typeFilter, setTypeFilter,
  searchQuery, setSearchQuery,
  categoryFilter, setCategoryFilter,
  dynamicCategories,
  dateRange, setDateRange,
  filteredTransactions, transactions,
  mounted, allBudgets, transactionsThisMonth,
  hasMore, loadMore, isLoading, totalCount,
  isOnline, pendingCount, isSyncing,
  onEditTransaction, onSaveTransaction, onDeleteTransaction, session,
}) {
  const [viewerUrl, setViewerUrl] = useState(null);
  const [viewerLabel, setViewerLabel] = useState("");
  const [photoMap, setPhotoMap] = useState({});
  const [viewerLoading, setViewerLoading] = useState(false);
  const [inlineDeleteId, setInlineDeleteId] = useState(null);

  // --- STATE BARU UNTUK INLINE EDIT ---
  const [inlineEditId, setInlineEditId] = useState(null);
  const [editData, setEditData] = useState({ note: "", amount: "", category: "" });

  const [customCatMode, setCustomCatMode] = useState(false);

  const handlePhotoAdded = useCallback((id, url) => setPhotoMap(p => ({ ...p, [id]: url })), []);
  const openViewer = useCallback(async (raw, label) => {
    setViewerLabel(label); setViewerLoading(true); setViewerUrl("loading");
    setViewerUrl(await getSignedUrl(raw) || null);
    setViewerLoading(false);
  }, []);

  const btnStyle = (isActive, key) => ({
    background: isActive
      ? key === "income"
        ? "color-mix(in srgb, var(--income) 7%, transparent)"
        : "color-mix(in srgb, var(--a3) 7%, transparent)"
      : "var(--bg-3)",
    border: `1px solid ${isActive
      ? key === "income"
        ? "color-mix(in srgb, var(--income) 30%, transparent)"
        : "color-mix(in srgb, var(--a3) 30%, transparent)"
      : "var(--border)"}`,
    borderRadius: 18,
    transition: "all 0.2s",
  });

  return (
    <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
      className="pt-10 px-4 h-[100dvh] w-full flex flex-col overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex-none">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h1 className="text-[26px] font-light tracking-[-1.5px] leading-none ds-t1" style={{ fontFamily: "var(--ff-sans)" }}>
              ArtaKita.
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="ds-live-dot" />
              <p className="text-[10px] font-black tracking-[0.14em] uppercase ds-aurora-text">
                {activeWallet?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[
              [() => setIsDarkMode(!isDarkMode), isDarkMode ? <Sun size={16} /> : <Moon size={16} />],
              [onOpenWalletModal, <Wallet size={16} />],
            ].map(([onClick, icon], i) => (
              <button key={i} onClick={onClick}
                className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-90"
                style={{ background: "var(--bg-1)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* ── Balance Card ────────────────────────────────────────────── */}
        <div className="ds-aurora-card ds-aurora-glow-card p-5 mb-4">
          <p className="text-[9px] font-black uppercase tracking-[0.28em] mb-2 ds-t3">{HOME.TOTAL_BALANCE}</p>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-[18px] font-light ds-t3">Rp</span>
            <span className="text-[44px] leading-none font-light ds-t1 tracking-[-3px] ff-mono">
              {balance.toLocaleString("id-ID")}
            </span>
          </div>

          {/* Aurora accent line — 3-warna */}
          <div className="h-px mb-4" style={{
            background: "linear-gradient(90deg, color-mix(in srgb, var(--a1) 55%, transparent), color-mix(in srgb, var(--a3) 40%, transparent), color-mix(in srgb, var(--a2) 40%, transparent), transparent)"
          }} />

          <BudgetAlert budgets={allBudgets} transactions={transactionsThisMonth} />

          {(!isOnline || pendingCount > 0) && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold mt-2"
              style={{
                background: !isOnline ? "color-mix(in srgb,#f59e0b 8%,transparent)" : "color-mix(in srgb,#3b82f6 8%,transparent)",
                border: `1px solid ${!isOnline ? "color-mix(in srgb,#f59e0b 25%,transparent)" : "color-mix(in srgb,#3b82f6 25%,transparent)"}`,
                color: !isOnline ? "#f59e0b" : "#3b82f6"
              }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: !isOnline ? "#f59e0b" : "#3b82f6" }} />
              <span>{!isOnline ? HOME.OFFLINE_MSG : isSyncing ? HOME.SYNCING_MSG(pendingCount) : HOME.PENDING_MSG(pendingCount)}</span>
            </div>
          )}

          <div className="h-px my-4" style={{ background: "var(--border)" }} />

          <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-3 ds-t3">{HOME.CIRCULATION}</p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { key: "income", label: HOME.INCOME, val: filteredIncome, color: "var(--income)" },
              { key: "expense", label: HOME.EXPENSE, val: filteredExpense, color: "var(--a3)" },
            ].map(({ key, label, val, color }) => (
              <button key={key} onClick={() => setTypeFilter(typeFilter === key ? "all" : key)}
                style={btnStyle(typeFilter === key, key)}
                className="p-3.5 text-left transition-all active:scale-95">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  <span className="text-[9px] font-black uppercase tracking-wider ds-t3">{label}</span>
                </div>
                <p className="text-[15px] font-light ff-mono tracking-tight" style={{ color }}>{val.toLocaleString("id-ID")}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Filter ──────────────────────────────────────────────────── */}
        <FilterBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} dateRange={dateRange} setDateRange={setDateRange} totalCount={totalCount} filteredCount={filteredTransactions.length} />

      </div>

      {/* ── Transaction list ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 min-h-0">
        <AnimatePresence mode="popLayout">
          {transactions.length === 0 && !mounted ? (
            <motion.div key="sk" exit={{ opacity: 0 }}><Skeleton /><Skeleton /><Skeleton /></motion.div>
          ) : filteredTransactions.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-16 text-center rounded-[24px]"
              style={{ border: "1px dashed var(--border)" }}>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] ds-t4">{HOME.EMPTY}</p>
            </motion.div>
          ) : filteredTransactions.map(trx => {
            const hasPhoto = !!(trx.receipt_url || photoMap[trx.id]);
            const photoUrl = photoMap[trx.id] || trx.receipt_url;
            return (
              <motion.div key={trx.id} layout
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.15 }}
                className="relative overflow-hidden px-4 py-3 rounded-[20px] mb-2 transition-colors"
                style={{
                  background: trx.type === "income"
                    ? "color-mix(in srgb, var(--a1) 4%, rgba(255,255,255,0.02))"
                    : "color-mix(in srgb, var(--a3) 4%, rgba(255,255,255,0.02))",
                  border: `1px solid ${trx._pending ? "color-mix(in srgb,#f59e0b 25%,transparent)" : "rgba(255,255,255,0.05)"}`,
                }}
              >

                {/* Aurora left gradient bar */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[20px]" style={{
                  background: trx.type === "income"
                    ? "linear-gradient(to bottom, var(--a1), var(--a2))"
                    : "linear-gradient(to bottom, var(--a3), var(--a2))",
                  boxShadow: trx.type === "income"
                    ? "4px 0 18px color-mix(in srgb, var(--a1) 40%, transparent)"
                    : "4px 0 18px color-mix(in srgb, var(--a3) 40%, transparent)",
                }} />

                {/* ── BUNGKUS DENGAN ANIMATE PRESENCE UNTUK EFEK MORPHING (EDIT vs NORMAL) ── */}
                <AnimatePresence mode="wait">
                  {inlineEditId === trx.id ? (

                    /* ==========================================
                       MODE EDIT: SUPER COMPACT GLASS FORM 
                       ========================================== */
                    <motion.div
                      key="edit-mode"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="w-full flex flex-col gap-2 py-1"
                    >
                      {/* BARIS 1: NAMA ITEM | NOMINAL CERDAS */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editData.note}
                          onChange={e => setEditData({ ...editData, note: e.target.value })}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] font-bold text-white outline-none focus:border-[var(--a1)] transition-all placeholder-white/30"
                          placeholder="Nama Item..."
                        />
                        <div className="relative w-[110px] shrink-0">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/40">Rp</span>
                          <input
                            type="text" // Menggunakan text agar bisa menampung huruf 'k' atau 'jt'
                            value={editData.amount}
                            onChange={e => setEditData({ ...editData, amount: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-7 pr-3 py-2 text-[12px] font-bold text-white outline-none focus:border-[var(--a1)] transition-all ff-mono"
                            placeholder="30k / 3jt"
                          />
                        </div>
                      </div>

                      {/* BARIS 2: DATE ICON | KATEGORI AKTIF | 2 SUGGESTION CHIPS + POS | BATAL & SIMPAN */}
                      <div className="flex items-center gap-1.5">

                        {/* 1. Date Icon Picker */}
                        <div className="relative w-8 h-8 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                          <Calendar size={13} />
                          <input
                            type="date"
                            value={editData.date}
                            onChange={e => setEditData({ ...editData, date: e.target.value })}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                          />
                          {/* Titik indikator biru jika tanggalnya diganti dari aslinya */}
                          {editData.date !== (trx.created_at?.slice(0, 10) || "") && (
                            <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full" style={{ background: "var(--a1)", boxShadow: "0 0 5px var(--a1)" }} />
                          )}
                        </div>

                        {/* 2. Kategori Aktif (Bisa Diketik Manual) */}
                        <input
                          id={`cat-input-${trx.id}`}
                          type="text"
                          value={editData.category}
                          onChange={e => setEditData({ ...editData, category: e.target.value.toUpperCase() })}
                          className="w-[65px] shrink-0 rounded-xl px-2 py-1.5 text-[9px] font-black uppercase tracking-widest outline-none focus:border-[var(--a2)] transition-all text-center border"
                          style={{ background: "color-mix(in srgb, var(--a2) 12%, transparent)", borderColor: "color-mix(in srgb, var(--a2) 28%, transparent)", color: "var(--a2)" }}
                          placeholder="POS"
                        />

                        {/* 3. Dua Suggestion Chips & Tombol + POS */}
                        <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar mask-fade-right pr-2">
                          {(dynamicCategories || ["JAJAN", "MAKAN", "BENSIN"])
                            .filter(c => c !== editData.category) // Sembunyikan jika sedang aktif
                            .slice(0, 2) // Ambil 2 teratas saja
                            .map(cat => (
                              <button
                                key={cat}
                                onClick={() => setEditData({ ...editData, category: cat })}
                                className="px-2.5 py-1.5 shrink-0 rounded-xl bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest transition-colors"
                              >
                                {cat}
                              </button>
                            ))}

                          {/* Tombol + POS (Lainnya) */}
                          <button
                            onClick={() => {
                              setEditData({ ...editData, category: "" }); // Kosongkan input
                              // Trik agar langsung fokus ke input kategori
                              setTimeout(() => document.getElementById(`cat-input-${trx.id}`)?.focus(), 50);
                            }}
                            className="px-2.5 py-1.5 shrink-0 rounded-xl bg-white/5 text-white/40 border border-dashed border-white/20 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest transition-colors"
                          >
                            + POS
                          </button>
                        </div>

                        {/* 4. Aksi Batal & Simpan */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { setInlineEditId(null); setCustomCatMode?.(false); }}
                            className="px-2.5 py-1.5 rounded-xl bg-white/5 text-white/50 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest transition-colors"
                          >
                            Batal
                          </button>
                          <button
                            onClick={() => {
                              let finalAmount = editData.amount;
                              if (typeof finalAmount === 'string') {
                                let str = finalAmount.toLowerCase().trim();
                                if (str.endsWith('k')) finalAmount = parseFloat(str) * 1000;
                                else if (str.endsWith('jt') || str.endsWith('m')) finalAmount = parseFloat(str) * 1000000;
                                else finalAmount = parseFloat(str.replace(/[^0-9.-]+/g, "")) || 0;
                              }
                              let newCreatedAt = trx.created_at;
                              if (editData.date) {
                                const orig = trx.created_at ? new Date(trx.created_at) : new Date();
                                const [y, m, d] = editData.date.split("-").map(Number);
                                orig.setFullYear(y, m - 1, d);
                                newCreatedAt = orig.toISOString();
                              }
                              onSaveTransaction({
                                ...trx,
                                note: editData.note,
                                amount: finalAmount,
                                category: editData.category,
                                created_at: newCreatedAt,
                              });
                              setInlineEditId(null);
                            }}
                            className="px-3 py-1.5 rounded-xl text-white text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                            style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))" }}
                          >
                            Simpan
                          </button>
                        </div>

                      </div>
                    </motion.div>

                  ) : (

                    /* ==========================================
                       2. MODE NORMAL: AURORA CARD LAYOUT
                       ========================================== */
                    <motion.div
                      key="normal-mode"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col w-full gap-1.5 pl-1"
                    >
                      {/* Baris 1: Icon | Note + Category | Amount */}
                      <div className="flex items-center gap-3">
                        {hasPhoto ? (
                          <button onClick={() => openViewer(photoUrl, trx.note)}
                            className="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center active:scale-90 transition-all"
                            style={{ background: "color-mix(in srgb, var(--a2) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--a2) 20%, transparent)", color: "var(--a2)" }}>
                            {viewerLoading && viewerLabel === trx.note ? <Loader2 size={14} className="animate-spin" /> : <Eye size={15} />}
                          </button>
                        ) : (
                          <FotoInline trxId={trx.id} userId={session?.user?.id} category={trx.category} type={trx.type} onPhotoAdded={handlePhotoAdded} />
                        )}

                        {/* Note + Category */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-[13px] font-medium truncate leading-snug ds-t1" style={{ fontFamily: "var(--ff-sans)" }}>
                              {trx.note}
                            </p>
                            {trx._pending && (
                              <span className="text-[8px] font-black rounded-full px-1.5 py-0.5 uppercase shrink-0" style={{ color: "#f59e0b", background: "color-mix(in srgb,#f59e0b 10%,transparent)" }}>Menunggu</span>
                            )}
                          </div>
                          {(() => {
                            const colors = [
                              { c: "#38bdf8", bg: "rgba(56,189,248,0.08)" },
                              { c: "#a78bfa", bg: "rgba(167,139,250,0.08)" },
                              { c: "#fbbf24", bg: "rgba(251,191,36,0.08)" },
                              { c: "#34d399", bg: "rgba(52,211,153,0.08)" },
                              { c: "#f0abfc", bg: "rgba(240,171,252,0.08)" },
                            ];
                            const theme = colors[(trx.category?.charCodeAt(0) || 0) % colors.length];
                            return (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 inline-block"
                                style={{
                                  background: theme.bg,
                                  border: `1px solid color-mix(in srgb, ${theme.c} 22%, transparent)`,
                                  color: theme.c,
                                  textShadow: `0 0 8px color-mix(in srgb, ${theme.c} 35%, transparent)`,
                                }}>
                                {trx.category}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Amount — prominent + glow */}
                        <p className={`ff-mono ${trx.type === "income" ? "ds-income-glow" : "ds-expense-glow"}`}
                          style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--ff-mono)", letterSpacing: "-0.5px", flexShrink: 0 }}>
                          {trx.type === "income" ? "+" : "−"} Rp {Number(trx.amount).toLocaleString("id-ID")}
                        </p>
                      </div>

                      {/* Baris 2: Timestamp kiri | Action buttons kanan */}
                      <div className="flex items-center justify-between pl-[52px]">
                        <span style={{ fontSize: 10, color: "var(--text-3)" }}>
                          {formatDateTime(trx.created_at)}
                        </span>
                        {!trx._pending && (
                          <div className="flex gap-1.5">
                            {[
                              [() => {
                                setInlineEditId(trx.id);
                                setEditData({
                                  note: trx.note,
                                  amount: trx.amount,
                                  category: trx.category,
                                  date: trx.created_at ? trx.created_at.slice(0, 10) : ""
                                });
                                setInlineDeleteId(null);
                                setCustomCatMode(false);
                              }, <Edit3 size={11} />, "hover:text-[var(--a1)]"],
                              [() => {
                                setInlineDeleteId(trx.id);
                                setInlineEditId(null);
                              }, <Trash2 size={11} />, "hover:text-fuchsia-400"],
                            ].map(([onClick, icon, hoverCls], i) => (
                              <button key={i} onClick={onClick}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center ds-t3 ${hoverCls} active:scale-90 transition-all`}
                                style={{ background: "var(--bg-3)", border: "1px solid var(--border)" }}>
                                {icon}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>

                  )}
                </AnimatePresence>

                {/* ==========================================
                   3. MODE HAPUS: SLIDING OVERLAY MERAH
                   ========================================== */}
                <AnimatePresence>
                  {inlineDeleteId === trx.id && (
                    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 280 }}
                      className="absolute inset-0 z-20 flex items-center justify-between px-5 backdrop-blur-md"
                      style={{
                        background: "color-mix(in srgb, var(--a3) 85%, var(--a2))",
                        borderLeft: "3px solid var(--a3)",
                        boxShadow: "inset 4px 0 20px color-mix(in srgb, var(--a3) 30%, transparent)",
                      }}>
                      <div className="flex items-center gap-2">
                        <Trash2 size={15} className="text-white" />
                        <span className="text-[11px] font-black text-white uppercase tracking-widest">Hapus Permanen?</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setInlineDeleteId(null)} className="px-3 py-1.5 rounded-[10px] bg-white/20 text-white text-[9px] font-black uppercase tracking-widest hover:bg-white/30 transition-colors">
                          Batal
                        </button>
                        <button onClick={() => { onDeleteTransaction(trx); setInlineDeleteId(null); }}
                          className="px-3 py-1.5 rounded-[10px] text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                          style={{ background: "rgba(255,255,255,0.9)", color: "var(--a2)", boxShadow: "0 0 15px color-mix(in srgb, var(--a3) 40%, transparent)" }}>
                          Hapus
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            );
          })}
        </AnimatePresence>

        {hasMore && (
          <div className="flex justify-center pt-2 pb-4">
            <button onClick={loadMore} disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 font-black text-[9px] uppercase tracking-widest rounded-2xl transition-all disabled:opacity-40 active:scale-95 ds-t3"
              style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}>
              {isLoading && <Loader2 size={12} className="animate-spin" />}
              {isLoading ? HOME.LOADING : totalCount ? `Muat ${Math.min(15, totalCount - filteredTransactions.length)} lagi` : HOME.LOAD_MORE}
            </button>
          </div>
        )}
      </div>

      <PhotoViewer url={viewerUrl} isOpen={!!viewerUrl} onClose={() => { setViewerUrl(null); setViewerLabel(""); }} label={viewerLabel} />
    </motion.div>
  );
});

export default HomeTabComponent;
