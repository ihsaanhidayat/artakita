"use client";
import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Loader2, ShieldAlert } from "lucide-react";

interface ForcePasswordModalProps {
  isOpen: boolean;
  newPassword: string;
  setNewPassword: (val: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  error: string;
}

const ForcePasswordModal = memo(function ForcePasswordModal({
  isOpen, newPassword, setNewPassword, onSubmit, isLoading, error,
}: ForcePasswordModalProps) {
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mismatch, setMismatch] = useState(false);

  const isDirty   = newPassword?.length > 0;
  const canSubmit = isDirty && newPassword === confirmPassword;

  const handleSubmit = (): void => {
    if (newPassword !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    onSubmit();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[100] backdrop-blur-md" style={{ background: "rgba(0,0,0,0.6)" }}
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
            <div className="w-full max-w-sm ds-bg-1 rounded-[24px] shadow-2xl border ds-border overflow-hidden">
              <div className="px-5 py-3.5 flex items-center justify-between bg-amber-500/10 border-b border-amber-500/20">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-amber-500" />
                  <p className="text-sm font-black text-amber-500">Ganti Password</p>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !canSubmit}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-caption uppercase tracking-widest ml-3 shrink-0 transition-all disabled:opacity-40 ${
                    canSubmit ? "bg-amber-600 text-white" : "ds-bg-3 ds-t3"
                  }`}
                >
                  {isLoading ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                  {isLoading ? "..." : "Simpan"}
                </button>
              </div>
              <div className="px-5 py-4 space-y-0">
                <p className="text-xs ds-t3 mb-3">Password harus diganti untuk melanjutkan.</p>
                {error && <p className="text-xs mb-3 font-bold" style={{ color: "var(--a3)" }}>{error}</p>}
                {mismatch && <p className="text-xs mb-3 font-bold" style={{ color: "var(--a3)" }}>Password tidak cocok!</p>}

                <div className="border-b ds-border py-3">
                  <label className="text-2xs font-black ds-t3 uppercase tracking-widest block mb-1.5">Password Baru</label>
                  <input
                    autoFocus type="password"
                    placeholder="Min 6 karakter"
                    value={newPassword ?? ""}
                    onChange={e => { setNewPassword(e.target.value); setMismatch(false); }}
                    className="w-full bg-transparent outline-none font-bold text-sm ds-t1"
                  />
                </div>

                <div className="py-3">
                  <label className="text-2xs font-black ds-t3 uppercase tracking-widest block mb-1.5">Konfirmasi Password</label>
                  <input
                    type="password"
                    placeholder="Ketik ulang password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setMismatch(false); }}
                    onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
                    className="w-full bg-transparent outline-none font-bold text-sm ds-t1"
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
