"use client";
import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Loader2, ShieldAlert } from "lucide-react";

const ForcePasswordModal = memo(function ForcePasswordModal({
  isOpen, newPassword, setNewPassword, onSubmit, isLoading, error,
}) {
  const isDirty = newPassword?.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[101] flex items-start justify-center px-4"
            style={{ paddingTop: "20vh" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full max-w-sm bg-white dark:bg-[#0d1117] rounded-[24px] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-5 py-3.5 flex items-center justify-between bg-amber-500/10 border-b border-amber-500/20">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-amber-500" />
                  <p className="text-sm font-black text-amber-500">Ganti Password</p>
                </div>
                <button
                  onClick={onSubmit}
                  disabled={isLoading || !isDirty}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest ml-3 shrink-0 transition-all disabled:opacity-40 ${
                    isDirty ? "bg-amber-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                  }`}
                >
                  {isLoading ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                  {isLoading ? "..." : "Simpan"}
                </button>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-gray-500 mb-3">Password harus diganti untuk melanjutkan.</p>
                {error && <p className="text-xs text-red-500 mb-3 font-bold">{error}</p>}
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Password Baru</label>
                  <input
                    autoFocus type="password"
                    placeholder="Min 6 karakter"
                    value={newPassword ?? ""}
                    onChange={e => setNewPassword(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") onSubmit(); }}
                    className="w-full bg-transparent outline-none font-bold text-sm text-gray-900 dark:text-white border-b-2 border-gray-200 dark:border-gray-800 focus:border-amber-500 transition-colors pb-2"
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

export default ForcePasswordModal;
