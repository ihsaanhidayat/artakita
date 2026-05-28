"use client";
import { motion, AnimatePresence } from "framer-motion";

export default function ForcePasswordModal({
  isOpen, newPassword, setNewPassword,
  onSubmit, isLoading, error,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-red-500/30 text-center"
          >
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              Ganti Password Anda
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 font-bold leading-relaxed">
              Demi keamanan, Anda wajib mengganti password default sebelum dapat mengakses sistem keuangan.
            </p>

            <form onSubmit={onSubmit} className="space-y-4">
              <input
                type="password"
                required
                minLength="6"
                placeholder="Masukkan Password Baru"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold text-center text-gray-900 dark:text-white outline-none focus:border-red-500 transition-all"
              />
              {error && (
                <p className="text-xs font-bold text-red-500 bg-red-500/10 py-2 rounded-xl">{error}</p>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-red-500/30 transition-all disabled:opacity-50"
              >
                {isLoading ? "Menyimpan..." : "Simpan & Lanjutkan"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
