"use client";
import { memo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Calendar, X } from "lucide-react";
import { parseFlexibleNumber } from "@/lib/utils";
import type { Transaction } from "@/types";

interface EditTrxModalProps {
  isOpen: boolean;
  data: Transaction | null;
  onSubmit: (data: Transaction) => Promise<void>;
  onClose: () => void;
  existingCategories: string[];
}

const EditTrxModal = memo(function EditTrxModal({
  isOpen, data, onSubmit, onClose, existingCategories,
}: EditTrxModalProps) {
  const [localAmount,   setLocalAmount]   = useState("");
  const [localNote,     setLocalNote]     = useState("");
  const [localCategory, setLocalCategory] = useState("");
  const [localDate,     setLocalDate]     = useState("");
  const [isDirty,       setIsDirty]       = useState(false);
  const [isSubmitting,  setIsSubmitting]  = useState(false);
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

  const handleBackdrop = useCallback((): void => {
    if (!isDirty) onClose();
  }, [isDirty, onClose]);

  const handleAmountFocus = useCallback((): void => {
    setDisplayAmount(localAmount);
  }, [localAmount]);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    setLocalAmount(e.target.value);
    setDisplayAmount(e.target.value);
    setIsDirty(true);
  }, []);

  const handleAmountBlur = useCallback((): void => {
    const p = parseFlexibleNumber(localAmount);
    if (p > 0) {
      setLocalAmount(String(p));
      setDisplayAmount(p.toLocaleString("id-ID"));
    }
  }, [localAmount]);

  const handleSubmit = useCallback(async (e?: React.FormEvent): Promise<void> => {
    e?.preventDefault();
    if (isSubmitting || !data) return;
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleBackdrop}
            className="fixed inset-0 z-[100] backdrop-blur-md" style={{ background: "rgba(0,0,0,0.6)" }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[101] flex items-center justify-center px-4"
            style={{ alignItems: "flex-start", paddingTop: "20vh" }}
          >
            <div
              className="w-full max-w-sm ds-bg-1 rounded-[24px] shadow-2xl border ds-border overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: isIncome ? "color-mix(in srgb, var(--income) 10%, transparent)" : "color-mix(in srgb, var(--a3) 6%, transparent)" }}>
                <div className="min-w-0 flex-1">
                  <p className="text-2xs font-black uppercase tracking-widest" style={{ color: isIncome ? "color-mix(in srgb, var(--income) 70%, transparent)" : "color-mix(in srgb, var(--a3) 70%, transparent)" }}>
                    {isIncome ? "Edit Pemasukan" : "Edit Pengeluaran"}
                  </p>
                  <p className="text-sm font-black truncate mt-0.5" style={{ color: isIncome ? "var(--income)" : "var(--a3)" }}>{data.note || "—"}</p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-caption uppercase tracking-widest transition-all disabled:opacity-40"
                    style={isDirty ? { background: "linear-gradient(135deg, var(--a1), var(--a2))", color: "#fff" } : { background: "var(--bg-3)", color: "var(--text-3)" }}
                  >
                    <Save size={11} />
                    {isSubmitting ? "..." : "Simpan"}
                  </button>
                  <button
                    onClick={onClose}
                    className="w-7 h-7 flex items-center justify-center rounded-xl ds-bg-3 ds-t3 hover:ds-t1 transition-all"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              <div className="px-5 py-2">
                <div className="py-3 border-b ds-border">
                  <label className="text-2xs font-black ds-t3 uppercase tracking-widest block mb-1.5">Nominal</label>
                  <input
                    type="text" inputMode="decimal"
                    value={displayAmount}
                    onChange={handleAmountChange}
                    onFocus={handleAmountFocus}
                    onBlur={handleAmountBlur}
                    className="w-full bg-transparent outline-none font-black text-2xl tracking-tight pb-0.5 border-b-2 border-transparent transition-colors"
                    style={{ color: isIncome ? "var(--income)" : "var(--a3)" }}
                  />
                </div>

                <div className="py-3 border-b ds-border">
                  <label className="text-2xs font-black ds-t3 uppercase tracking-widest block mb-1.5">Catatan</label>
                  <input
                    type="text"
                    value={localNote}
                    onChange={e => { setLocalNote(e.target.value); setIsDirty(true); }}
                    className="w-full bg-transparent outline-none font-bold text-sm ds-t1"
                  />
                </div>

                <div className="py-3 border-b ds-border">
                  <label className="text-2xs font-black ds-t3 uppercase tracking-widest block mb-1.5">Kategori</label>
                  <input
                    list="edit-cat-list" type="text"
                    value={localCategory}
                    onChange={e => { setLocalCategory(e.target.value); setIsDirty(true); }}
                    className="w-full bg-transparent outline-none font-bold text-sm ds-t1"
                  />
                  <datalist id="edit-cat-list">
                    {existingCategories?.map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 ds-t3">
                    <Calendar size={13} />
                    <label className="text-2xs font-black uppercase tracking-widest">Tanggal</label>
                  </div>
                  <input
                    type="date"
                    value={localDate}
                    onChange={e => { if (e.target.value) { setLocalDate(e.target.value); setIsDirty(true); } }}
                    className="bg-transparent outline-none text-sm font-bold ds-t1 text-right"
                  />
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
