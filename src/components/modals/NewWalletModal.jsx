"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function NewWalletModal({ isOpen, name, setName, onSubmit, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800/80"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-widest">
                Buat Rekening Baru
              </h3>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800/50 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">
                  Nama Rekening
                </label>
                <input
                  type="text" required autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: BCA Pribadi"
                  className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-4 px-5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-500 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-green-500/30"
              >
                Buka Rekening
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
