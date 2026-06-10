"use client";
import { memo, useState, useCallback, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import GuideTab from "@/components/tabs/GuideTab";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, Info, LogOut,
  ChevronRight, Shield,
  Globe, BookOpen,
} from "lucide-react";
import { MORE, ABOUT, APP_NAME, APP_TAGLINE, FORM } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient";
import UserManagement from "@/components/UserManagement";
import type { ActiveWallet, Transaction } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type SubPageKey = "guide" | "about" | "users" | null;

interface MoreTabProps {
  isAdmin: boolean;
  activeWallet: ActiveWallet | null;
  transactions: Transaction[];
  handleLogout: () => void;
  onNotify?: (msg: string, type?: "success" | "error") => void;
  onOpenAddUser?: () => void;
}

interface MenuItemBase {
  Icon: React.ElementType;
  label: string;
  sub: string;
  color: string;
  bg: string;
  loading?: boolean;
}
interface ActionItem extends MenuItemBase { isLang?: false; action: (() => void) | (() => Promise<void>); }
interface LangItem extends MenuItemBase { isLang: true; action: null; }
type MenuItem = ActionItem | LangItem;
interface MenuGroup { label?: string; items: MenuItem[]; }

// ── About Page ────────────────────────────────────────────────────────────────

const AboutPage = memo(function AboutPage({ onClose }: { onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="fixed inset-0 z-[90] ds-bg-0 overflow-y-auto no-scrollbar">
      <div className="w-full max-w-lg mx-auto pt-8 px-4 pb-32">
        <div className="flex items-center justify-between mb-6">
          <span className="text-caption font-black ds-t3 uppercase tracking-widest">{MORE.ABOUT as string}</span>
          <button onClick={onClose} className="flex items-center gap-1.5 ds-aurora-text hover:ds-aurora-text active:scale-95 transition-all ds-aurora-bg border ds-aurora-border-c px-3 py-1.5 rounded-xl">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            <span className="text-label font-black uppercase tracking-widest">{MORE.TITLE as string}</span>
          </button>
        </div>

        <div className="ds-aurora-card ds-aurora-glow-card rounded-[32px] p-8 mb-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 rounded-[32px]" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--a1) 15%, transparent), color-mix(in srgb, var(--a2) 20%, transparent))" }} />
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl" style={{ background: "color-mix(in srgb, var(--a2) 20%, transparent)" }} />
          <div className="relative z-10">
            <h3 className="text-3xl font-black tracking-tight mb-1 ds-aurora-text">{APP_NAME as string}.</h3>
            <p className="text-caption font-bold uppercase tracking-widest mb-3 ds-t3">{APP_TAGLINE as string}</p>
            <span className="px-3 py-1 rounded-full text-caption font-black uppercase tracking-widest ds-aurora-bg border ds-aurora-border-c ds-t2">{ABOUT.VERSION as string}</span>
          </div>
        </div>

        <div className="ds-bg-1 rounded-[24px] p-5 border ds-border mb-4 shadow-sm">
          <p className="text-sm ds-t2 leading-relaxed">{ABOUT.DESC as string}</p>
        </div>

        <div className="ds-bg-1 rounded-[24px] p-5 border ds-border mb-6 shadow-sm">
          <p className="text-label font-black ds-t3 uppercase tracking-widest mb-3">{ABOUT.FEATURES as string}</p>
          <div className="space-y-2">
            {(ABOUT.FEATURE_LIST as string[]).map((f, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: i % 2 === 0 ? "var(--a1)" : "var(--a2)" }} />
                <p className="text-sm ds-t1 font-bold">{f}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-4">
          <p className="text-caption font-bold ds-t3">{ABOUT.TECH as string}</p>
        </div>
        <p className="text-center text-label ds-t3 mt-1">{MORE.BY_AUTHOR as string}</p>
      </div>
    </motion.div>
  );
});

// ── Main MoreTab ──────────────────────────────────────────────────────────────

