"use client";
import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Loader2 } from "lucide-react";
import type { AddUserModalState } from "@/types";

interface AddUserModalProps {
  isOpen: boolean;
  data: AddUserModalState;
  setData: React.Dispatch<React.SetStateAction<AddUserModalState>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const AddUserModal = memo(function AddUserModal({ isOpen, data, setData, onSubmit, onClose }: AddUserModalProps) {
  const isDirty = data?.username?.trim().length > 0 || data?.password?.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={() => { if (!isDirty) onClose(); }}
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
              <div className="px-5 py-3.5 flex items-center justify-between border-b ds-border" style={{ background: "color-mix(in srgb, var(--a2) 10%, transparent)" }}>
                <p className="text-sm font-black" style={{ color: "var(--a2)" }}>Tambah User</p>
                <button
                  onClick={isDirty ? onSubmit : onClose}
                  disabled={data?.isLoading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-caption uppercase tracking-widest ml-3 shrink-0 transition-all disabled:opacity-40 ${
                    isDirty ? "text-white" : "ds-bg-3 ds-t3"
                  }`}
                  style={isDirty ? { background: "linear-gradient(135deg, var(--a1), var(--a2))" } : undefined}
                >
                  {data?.isLoading ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                  {data?.isLoading ? "..." : isDirty ? "Buat" : "Tutup"}
                </button>
              </div>
              <div className="px-5 py-4 space-y-0">
                <div className="border-b ds-border py-3">
                  <label className="text-2xs font-black ds-t3 uppercase tracking-widest block mb-1.5">Username</label>
                  <input
                    autoFocus type="text"
                    placeholder="username"
                    value={data?.username ?? ""}
                    onChange={e => setData(p => ({ ...p, username: e.target.value }))}
                    className="w-full bg-transparent outline-none font-bold text-sm ds-t1"
                  />
                </div>
                <div className="py-3">
                  <label className="text-2xs font-black ds-t3 uppercase tracking-widest block mb-1.5">Password</label>
                  <input
                    type="password"
                    placeholder="Min 6 karakter"
                    value={data?.password ?? ""}
                    onChange={e => setData(p => ({ ...p, password: e.target.value }))}
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

export default AddUserModal;
