"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";

interface DeleteModalProps {
  isOpen: boolean;
  title?: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteModal({
  isOpen,
  title = "Hapus Data?",
  message = "Tindakan ini permanen dan tidak dapat dibatalkan.",
  confirmLabel = "Hapus",
  onConfirm,
  onCancel,
}: DeleteModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-fuchsia-100 dark:border-fuchsia-900/30 text-center"
          >
            <div className="w-14 h-14 bg-fuchsia-100 dark:bg-fuchsia-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-fuchsia-500 dark:text-fuchsia-400" size={26} />
            </div>

            <h3 className="text-sm font-black ds-t1 uppercase tracking-widest mb-2">
              {title}
            </h3>
            <div className="text-xs ds-t3 mb-6 px-2 leading-relaxed">
              {message}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 ds-t1 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all"
              >
                Batal
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-fuchsia-500/30"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