const MoreTab = memo(function MoreTab({
  isAdmin, activeWallet, transactions, handleLogout, onNotify,
}: MoreTabProps) {
  const [subPage, setSubPage] = useState<SubPageKey>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { lang, setLang, isID } = useLanguage();

  const handleExport = useCallback(async (): Promise<void> => {
    if (!transactions?.length) {
      onNotify?.("Tidak ada data untuk diekspor.", "error");
      return;
    }
    setIsExporting(true);
    try {
      const XLSX = (await import("xlsx")).default;
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

      const trxRows = transactions.map(t => ({
        "Tanggal": new Date(t.created_at).toLocaleDateString("id-ID"),
        "Waktu": new Date(t.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        "Catatan": t.note,
        "Kategori": t.category,
        "Jenis": t.type === "income" ? "Pemasukan" : "Pengeluaran",
        "Nominal": Number(t.amount),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trxRows), "Transaksi");

      const debtRows = (debts ?? []).map((d: Record<string, unknown>) => ({
        "Nama": d["person_name"],
        "Jenis": d["type"] === "debt" ? "Hutang" : "Piutang",
        "Nominal Awal": Number(d["initial_amount"]),
        "Sisa": Number(d["amount"]),
        "Status": d["status"] === "paid" ? "Lunas" : "Belum Lunas",
        "Jatuh Tempo": d["due_date"] ?? "-",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(debtRows), "Hutang Piutang");

      const assetRows = (assets ?? []).map((a: Record<string, unknown>) => ({
        "Nama Barang": a["name"],
        "Toko": a["store_name"] ?? "-",
        "Tgl Beli": a["purchase_date"] ?? "-",
        "Harga Beli": Number(a["price"]),
        "Kondisi": a["condition"],
        "Catatan": a["notes"] ?? "-",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(assetRows), "Aset");

      const recurRows = (recurring ?? []).map((r: Record<string, unknown>) => ({
        "Catatan": r["note"],
        "Nominal": Number(r["amount"]),
        "Kategori": r["category"],
        "Jenis": r["type"] === "income" ? "Pemasukan" : "Pengeluaran",
        "Frekuensi": r["frequency"] === "monthly" ? "Bulanan" : r["frequency"] === "weekly" ? "Mingguan" : "Harian",
        "Jadwal": r["next_run_date"],
        "Status": r["is_active"] ? "Aktif" : "Nonaktif",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recurRows), "Transaksi Rutin");

      const goalRows = (goalsData ?? []).map((g: Record<string, unknown>) => ({
        "Nama Target": g["name"],
        "Target": Number(g["target_amount"]),
        "Terkumpul": Number(g["current_amount"]),
        "Progress %": `${Math.min(100, ((Number(g["current_amount"]) / Number(g["target_amount"])) * 100)).toFixed(1)}%`,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(goalRows), "Target Impian");

      const date = new Date().toLocaleDateString("id-ID").replace(/\//g, "-");
      XLSX.writeFile(wb, `Laporan_ArtaKita_${date}.xlsx`);
      onNotify?.("Laporan berhasil diunduh!", "success");
    } catch (err) {
      onNotify?.("Gagal membuat laporan: " + (err as Error).message, "error");
    } finally {
      setIsExporting(false);
    }
  }, [transactions, activeWallet, onNotify]);

  const menuGroups = useMemo((): MenuGroup[] => [
    {
      items: [
        { Icon: Download, label: MORE.EXPORT as string, sub: MORE.EXPORT_SUB as string, color: "ds-aurora-text", bg: "ds-aurora-bg", action: handleExport, loading: isExporting } as ActionItem,
        { Icon: Globe, label: MORE.LANGUAGE as string, sub: MORE.LANGUAGE_SUB as string, color: "ds-aurora-text", bg: "ds-aurora-bg", action: null, isLang: true } as LangItem,
      ],
    },
    ...(isAdmin ? [{
      label: MORE.ADMIN_LABEL as string,
      items: [
        { Icon: Shield, label: MORE.USER_MGMT as string, sub: MORE.USER_MGMT_SUB as string, color: "ds-aurora-text", bg: "ds-aurora-bg", action: () => setSubPage("users") } as ActionItem,
      ],
    }] : []),
    {
      items: [
        { Icon: BookOpen, label: MORE.PANDUAN as string, sub: MORE.PANDUAN_SUB as string, color: "ds-aurora-text", bg: "ds-aurora-bg", action: () => setSubPage("guide") } as ActionItem,
        { Icon: Info, label: MORE.ABOUT as string, sub: MORE.ABOUT_SUB as string, color: "ds-t2", bg: "bg-gray-500/10", action: () => setSubPage("about") } as ActionItem,
      ],
    },
  ], [isAdmin, isExporting, handleExport]);

  return (
    <>
      <motion.div key="more" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
        className="pt-8 px-3 h-[100dvh] overflow-y-auto no-scrollbar w-full flex flex-col">
        <div className="mb-6 flex-none">
          <h2 className="text-[26px] font-light tracking-[-1.5px] leading-none ds-t1">{MORE.TITLE as string}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="ds-live-dot" />
            <p className="text-caption font-black tracking-[0.14em] uppercase ds-aurora-text">{activeWallet?.name}</p>
          </div>
        </div>

        <div className="space-y-2 flex-1 pb-32">
          {menuGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && <p className="text-label font-black ds-t3 uppercase tracking-[0.3em] mb-2 px-1">{group.label}</p>}
              <div className="ds-bg-1 rounded-[24px] border ds-border shadow-sm overflow-hidden">
                {group.items.map((item, ii) => item.isLang ? (
                  <div key={ii} className={`w-full flex items-center gap-3 p-4 ${ii < group.items.length - 1 ? "border-b ds-border" : ""}`}>
                    <div className={`w-10 h-10 rounded-2xl ${item.bg} flex items-center justify-center shrink-0`}>
                      <item.Icon size={18} className={item.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light" style={{ color: "var(--text-1)" }}>{item.label}</p>
                      <p className="text-caption ds-t3 mt-0.5">{item.sub}</p>
                    </div>
                    <div className="flex items-center ds-bg-3 rounded-xl p-1 gap-1 shrink-0">
                      {(["id", "en"] as const).map(l => (
                        <button key={l} onClick={() => setLang(l)}
                          className={`px-3 py-1.5 rounded-lg text-caption font-black uppercase tracking-widest transition-all ${lang === l ? "ds-bg-1 ds-aurora-bg ds-aurora-text ds-t1 shadow-sm" : "ds-t3 hover:ds-t2"}`}>
                          {l === "id" ? "ID" : "EN"}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button key={ii} onClick={() => (item as ActionItem).action?.()} disabled={item.loading}
                    className={`w-full flex items-center gap-3 p-4 text-left hover:ds-bg-3/40 transition-colors active:scale-[0.99] disabled:opacity-60 ${ii < group.items.length - 1 ? "border-b ds-border" : ""}`}>
                    <div className={`w-10 h-10 rounded-2xl ${item.bg} flex items-center justify-center shrink-0`}>
                      <item.Icon size={18} className={item.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-light" style={{ color: "var(--text-1)" }}>{item.label}</p>
                      <p className="text-caption ds-t3 mt-0.5">{item.loading ? (isID ? "Memproses..." : "Processing...") : item.sub}</p>
                    </div>
                    <ChevronRight size={16} className="ds-t3 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-[76px] left-0 right-0 max-w-lg mx-auto px-3 pt-2 pb-4 ds-bg-0 border-t ds-border">
          <div className="flex items-center justify-center gap-1.5 py-3">
            <p className="text-label font-bold ds-t3">{MORE.BY_AUTHOR as string}</p>
          </div>
          <AnimatePresence mode="wait">
            {!confirmLogout ? (
              <motion.button key="logout-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setConfirmLogout(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 border font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                style={{ background: "color-mix(in srgb, var(--a3) 8%, transparent)", borderColor: "color-mix(in srgb, var(--a3) 20%, transparent)", color: "var(--a3)" }}>
                <LogOut size={16} /> {MORE.LOGOUT as string}
              </motion.button>
            ) : (
              <motion.div key="logout-confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
                <button onClick={() => setConfirmLogout(false)} className="flex-1 py-3.5 ds-bg-3 ds-t1 font-black text-xs uppercase tracking-widest rounded-2xl transition-all">
                  {FORM.CANCEL as string}
                </button>
                <button onClick={handleLogout} className="flex-1 py-3.5 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-[0.98]"
                  style={{ background: "color-mix(in srgb, var(--a3) 80%, var(--a2))", boxShadow: "0 4px 20px color-mix(in srgb, var(--a3) 25%, transparent)" }}>
                  {MORE.LOGOUT_YES as string}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {subPage === "guide" && <GuideTab key="guide" onBack={() => setSubPage(null)} />}
        {subPage === "about" && <AboutPage key="about" onClose={() => setSubPage(null)} />}
        {subPage === "users" && isAdmin && (
          <motion.div key="users" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed inset-0 z-[90] ds-bg-0 overflow-y-auto no-scrollbar">
            <div className="w-full max-w-lg mx-auto pt-8 px-3 pb-32">
              <h2 className="text-xl font-black ds-t1 tracking-tight mb-6">{MORE.USER_MGMT as string}</h2>
              <UserManagement onNotify={onNotify} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export default MoreTab;
