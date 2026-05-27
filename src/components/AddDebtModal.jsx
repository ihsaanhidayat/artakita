import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AddDebtModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ person: '', amount: '', type: 'debt', dueDate: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase.from('debts').insert([{
        user_id: session.user.id,
        wallet_id: localStorage.getItem("arta_active_wallet") ? JSON.parse(localStorage.getItem("arta_active_wallet")).id : null,
        person_name: formData.person,
        amount: parseFloat(formData.amount), // Bisa di-tweak pakai parseFlexibleNumber jika ingin smart input
        type: formData.type,
        due_date: formData.dueDate || null
      }]);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800/80 relative"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-widest">Catat Hutang/Piutang</h3>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800/50 rounded-full transition-colors"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Nama Orang</label>
                <input type="text" required value={formData.person} onChange={e => setFormData({...formData, person: e.target.value})} className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="Contoh: Budi" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Nominal</label>
                  <input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500" placeholder="100000" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Jenis</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500">
                    <option value="debt">Hutang (Saya)</option>
                    <option value="receivable">Piutang (Orang Lain)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Jatuh Tempo (Opsional)</label>
                <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500" />
              </div>

              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/30 mt-2">
                {isLoading ? "Menyimpan..." : "Simpan Catatan"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}