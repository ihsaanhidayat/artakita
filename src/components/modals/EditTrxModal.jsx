"use client";
import { memo, useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Calendar } from "lucide-react";
import { parseFlexibleNumber } from "@/lib/utils";

/**
 * EditTrxModal — pakai local state, bukan controlled dari parent
 * Fix: tidak re-render parent saat user ketik → tidak kehilangan fokus/karakter
 */
const EditTrxModal = memo(function EditTrxModal({
  isOpen, data, onSubmit, onClose, existingCategories,
}) {
  // ── Local state — tidak terhubung langsung ke parent ─────────────────────
  const [localAmount,   setLocalAmount]   = useState("");
  const [localNote,     setLocalNote]     = useState("");
  const [localCategory, setLocalCategory] = useState("");
  const [localDate,     setLocalDate]     = useState("");
  const [isDirty,       setIsDirty]       = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [isSubmitting,  setIsSubmitting]  = useState(false);

  // Sync dari data saat modal dibuka
  useEffect(() => {
    if (isOpen && data) {
      setLocalAmount(String(data.amount ?? ""));
      setLocalNote(data.note ?? "");
      setLocalCategory(data.category ?? "");
      setLocalDate(
        data.created_at
          ? new Date(data.created_at).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      );
      setIsDirty(false);
      setShowConfirm(false);
    }
  }, [isOpen, data?.id]); // hanya sync saat id berubah, bukan setiap render

  const handleBackdrop = useCallback(() => {
    if (isDirty) setShowConfirm(true);
    else onClose();
  }, [isDirty, onClose]);

  const handleAmountBlur = useCallback(() => {
    const p = parseFlexibleNumber(localAmount);
    if (p > 0) setLocalAmount(String(p));
  }, [localAmount]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    if (isSubmitting) return;
    const parsed = parseFlexibleNumber(localAmount);
    if (!parsed || parsed <= 0) return;

    // Reconstruct date dengan waktu asli
    let newCreatedAt = data?.created_at;
    if (localDate) {
      const orig = data?.created_at ? new Date(data.created_at) : new Date();
      const [y, m, d] = localDate.split("-").map(Number);
      orig.setFullYear(y, m - 1, d);
      newCreatedAt = orig.toISOString();
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        amount:     parsed,
        note:       localNote,
        category:   localCategory,
        created_at: newCreatedAt,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [data, localAmount, localNote, localCategory, localDate, isSubmitting, onSubmit]);

  if (!isOpen || !data) return null;

  const isIncome = data.type === "income";

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={handleBackdrop}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-[101] bg-white dark:bg-[#0d1117] rounded-t-[28px] shadow-2xl"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3">
                <div className="w-8 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>

              {/* Header — nama transaksi yang sedang diedit */}
              <div className={`mx-4 mt-3 mb-4 rounded-2xl px-4 py-3 flex items-center justify-between ${
                isIncome
                  ? "bg-green-500/10 border border-green-500/20"
                  : "bg-red-500/10 border border-red-500/20"
              }`}>
                <div className="min-w-0 flex-1">
                  <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${
                    isIncome ? "text-green-500/60" : "text-red-500/60"
                  }`}>
                    {isIncome ? "Edit Pemasukan" : "Edit Pengeluaran"}
                  </p>
                  {/* Nama transaksi yang sedang diedit */}
                  <p className={`text-sm font-black truncate ${
                    isIncome ? "text-green-400" : "text-red-400"
                  }`}>
                    {data.note || "—"}
                  </p>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-40 ml-3 shrink-0 ${
                    isDirty
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                  }`}
                >
                  <Save size={11} />
                  {isSubmitting ? "..." : "Simpan"}
                </button>
              </div>

              {/* Fields — local state, tidak mempengaruhi parent */}
              <div className="px-4 space-y-0">

                {/* Nominal */}
                <div className="border-b border-gray-100 dark:border-gray-800/60 py-3.5">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                    Nominal
                  </label>
                  <input
                    type="text" inputMode="decimal" required
                    placeholder="50k · 1jt · 500rb"
                    value={localAmount}
                    onChange={e => { setLocalAmount(e.target.value); setIsDirty(true); }}
                    onBlur={handleAmountBlur}
                    className={`w-full bg-transparent outline-none font-black text-xl text-gray-900 dark:text-white placeholder-gray-200 dark:placeholder-gray-800 border-b-2 border-transparent pb-0.5 transition-colors ${
                      isIncome ? "focus:border-green-500" : "focus:border-red-500"
                    }`}
                  />
                </div>

                {/* Catatan */}
                <div className="border-b border-gray-100 dark:border-gray-800/60 py-3.5">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                    Catatan
                  </label>
                  <input
                    type="text" required
                    placeholder="Deskripsi..."
                    value={localNote}
                    onChange={e => { setLocalNote(e.target.value); setIsDirty(true); }}
                    className="w-full bg-transparent outline-none font-bold text-base text-gray-900 dark:text-white placeholder-gray-200 dark:placeholder-gray-800"
                  />
                </div>

                {/* Kategori */}
                <div className="border-b border-gray-100 dark:border-gray-800/60 py-3.5">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                    Kategori
                  </label>
                  <input
                    list="edit-cat-list" type="text" required
                    placeholder="Pilih atau ketik..."
                    value={localCategory}
                    onChange={e => { setLocalCategory(e.target.value); setIsDirty(true); }}
                    className="w-full bg-transparent outline-none font-bold text-base text-gray-900 dark:text-white placeholder-gray-200 dark:placeholder-gray-800"
                  />
                  <datalist id="edit-cat-list">
                    {existingCategories?.map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>

                {/* Tanggal */}
                <div className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar size={13} />
                    <label className="text-[8px] font-black uppercase tracking-widest">Tanggal</label>
                  </div>
                  <input
                    type="date"
                    value={localDate}
                    onChange={e => { if (e.target.value) { setLocalDate(e.target.value); setIsDirty(true); } }}
                    className="bg-transparent outline-none text-sm font-bold text-gray-900 dark:text-white text-right"
                  />
                </div>

              </div>

              {/* Safe area */}
              <div style={{ height: "max(20px, env(safe-area-inset-bottom))" }} />
            </motion.div>

            {/* Konfirmasi buang perubahan */}
            <AnimatePresence>
              {showConfirm && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[102] flex items-center justify-center p-6"
                  onClick={() => setShowConfirm(false)}
                >
                  <motion.div
                    initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
                    transition={{ duration: 0.14 }}
                    onClick={e => e.stopPropagation()}
                    className="w-full max-w-[280px] bg-white dark:bg-[#121827] rounded-[24px] p-5 shadow-2xl border border-gray-100 dark:border-gray-800 text-center"
                  >
                    <p className="font-black text-sm text-gray-900 dark:text-white mb-1">Simpan perubahan?</p>
                    <p className="text-[10px] text-gray-400 mb-4">Perubahan belum disimpan.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowConfirm(false); setIsDirty(false); onClose(); }}
                        className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-black text-[10px] uppercase tracking-widest rounded-xl"
                      >Buang</button>
                      <button
                        onClick={() => { setShowConfirm(false); handleSubmit(); }}
                        className="flex-1 py-2.5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl"
                      >Simpan</button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </AnimatePresence>
    </>
  );
});

export default EditTrxModal;
