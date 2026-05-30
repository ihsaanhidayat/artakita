"use client";
import { memo, useState, useCallback, useMemo } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import GuideTab from "@/components/tabs/GuideTab";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, Users, Info, LogOut,
  Heart, ChevronRight, Shield,
  Globe, BookOpen
} from "lucide-react";
import { MORE, ABOUT, APP_VERSION, APP_AUTHOR } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient";
import { parseFlexibleNumber, fmt } from "@/lib/utils";
import UserManagement from "@/components/UserManagement";
import DeleteModal from "@/components/DeleteModal";

// ── About Page ────────────────────────────────────────────────────────────────
const AboutPage = memo(function AboutPage({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="fixed inset-0 z-[90] bg-white dark:bg-black overflow-y-auto no-scrollbar"
    >
      <div className="w-full max-w-lg mx-auto pt-8 px-4 pb-32">
        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-8">
          {ABOUT.TITLE}
        </h2>

        {/* App card */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[32px] p-8 mb-6 text-center relative overflow-hidden shadow-2xl shadow-blue-500/20">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
          <h3 className="text-3xl font-black text-white tracking-tight mb-1">ArtaKita.</h3>
          <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-3">Artaku Artamu</p>
          <span className="px-3 py-1 bg-white/20 rounded-full text-white text-[10px] font-black uppercase tracking-widest">
            {ABOUT.VERSION}
          </span>
        </div>

        {/* Description */}
        <div className="bg-white dark:bg-[#121827] rounded-[24px] p-5 border border-gray-100 dark:border-gray-800/60 mb-4 shadow-sm">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{ABOUT.DESC}</p>
        </div>

        {/* Features */}
        <div className="bg-white dark:bg-[#121827] rounded-[24px] p-5 border border-gray-100 dark:border-gray-800/60 mb-6 shadow-sm">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">{ABOUT.FEATURES}</p>
          <div className="space-y-2">
            {ABOUT.FEATURE_LIST.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                <p className="text-sm text-gray-700 dark:text-gray-300 font-bold">{f}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tech */}
        <p className="text-center text-[10px] text-gray-400 mb-2">{ABOUT.TECH}</p>

        {/* By author */}
        <div className="flex items-center justify-center gap-1.5">
          <p className="text-[10px] font-bold text-gray-400">{MORE.BY_AUTHOR}</p>
          <Heart size={12} className="text-pink-500 fill-pink-500" />
        </div>
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
  handleModifySavings, triggerDeleteGoal,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="fixed inset-0 z-[90] bg-white dark:bg-black overflow-y-auto no-scrollbar"
    >
      <div className="w-full max-w-lg mx-auto pt-8 px-3 pb-32">
        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-6">
          Celengan & Target
        </h2>

        {/* New goal form toggle */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Target Impian</p>
          <button
            onClick={() => setIsNewGoalOpen(!isNewGoalOpen)}
            className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all active:scale-95"
          >
            {isNewGoalOpen ? "Batal" : "+ Target"}
          </button>
        </div>

        <AnimatePresence>
          {isNewGoalOpen && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddGoal}
              className="bg-gray-50 dark:bg-gray-900/40 p-5 rounded-[24px] border border-gray-100 dark:border-gray-800/50 space-y-3 mb-6 overflow-hidden"
            >
              <input
                type="text" required
                placeholder="Nama target (Cth: Laptop, Dana Darurat)"
                value={newGoalData.name}
                onChange={e => setNewGoalData(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-white dark:bg-[#121827] border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-4 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text" required
                  placeholder="Target (Cth: 5jt)"
                  value={newGoalData.target}
                  onChange={e => setNewGoalData(p => ({ ...p, target: e.target.value }))}
                  className="w-full bg-white dark:bg-[#121827] border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-4 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Isi awal (opsional)"
                  value={newGoalData.current}
                  onChange={e => setNewGoalData(p => ({ ...p, current: e.target.value }))}
                  className="w-full bg-white dark:bg-[#121827] border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-4 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                Simpan Target
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Goal list */}
        <div className="space-y-3">
          {goals.map(goal => {
            const pct    = Math.min(100, ((goal.current_amount / goal.target_amount) * 100)).toFixed(0);
            const isOpen = activeGoalInput === goal.id;
            return (
              <div key={goal.id} className="bg-white dark:bg-[#121827] p-5 rounded-[24px] border border-gray-100 dark:border-gray-800/60 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-black text-sm text-gray-900 dark:text-white">{goal.name}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">
                      Rp {fmt(goal.current_amount)} / <span className="font-bold">Rp {fmt(goal.target_amount)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-blue-500">{pct}%</span>
                    <button onClick={() => triggerDeleteGoal(goal.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                  />
                </div>

                {!isOpen ? (
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setActiveGoalInput(goal.id)}
                      className="text-[9px] font-black text-blue-500 bg-blue-500/10 border border-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500 hover:text-white transition-all uppercase tracking-wider"
                    >
                      Mutasi Saldo
                    </button>
                    <button
                      onClick={() => handleModifySavings(goal.id, goal.current_amount, "reset")}
                      className="text-[9px] font-black text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider"
                    >
                      Reset
                    </button>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Nominal (Cth: 10k, 50k)"
                      value={flexibleSavingsAmt}
                      onChange={e => setFlexibleSavingsAmt(e.target.value)}
                      className="flex-1 bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-xl py-2 px-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500"
                    />
                    <button onClick={() => handleModifySavings(goal.id, goal.current_amount, "add")} className="px-3 py-2 bg-green-600 text-white font-black text-[9px] uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all">+ Tabung</button>
                    <button onClick={() => handleModifySavings(goal.id, goal.current_amount, "subtract")} className="px-3 py-2 bg-red-600 text-white font-black text-[9px] uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all">- Pakai</button>
                    <button onClick={() => { setActiveGoalInput(null); setFlexibleSavingsAmt(""); }} className="p-2 text-gray-400 hover:text-gray-600 text-xs font-bold">Batal</button>
                  </motion.div>
                )}
              </div>
            );
          })}

          {goals.length === 0 && !isNewGoalOpen && (
            <div className="text-center py-12 bg-gray-50/50 dark:bg-gray-900/10 rounded-[24px] border border-dashed border-gray-200 dark:border-gray-800">
              <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.4em]">Belum Ada Target</p>
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
  const [subPage, setSubPage]           = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [isExporting, setIsExporting]   = useState(false);
  const [goalDeleteModal, setGoalDeleteModal] = useState({ isOpen: false, id: null });
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
        "Tanggal":    new Date(t.created_at).toLocaleDateString("id-ID"),
        "Waktu":      new Date(t.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        "Catatan":    t.note,
        "Kategori":   t.category,
        "Jenis":      t.type === "income" ? "Pemasukan" : "Pengeluaran",
        "Nominal":    Number(t.amount),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trxRows), "Transaksi");

      // Sheet 2: Hutang & Piutang
      const debtRows = (debts || []).map(d => ({
        "Nama":           d.person_name,
        "Jenis":          d.type === "debt" ? "Hutang" : "Piutang",
        "Nominal Awal":   Number(d.initial_amount),
        "Sisa":           Number(d.amount),
        "Status":         d.status === "paid" ? "Lunas" : "Belum Lunas",
        "Jatuh Tempo":    d.due_date || "-",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(debtRows), "Hutang Piutang");

      // Sheet 3: Aset
      const assetRows = (assets || []).map(a => ({
        "Nama Barang":    a.name,
        "Toko":           a.store_name || "-",
        "Tgl Beli":       a.purchase_date || "-",
        "Harga Beli":     Number(a.price),
        "Kondisi":        a.condition,
        "Catatan":        a.notes || "-",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(assetRows), "Aset");

      // Sheet 4: Transaksi Rutin
      const recurRows = (recurring || []).map(r => ({
        "Catatan":     r.note,
        "Nominal":     Number(r.amount),
        "Kategori":    r.category,
        "Jenis":       r.type === "income" ? "Pemasukan" : "Pengeluaran",
        "Frekuensi":   r.frequency === "monthly" ? "Bulanan" : r.frequency === "weekly" ? "Mingguan" : "Harian",
        "Jadwal":      r.next_run_date,
        "Status":      r.is_active ? "Aktif" : "Nonaktif",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recurRows), "Transaksi Rutin");

      // Sheet 5: Target Impian
      const goalRows = (goalsData || []).map(g => ({
        "Nama Target":  g.name,
        "Target":       Number(g.target_amount),
        "Terkumpul":    Number(g.current_amount),
        "Progress %":   `${Math.min(100, ((g.current_amount / g.target_amount) * 100)).toFixed(1)}%`,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(goalRows), "Target Impian");

      // Download
      const date     = new Date().toLocaleDateString("id-ID").replace(/\//g, "-");
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
          color: "text-blue-500", bg: "bg-blue-500/10",
          action: handleExport,
          loading: isExporting,
        },
        {
          Icon: Globe, label: MORE.LANGUAGE,
          sub: MORE.LANGUAGE_SUB,
          color: "text-indigo-500", bg: "bg-indigo-500/10",
          action: null, // custom render
          isLang: true,
        },
      ],
    },
    ...(isAdmin ? [{
      label: "Administrator",
      items: [
        {
          Icon: Shield, label: MORE.USER_MGMT,
          sub: MORE.USER_MGMT_SUB,
          color: "text-rose-500", bg: "bg-rose-500/10",
          action: () => setSubPage("users"),
        },
      ],
    }] : []),
    {
      items: [
        {
          Icon: BookOpen, label: "Panduan",
          sub: "Cara penggunaan lengkap",
          color: "text-blue-500", bg: "bg-blue-500/10",
          action: () => setSubPage("guide"),
        },
        {
          Icon: Info, label: MORE.ABOUT,
          sub: MORE.ABOUT_SUB,
          color: "text-gray-500", bg: "bg-gray-500/10",
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
        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-6 flex-none">
          {MORE.TITLE}
        </h2>

        {/* Menu groups */}
        <div className="space-y-2 flex-1 pb-36">
          {menuGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2 px-1">
                  {group.label}
                </p>
              )}
              <div className="bg-white dark:bg-[#121827] rounded-[24px] border border-gray-100 dark:border-gray-800/60 shadow-sm overflow-hidden">
                {group.items.map((item, ii) => item.isLang ? (
                    /* ── Bahasa toggle ── */
                    <div
                      key={ii}
                      className={`w-full flex items-center gap-3 p-4 ${
                        ii < group.items.length - 1 ? "border-b border-gray-100 dark:border-gray-800/40" : ""
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-2xl ${item.bg} flex items-center justify-center shrink-0`}>
                        <item.Icon size={18} className={item.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{item.label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
                      </div>
                      {/* Toggle pill ID / EN */}
                      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1 shrink-0">
                        {["id", "en"].map(l => (
                          <button
                            key={l}
                            onClick={() => setLang(l)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                              lang === l
                                ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm"
                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                    className={`w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors active:scale-[0.99] disabled:opacity-60 ${
                      ii < group.items.length - 1 ? "border-b border-gray-100 dark:border-gray-800/40" : ""
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-2xl ${item.bg} flex items-center justify-center shrink-0`}>
                      <item.Icon size={18} className={item.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.loading ? (isID ? "Memproses..." : "Processing...") : item.sub}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
                  </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Logout fixed bottom ── */}
        <div className="fixed bottom-[72px] left-0 right-0 max-w-lg mx-auto px-3 pb-3 bg-white dark:bg-black border-t border-gray-100 dark:border-gray-800/60">
          {/* By author */}
          <div className="flex items-center justify-center gap-1.5 py-3">
            <p className="text-[9px] font-bold text-gray-300 dark:text-gray-700">
              dibuat dengan
            </p>
            <Heart size={10} className="text-pink-500 fill-pink-500" />
            <p className="text-[9px] font-bold text-gray-300 dark:text-gray-700">
              oleh {APP_AUTHOR}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!confirmLogout ? (
              <motion.button
                key="logout-btn"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setConfirmLogout(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
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
                  className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-red-500/30"
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
            className="fixed inset-0 z-[90] bg-white dark:bg-black overflow-y-auto no-scrollbar"
          >
            <div className="w-full max-w-lg mx-auto pt-8 px-3 pb-32">
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-6">
                {MORE.USER_MGMT}
              </h2>
              <UserManagement onNotify={onNotify} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goal delete modal */}
      <DeleteModal
        isOpen={goalDeleteModal.isOpen}
        title="Hapus Target?"
        message="Target ini dan seluruh progresnya akan dihapus permanen."
        confirmLabel="Hapus Target"
        onConfirm={async () => {
          if (goalDeleteModal.id) {
            await supabase.from("savings_goals").delete().eq("id", goalDeleteModal.id);
            setGoals(p => p.filter(g => g.id !== goalDeleteModal.id));
          }
          setGoalDeleteModal({ isOpen: false, id: null });
        }}
        onCancel={() => setGoalDeleteModal({ isOpen: false, id: null })}
      />
    </>
  );
});

export default MoreTab;
