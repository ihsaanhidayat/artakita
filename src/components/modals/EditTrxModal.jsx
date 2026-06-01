"use client";
import { memo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Tags } from "lucide-react";
import { parseFlexibleNumber } from "@/lib/utils";

// Palet warna untuk Pills Kategori
const pillColors = [
  { base: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/50", active: "bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]" },
  { base: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:border-amber-500/50", active: "bg-amber-500/20 text-amber-300 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]" },
  { base: "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:border-purple-500/50", active: "bg-purple-500/20 text-purple-300 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.2)]" },
  { base: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:border-cyan-500/50", active: "bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)]" },
  { base: "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:border-rose-500/50", active: "bg-rose-500/20 text-rose-300 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.2)]" },
  { base: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:border-indigo-500/50", active: "bg-indigo-500/20 text-indigo-300 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.2)]" },
];

const EditTrxModal = memo(function EditTrxModal({
  isOpen, data, onSubmit, onClose, existingCategories,
}) {
  const [localAmount, setLocalAmount] = useState("");
  const [localNote, setLocalNote] = useState("");
  const [localCategory, setLocalCategory] = useState("");
  const [localDate, setLocalDate] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayAmount, setDisplayAmount] = useState("");

  useEffect(() => {
    if (isOpen && data) {
      const amt = String(data.amount ?? "");
      setLocalAmount(amt);
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
    }
  }, [isOpen, data?.id]);

  const handleBackdrop = useCallback(() => {
    if (!isDirty) onClose();
  }, [isDirty, onClose]);

  const handleAmountFocus = useCallback(() => {
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
    if (isSubmitting || !isDirty) return;
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
  }, [data, localAmount, localNote, localCategory, localDate, isDirty, isSubmitting, onSubmit]);

  if (!isOpen || !data) return null;
  const isIncome = data.type === "income";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            onClick={handleBackdrop}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[101] flex items-center justify-center px-4"
          >
            <div
              className="w-full max-w-sm bg-[#0a0f1c] rounded-[24px] shadow-2xl border border-gray-800/80 p-5"
              onClick={e => e.stopPropagation()}
            >
              {/* Header Minimalis */}
              <div className="flex justify-between items-center mb-5 px-1">
                <p className={`text-[10px] font-black uppercase tracking-widest ${isIncome ? "text-emerald-500" : "text-red-500"}`}>
                  {isIncome ? "Edit Pemasukan" : "Edit Pengeluaran"}
                </p>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors bg-gray-800/50 p-1.5 rounded-full">
                  <X size={14} />
                </button>
              </div>

              {/* Form Grid Compact */}
              <div className="space-y-4">

                {/* 1. Input Nominal */}
                <input
                  type="text" inputMode="decimal"
                  placeholder="50k, 1jt, 500rb..."
                  value={displayAmount}
                  onChange={handleAmountChange}
                  onFocus={handleAmountFocus}
                  onBlur={handleAmountBlur}
                  className={`w-full bg-[#121827] text-2xl font-black px-5 py-4 rounded-[16px] border transition-all outline-none placeholder-gray-600 ${isIncome
                    ? "text-emerald-400 border-emerald-500/30 focus:border-emerald-500"
                    : "text-red-400 border-red-500/30 focus:border-red-500"
                    }`}
                />

                {/* 2. Catatan (Sekarang Full Width karena input Kategori dihapus) */}
                <input
                  type="text"
                  placeholder="Catatan Transaksi..."
                  value={localNote}
                  onChange={e => { setLocalNote(e.target.value); setIsDirty(true); }}
                  className="w-full bg-[#121827] text-white text-sm font-bold px-5 py-3.5 rounded-[16px] border border-gray-800/60 focus:border-blue-500/60 outline-none transition-colors placeholder-gray-600"
                />

                {/* 3. AREA KATEGORI (Label + Pills) */}
                <div className="pt-1">
                  <div className="flex items-center gap-1.5 px-1 mb-2.5">
                    <Tags size={12} className="text-gray-500" />
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      Pilih Kategori
                    </p>
                  </div>

                  {existingCategories && existingCategories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {existingCategories.map((cat, index) => {
                        const colorTheme = pillColors[index % pillColors.length];
                        const isSelected = localCategory === cat;

                        return (
                          <button
                            key={cat}
                            onClick={(e) => {
                              e.preventDefault();
                              setLocalCategory(cat);
                              setIsDirty(true);
                            }}
                            className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all duration-300 ${isSelected ? colorTheme.active : colorTheme.base
                              }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 italic px-1">Belum ada kategori tersedia.</p>
                  )}
                </div>

                {/* 4. Tanggal, Batal & Simpan (Inline) */}
                <div className="flex gap-3 h-[48px] pt-2">

                  {/* Icon Kalender */}
                  <div className="relative w-[48px] h-full shrink-0 bg-[#121827] rounded-[16px] border border-gray-800/60 hover:border-gray-500 transition-colors flex items-center justify-center overflow-hidden group">
                    <Calendar size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                    <input
                      type="date"
                      value={localDate}
                      onChange={e => { if (e.target.value) { setLocalDate(e.target.value); setIsDirty(true); } }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>

                  {/* Batal */}
                  <button
                    onClick={onClose}
                    className="flex-1 bg-[#121827] border border-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800 rounded-[16px] font-bold text-sm transition-all"
                  >
                    Batal
                  </button>

                  {/* Simpan */}
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !isDirty}
                    className={`flex-1 rounded-[16px] font-bold text-sm transition-all ${isDirty
                      ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30"
                      : "bg-[#121827] border border-gray-800/60 text-gray-600 cursor-not-allowed"
                      }`}
                  >
                    {isSubmitting ? "..." : "Simpan"}
                  </button>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default EditTrxModal;