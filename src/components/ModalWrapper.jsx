"use client";
import { memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save } from "lucide-react";

/**
 * ModalWrapper — Standar center dialog untuk semua modal di ArtaKita
 * Props:
 *   isOpen, onClose, onSave, isDirty, isSaving
 *   title, subtitle, accentColor ("blue"|"red"|"green"|"violet")
 *   children
 */
const COLORS = {
  blue:   { bg: "bg-blue-500/10",   border: "border-blue-500/20",   btn: "bg-blue-600 hover:bg-blue-500",   text: "text-blue-500"   },
  red:    { bg: "bg-red-500/10",    border: "border-red-500/20",    btn: "bg-red-600 hover:bg-red-500",     text: "text-red-500"    },
  green:  { bg: "bg-green-500/10",  border: "border-green-500/20",  btn: "bg-green-600 hover:bg-green-500", text: "text-green-500"  },
  violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", btn: "bg-violet-600 hover:bg-violet-500",text: "text-violet-500"},
  amber:  { bg: "bg-amber-500/10",  border: "border-amber-500/20",  btn: "bg-amber-600 hover:bg-amber-500", text: "text-amber-500"  },
};

const ModalWrapper = memo(function ModalWrapper({
  isOpen, onClose, onSave, isDirty, isSaving,
  title, subtitle, accentColor = "blue", children,
}) {
  const color = COLORS[accentColor] || COLORS.blue;

  const handleBackdrop = useCallback(() => {
    if (!isDirty) onClose();
    // Jika ada perubahan → tidak bisa close, user harus Save
  }, [isDirty, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={handleBackdrop}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />

          {/* Center dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[101] flex items-start justify-center px-4"
            style={{ paddingTop: "18vh" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full max-w-sm bg-white dark:bg-[#0d1117] rounded-[24px] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">

              {/* Header */}
              <div className={`px-5 py-3.5 flex items-center justify-between ${color.bg} border-b ${color.border}`}>
                <div className="min-w-0 flex-1">
                  {subtitle && (
                    <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${color.text} opacity-70`}>
                      {subtitle}
                    </p>
                  )}
                  <p className={`text-sm font-black truncate ${color.text}`}>{title}</p>
                </div>
                <button
                  onClick={isDirty ? onSave : onClose}
                  disabled={isSaving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest ml-3 shrink-0 transition-all disabled:opacity-40 ${
                    isDirty ? `${color.btn} text-white shadow-sm` : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                  }`}
                >
                  <Save size={11} />
                  {isSaving ? "..." : isDirty ? "Simpan" : "Tutup"}
                </button>
              </div>

              {/* Content */}
              <div className="px-5 py-4 space-y-4 max-h-[60dvh] overflow-y-auto no-scrollbar">
                {children}
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default ModalWrapper;

// ── Field components untuk konsistensi ────────────────────────────────────────
export const FieldLabel = memo(({ children }) => (
  <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
    {children}
  </label>
));

export const FieldInput = memo(({ className = "", ...props }) => (
  <input
    className={`w-full bg-gray-50 dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-3 text-gray-900 dark:text-white font-bold text-sm outline-none focus:border-blue-500 transition-all placeholder-gray-300 dark:placeholder-gray-600 ${className}`}
    {...props}
  />
));

export const FieldRow = memo(({ children, className = "" }) => (
  <div className={className}>{children}</div>
));
