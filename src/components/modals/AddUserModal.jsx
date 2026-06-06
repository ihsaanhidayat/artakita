"use client";
import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Loader2 } from "lucide-react";

const AddUserModal = memo(function AddUserModal({ isOpen, data, setData, onSubmit, onClose }) {
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
      <div className="w-full max-w-sm ds-bg-1 rounded-[24px] shadow-2xl border ds-borderoverflow-hidden">
       <div className="px-5 py-3.5 flex items-center justify-between bg-violet-500/10 border-b border-violet-500/20">
        <p className="text-sm font-black text-violet-500">Tambah User</p>
        <button
         onClick={isDirty ? onSubmit : onClose}
         disabled={data?.isLoading}
         className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest ml-3 shrink-0 transition-all disabled:opacity-40 ${
          isDirty ? "bg-violet-600 text-white" : "ds-bg-3text-gray-400"
         }`}
        >
         {data?.isLoading ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
         {data?.isLoading ? "..." : isDirty ? "Buat" : "Tutup"}
        </button>
       </div>
       <div className="px-5 py-4 space-y-0">
        <div className="border-b ds-border py-3">
         <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Username</label>
         <input
          autoFocus type="text"
          placeholder="username"
          value={data?.username ?? ""}
          onChange={e => setData(p => ({ ...p, username: e.target.value }))}
          className="w-full bg-transparent outline-none font-bold text-sm ds-t1"
         />
        </div>
        <div className="py-3">
         <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Password</label>
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
