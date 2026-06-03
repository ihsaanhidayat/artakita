"use client";
import { memo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { fmt } from "@/lib/utils";
import {
  Trash2, RefreshCw, CheckCircle2,
  Play, Pause, Loader2, Wallet,
  Clock, AlertTriangle, CalendarRange, PenLine
} from "lucide-react";

// Helper format teks Next Date
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

// Helper warna text
const getNextColor = (dateStr) => {
  if (!dateStr) return "text-gray-400";
  const next = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  next.setHours(0, 0, 0, 0);
  const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "text-red-500 font-black";
  if (diff <= 1) return "text-amber-500 font-black";
  if (diff <= 3) return "text-blue-500 font-bold";
  return "text-gray-400 dark:text-gray-500 font-bold";
};

// Helper Frekuensi
const getFreqLabel = (item) => {
  if (item.frequency === "weekly") return "Mingguan";
  if (item.frequency === "monthly") return "Bulanan";
  if (item.frequency === "custom") {
    const typeId = item.custom_type === "weeks" ? "Minggu" : "Bulan";
    return `Tiap ${item.custom_interval || 1} ${typeId}`;
  }
  return "Bulanan";
};

// Kalkulasi Tanggal Berikutnya
const calculateNextDate = (currentDateStr, freq, interval, type) => {
  const current = new Date(currentDateStr);
  let nextDate = new Date(current);

  if (freq === "weekly") {
    nextDate.setDate(current.getDate() + 7);
  } else if (freq === "custom") {
    if (type === "weeks") nextDate.setDate(current.getDate() + ((interval || 1) * 7));
    else nextDate.setMonth(current.getMonth() + (interval || 1));
  } else {
    nextDate.setMonth(current.getMonth() + 1);
  }
  return nextDate.toISOString().slice(0, 10);
};

const RecurringTabComponent = memo(function RecurringTab({ activeWallet, onNotify }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null, note: "" });
  const [runningId, setRunningId] = useState(null);

  // STATE BARU: Menyimpan catatan custom dari masing-masing kartu
  const [payNotes, setPayNotes] = useState({});

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

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── Toggle active (Pause/Play) ─────────────────────────────────────────
  const handleToggle = async (item) => {
    const { error } = await supabase
      .from("recurring_transactions")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);
    if (!error) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i));
    }
  };

  // ── SUDAH BAYAR (Jalankan Manual dengan Catatan) ───────────────────────
  const handlePayNow = async (item) => {
    setRunningId(item.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Ambil catatan custom jika user mengisinya
      const customNote = payNotes[item.id]?.trim();
      const finalNote = customNote ? `${item.note} (${customNote})` : item.note;

      // 1. Insert ke transaksi utama
      const { error: insertError } = await supabase.from("transactions").insert([{
        user_id: session.user.id,
        wallet_id: item.wallet_id,
        note: finalNote,
        amount: item.amount,
        category: item.category,
        type: item.type,
        is_recurring: true,
      }]);
      if (insertError) throw insertError;

      // 2. Kalkulasi & Update next_run_date
      const nextDateStr = calculateNextDate(item.next_run_date, item.frequency, item.custom_interval, item.custom_type);

      await supabase
        .from("recurring_transactions")
        .update({ next_run_date: nextDateStr })
        .eq("id", item.id);

      // Reset kolom catatan setelah sukses
      setPayNotes(prev => ({ ...prev, [item.id]: "" }));

      showNotif(`Pembayaran "${item.note}" tercatat!`, "success");
      fetchItems();
    } catch (err) {
      showNotif("Gagal mencatat pembayaran: " + err.message);
    } finally {
      setRunningId(null);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    await supabase.from("recurring_transactions").delete().eq("id", deleteModal.id);
    setDeleteModal({ show: false, id: null, note: "" });
    showNotif("Jadwal dihapus.", "success");
    fetchItems();
  };

  const dueTodayCount = items.filter(i => {
    if (!i.is_active) return false;
    const diff = Math.ceil((new Date(i.next_run_date) - new Date()) / (1000 * 60 * 60 * 24));
    return diff <= 0;
  }).length;

  return (
    <div className="pt-8 px-3 pb-32 h-[100dvh] overflow-y-auto no-scrollbar w-full flex flex-col">

      <div className="flex justify-between items-start mb-6 flex-none">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Pantau Jadwal</h2>
          <div className="flex items-center gap-2 mt-1">
            <Wallet size={11} className="text-blue-500" />
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">{activeWallet?.name}</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {dueTodayCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-[20px] p-4 flex items-center gap-3 flex-none"
          >
            <Clock size={18} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Perhatian</p>
              <p className="text-xs font-bold text-amber-500/80 dark:text-amber-400/80 mt-0.5">
                {dueTodayCount} tagihan perlu dibayar.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-2 mb-6 flex-none">
        {[
          { label: "Total", value: items.length, color: "text-blue-500" },
          { label: "Aktif", value: items.filter(i => i.is_active).length, color: "text-green-500" },
          { label: "Jatuh Tempo", value: dueTodayCount, color: "text-amber-500" },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-[#121827] border border-gray-100 dark:border-gray-800/60 rounded-[20px] p-3 text-center shadow-sm">
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 flex-1">
        {isLoading && items.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-900/40 rounded-[20px] animate-pulse" />)}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="text-center py-20 bg-gray-50/50 dark:bg-gray-900/10 rounded-[28px] border border-dashed border-gray-200 dark:border-gray-800">
            <CalendarRange size={32} strokeWidth={1.5} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.4em] mb-1">Semua Beres</p>
            <p className="text-xs text-gray-500 font-medium">Jadikan transaksi sebagai<br />rutin melalui menu Edit.</p>
          </div>
        )}

        {items.map((item, index) => {
          const nextLabel = getNextLabel(item.next_run_date);
          const nextColor = getNextColor(item.next_run_date);
          const isRunning = runningId === item.id;
          const freqLabel = getFreqLabel(item);

          return (
            <motion.div
              key={item.id} layout
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
              className={`bg-white dark:bg-[#121827] border rounded-[20px] shadow-sm p-3.5 relative transition-all ${!item.is_active ? "opacity-60 border-gray-100 dark:border-gray-800/40" : "border-gray-100 dark:border-gray-800/60"
                }`}
            >
              <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${item.type === "income" ? "bg-emerald-500" : "bg-red-500"}`} />

              {/* ── BARIS 1: Info & Aksi Kanan (Inline) ── */}
              <div className="flex justify-between items-center pl-2.5">
                <div className="flex flex-col min-w-0">
                  {/* Nama Item (Di Atas & Lebih Besar) */}
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base text-gray-900 dark:text-white truncate">
                      {item.note}
                    </span>
                    {!item.is_active && (
                      <span className="text-[8px] font-black text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full uppercase shrink-0">Pause</span>
                    )}
                  </div>
                  {/* Nominal & Kategori (Di Bawah & Lebih Kecil) */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[11px] font-black ${item.type === "income" ? "text-emerald-500" : "text-red-500"}`}>
                      Rp {fmt(item.amount)}
                    </span>
                    <span className="text-gray-300 dark:text-gray-700 text-[8px]">•</span>
                    <span className="text-[9px] font-bold text-gray-500">{item.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex flex-col items-end mr-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${nextColor}`}>
                      {nextLabel}
                    </span>
                    <span className="text-[8px] font-bold text-gray-400">
                      {item.next_run_date ? new Date(item.next_run_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' }) : "-"}
                    </span>
                  </div>
                  <div className="w-[1px] h-6 bg-gray-100 dark:bg-gray-800/60 mx-1"></div>
                  <button
                    onClick={() => handleToggle(item)}
                    className={`p-2 rounded-xl transition-colors ${item.is_active ? "text-amber-500 hover:bg-amber-500/10" : "text-green-500 hover:bg-green-500/10"}`}
                    title={item.is_active ? "Pause" : "Aktifkan"}
                  >
                    {item.is_active ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    onClick={() => setDeleteModal({ show: true, id: item.id, note: item.note })}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* ── BARIS 2: Kolom Catatan (Input) & Tombol Bayar ── */}
              <div className="mt-3 pl-2.5 pt-3 border-t border-gray-100 dark:border-gray-800/60 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-[#0a0f1c] px-3 py-2.5 rounded-[12px] border border-transparent focus-within:border-blue-500/30 transition-colors">
                  <PenLine size={12} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Catatan tambahan (opsional)..."
                    value={payNotes[item.id] || ""}
                    onChange={e => setPayNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                    className="w-full bg-transparent text-[10px] font-bold text-gray-700 dark:text-gray-300 outline-none placeholder-gray-400"
                  />
                </div>

                <button
                  onClick={() => handlePayNow(item)}
                  disabled={isRunning || !item.is_active}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-[12px] text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none shrink-0"
                >
                  {isRunning ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {isRunning ? "Proses..." : "Bayar"}
                </button>
              </div>

            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {deleteModal.show && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setDeleteModal({ show: false, id: null, note: "" })} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#0a0f1c] border border-gray-100 dark:border-gray-800 p-6 rounded-[24px] max-w-xs w-full shadow-2xl text-center">
                <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white mb-1">Hapus Jadwal?</h3>
                <p className="text-[11px] font-bold text-gray-500 mb-6">Jadwal <span className="text-gray-900 dark:text-white">"{deleteModal.note}"</span> akan dihapus permanen.</p>
                <div className="flex gap-2">
                  <button onClick={() => setDeleteModal({ show: false, id: null, note: "" })} className="flex-1 py-3 rounded-[14px] bg-gray-50 dark:bg-[#121827] text-gray-600 dark:text-gray-400 font-bold text-[10px] uppercase tracking-widest">Batal</button>
                  <button onClick={confirmDelete} className="flex-1 py-3 rounded-[14px] bg-red-500 text-white font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/30">Hapus</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
});

export default RecurringTabComponent;