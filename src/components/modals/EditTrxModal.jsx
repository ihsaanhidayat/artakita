"use client";
import { memo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Calendar, X } from "lucide-react";
import { parseFlexibleNumber } from "@/lib/utils";

/**
 * EditTrxModal — Center dialog compact
 * Animasi: opacity + scale saja (ringan)
 * Posisi: tengah layar, naik saat keyboard muncul
 */
const EditTrxModal = memo(function EditTrxModal({
  isOpen, data, onSubmit, onClose, existingCategories,
}) {
  const [localAmount,   setLocalAmount]   = useState("");
  const [localNote,     setLocalNote]     = useState("");
  const [localCategory, setLocalCategory] = useState("");
  const [localDate,     setLocalDate]     = useState("");
  const [isDirty,       setIsDirty]       = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [displayAmount, setDisplayAmount] = useState("");

  useEffect(() => {
    if (isOpen && data) {
      const amt = String(data.amount ?? "");
      setLocalAmount(amt);
      // Format display dengan pemisah ribuan
      const num = parseFloat(amt);
      setDisplayAmount(isNaN(num) ? amt : num.toLocaleString("id-ID"));
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
  }, [isOpen, data?.id]);

  const handleBackdrop = useCallback(() => {
    if (isDirty) setShowConfirm(true);
    else onClose();
  }, [isDirty, onClose]);

  const handleAmountFocus = useCallback(() => {
    // Saat fokus, tampilkan angka biasa agar mudah diedit
    setDisplayAmount(localAmount);
  }, [localAmount]);

  const handleAmountChange = useCallback((e) => {
    setLocalAmount(e.target.value);
    setDisplayAmount(e.target.value);
    setIsDirty(true);
  }, []);

  const handleAmountBlur = useCallback(() => {
    const p = parseFlexibleNumber(localAmount);
    if (p > 0) {
      setLocalAmount(String(p));
      setDisplayAmount(p.toLocaleString("id-ID"));
    }
  }, [localAmount]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    if (isSubmitting) return;
    const parsed = parseFlexibleNumber(localAmount);
    if (!parsed || parsed <= 0) return;
    let newCreatedAt = data?.created_at;
    if (localDate) {
      const orig = data?.created_at ? new Date(data.created_at) : new Date();
      const [y, m, d] = localDate.split("-").map(Number);
      orig.setFullYear(y, m - 1, d);
      newCreatedAt = orig.toISOString();
    }
    setIsSubmitting(true);
    try {
      await onSubmit({ ...data, amount: parsed, note: localNote, category: localCategory, created_at: newCreatedAt });
    } finally { setIsSubmitting(false); }
  }, [data, localAmount, localNote, localCategory, localDate, isSubmitting, onSubmit]);

  if (!isOpen || !data) return null;
  const isIncome = data.type === "income";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleBackdrop}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog center — compact */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[101] flex items-center justify-center px-4"
            style={{ alignItems: "flex-start", paddingTop: "20vh" }}
          >
            <div
              className="w-full max-w-sm bg-white dark:bg-[#0d1117] rounded-[24px] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`px-5 py-3.5 flex items-center justify-between ${
                isIncome ? "bg-green-500/10" : "bg-red-500/10"
              }`}>
                <div className="min-w-0 flex-1">
                  <p className={`text-[8px] font-black uppercase tracking-widest ${
                    isIncome ? "text-green-500/70" : "text-red-500/70"
                  }`}>
                    {isIncome ? "Edit Pemasukan" : "Edit Pengeluaran"}
                  </p>
                  <p className={`text-sm font-black truncate mt-0.5 ${
                    isIncome ? "text-green-400" : "text-red-400"
                  }`}>{data.note || "—"}</p>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest ml-3 shrink-0 transition-all disabled:opacity-40 ${
                    isDirty ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                  }`}
                >
                  <Save size={11} />
                  {isSubmitting ? "..." : "Simpan"}
                </button>
              </div>

              {/* Fields */}
              <div className="px-5 py-2">

                {/* Nominal dengan format ribuan */}
                <div className="py-3 border-b border-gray-100 dark:border-gray-800/60">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Nominal</label>
                  <input
                    type="text" inputMode="decimal"
                    value={displayAmount}
                    onChange={handleAmountChange}
                    onFocus={handleAmountFocus}
                    onBlur={handleAmountBlur}
                    className={`w-full bg-transparent outline-none font-black text-2xl tracking-tight pb-0.5 border-b-2 border-transparent transition-colors ${
                      isIncome
                        ? "text-green-500 focus:border-green-500/50"
                        : "text-red-500 focus:border-red-500/50"
                    }`}
                  />
                </div>

                {/* Catatan */}
                <div className="py-3 border-b border-gray-100 dark:border-gray-800/60">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Catatan</label>
                  <input
                    type="text"
                    value={localNote}
                    onChange={e => { setLocalNote(e.target.value); setIsDirty(true); }}
                    className="w-full bg-transparent outline-none font-bold text-sm text-gray-900 dark:text-white"
                  />
                </div>

                {/* Kategori */}
                <div className="py-3 border-b border-gray-100 dark:border-gray-800/60">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Kategori</label>
                  <input
                    list="edit-cat-list" type="text"
                    value={localCategory}
                    onChange={e => { setLocalCategory(e.target.value); setIsDirty(true); }}
                    className="w-full bg-transparent outline-none font-bold text-sm text-gray-900 dark:text-white"
                  />
                  <datalist id="edit-cat-list">
                    {existingCategories?.map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>

                {/* Tanggal */}
                <div className="py-3 flex items-center justify-between">
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
            </div>
          </motion.div>

          {/* Konfirmasi */}
          <AnimatePresence>
            {showConfirm && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[102] flex items-center justify-center p-6"
                onClick={() => setShowConfirm(false)}
              >
                <motion.div
                  initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
                  transition={{ duration: 0.12 }}
                  onClick={e => e.stopPropagation()}
                  className="w-full max-w-[260px] bg-white dark:bg-[#121827] rounded-[20px] p-5 shadow-2xl text-center border border-gray-100 dark:border-gray-800"
                >
                  <p className="font-black text-sm text-gray-900 dark:text-white mb-1">Simpan perubahan?</p>
                  <p className="text-[10px] text-gray-400 mb-4">Perubahan belum disimpan.</p>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowConfirm(false); setIsDirty(false); onClose(); }}
                      className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-black text-[10px] uppercase tracking-widest rounded-xl">
                      Buang
                    </button>
                    <button onClick={() => { setShowConfirm(false); handleSubmit(); }}
                      className="flex-1 py-2.5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl">
                      Simpan
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
});

export default EditTrxModal;
