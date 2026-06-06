"use client";
import { memo, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Sun, Wallet, ArrowDownCircle, ArrowUpCircle,
  Edit3, Trash2, Eye, Loader2,
  Search, SlidersHorizontal, X, Camera, Image
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
          background: type === "income" ? "color-mix(in srgb, var(--income) 10%, transparent)" : "rgba(251, 113, 133, 0.1)", // Latar merah super tipis
          color: type === "income" ? "var(--income)" : "#fb7185", // Teks merah terang
          border: `1px solid ${type === "income" ? "color-mix(in srgb, var(--income) 20%, transparent)" : "rgba(251, 113, 133, 0.2)"}`, // Border menyala
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
  onEditTransaction, onDeleteTransaction, session,
}) {
  const [viewerUrl, setViewerUrl] = useState(null);
  const [viewerLabel, setViewerLabel] = useState("");
  const [photoMap, setPhotoMap] = useState({});
  const [viewerLoading, setViewerLoading] = useState(false);

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
        : "color-mix(in srgb, #fb7185 7%, transparent)" // Efek latar merah transparan
      : "var(--bg-3)",
    border: `1px solid ${isActive
      ? key === "income"
        ? "color-mix(in srgb, var(--income) 30%, transparent)"
        : "color-mix(in srgb, #fb7185 30%, transparent)" // Border merah menyala
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
        <div className="ds-card p-5 mb-4 ds-fade-1">
          <p className="text-[9px] font-black uppercase tracking-[0.28em] mb-2 ds-t3">{HOME.TOTAL_BALANCE}</p>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-[18px] font-light ds-t3">Rp</span>
            <span className="text-[44px] leading-none font-light ds-t1 tracking-[-3px] ff-mono">
              {balance.toLocaleString("id-ID")}
            </span>
          </div>

          {/* Aurora accent line */}
          <div className="h-px mb-4" style={{
            background: "linear-gradient(90deg, color-mix(in srgb, var(--a1) 40%, transparent), color-mix(in srgb, var(--a2) 30%, transparent), transparent)"
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
              { key: "expense", label: HOME.EXPENSE, val: filteredExpense, color: "#fb7185" }, // Warna teks nominal jadi merah ruby
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
                className="flex items-center justify-between px-4 py-3.5 rounded-[20px] mb-2 transition-colors"
                style={{
                  background: "rgba(255, 255, 255, 0.02)", // Efek kaca tipis (Glassmorphism base)
                  border: `1px solid ${trx._pending ? "color-mix(in srgb,#f59e0b 25%,transparent)" : "rgba(255, 255, 255, 0.05)"}`, // Border putih super redup
                  borderLeft: trx.type === "income"
                    ? `2px solid color-mix(in srgb, var(--income) 60%, transparent)`
                    : `2px solid color-mix(in srgb, #fb7185 60%, transparent)`, // Garis tepi Aurora (Hijau/Merah)
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {hasPhoto ? (
                    <button onClick={() => openViewer(photoUrl, trx.note)}
                      className="w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center active:scale-90 transition-all"
                      style={{ background: "color-mix(in srgb,#a855f7 10%,transparent)", border: "1px solid color-mix(in srgb,#a855f7 20%,transparent)", color: "#a855f7" }}>
                      {viewerLoading && viewerLabel === trx.note ? <Loader2 size={15} className="animate-spin" /> : <Eye size={16} />}
                    </button>
                  ) : (
                    <FotoInline trxId={trx.id} userId={session?.user?.id} category={trx.category} type={trx.type} onPhotoAdded={handlePhotoAdded} />
                  )}
                  <div className="min-w-0">
                    <p className="text-[14px] font-light truncate leading-snug" style={{ color: "rgba(255,255,255,0.92)", fontFamily: "var(--ff-sans)" }}>
                      {trx.note}
                      {trx._pending && <span className="ml-1.5 text-[8px] font-black rounded-full px-1.5 py-0.5 uppercase" style={{ color: "#f59e0b", background: "color-mix(in srgb,#f59e0b 10%,transparent)" }}>Menunggu</span>}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] font-black uppercase tracking-wider ds-t3 px-2 py-0.5 rounded-full"
                        style={{ background: "var(--bg-3)", border: "1px solid var(--border)" }}>
                        {trx.category}
                      </span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{formatDateTime(trx.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                  <p className="text-[14px] font-bold tracking-tight ff-mono" // Dibuat font-bold agar lebih menonjol
                    style={{
                      color: trx.type === "income" ? "var(--income)" : "#fb7185",
                      textShadow: trx.type === "income"
                        ? "0 0 12px color-mix(in srgb, var(--income) 40%, transparent)"
                        : "0 0 12px rgba(251, 113, 133, 0.4)" // Efek cahaya (Glow) Aurora
                    }}>
                    {trx.type === "income" ? "+" : "−"} Rp {Number(trx.amount).toLocaleString("id-ID")}
                  </p>
                  {!trx._pending && (
                    <div className="flex gap-1.5">
                      {[
                        [() => onEditTransaction(trx), <Edit3 size={12} />, "hover:text-blue-400"],
                        [() => onDeleteTransaction(trx), <Trash2 size={12} />, "hover:text-white/60"],
                      ].map(([onClick, icon, hoverCls], i) => (
                        <button key={i} onClick={onClick}
                          className={`w-7 h-7 rounded-xl flex items-center justify-center ds-t3 ${hoverCls} active:scale-90 transition-all`}
                          style={{ background: "var(--bg-3)", border: "1px solid var(--border)" }}>
                          {icon}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
