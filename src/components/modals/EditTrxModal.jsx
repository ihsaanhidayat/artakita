"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function EditTrxModal({
  isOpen, data, setData,
  onSubmit, onClose,
  existingCategories,
}) {
  if (!isOpen || !data) return null;

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
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                Edit Transaksi
              </h3>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800/50 rounded-full transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Nominal (Rp)
                </label>
                <input
                  type="number" required
                  value={data.amount}
                  onChange={(e) => setData({ ...data, amount: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Catatan
                </label>
                <input
                  type="text" required
                  value={data.note}
                  onChange={(e) => setData({ ...data, note: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Kategori
                </label>
                <input
                  list="edit-category-list"
                  type="text" required
                  value={data.category}
                  onChange={(e) => setData({ ...data, category: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold"
                />
                <datalist id="edit-category-list">
                  {existingCategories.map((cat) => <option key={cat} value={cat} />)}
                </datalist>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-500/30 mt-2"
              >
                Simpan Perubahan
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
