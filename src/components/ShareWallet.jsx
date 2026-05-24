import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { Trash2, UserPlus, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShareWallet({ walletId }) {
  const [members, setMembers] = useState([]);
  const [newMemberId, setNewMemberId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (walletId) fetchMembers();
  }, [walletId]);

  const fetchMembers = async () => {
    const { data, error } = await supabase.from('wallet_members').select('*').eq('wallet_id', walletId);
    if (!error && data) setMembers(data);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberId.trim()) return;
    setLoading(true);

    const { error } = await supabase.from('wallet_members').insert([{ wallet_id: walletId, user_id: newMemberId, role: 'viewer' }]);
    setLoading(false);

    if (error) {
      alert("Gagal membagikan dompet: " + error.message);
    } else {
      setNewMemberId('');
      fetchMembers();
    }
  };

  const handleRemoveMember = async (memberId) => {
    const { error } = await supabase.from('wallet_members').delete().eq('id', memberId);
    if (!error) fetchMembers();
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl"><Users size={18} /></div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Akses Dompet</h3>
      </div>
      
      <form onSubmit={handleAddMember} className="flex gap-2 mb-6">
        <input 
          type="text" 
          placeholder="Masukkan UUID Pasangan..." 
          value={newMemberId}
          onChange={(e) => setNewMemberId(e.target.value)}
          required
          className="flex-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-gray-900 dark:text-white outline-none focus:border-indigo-500 text-sm font-bold"
        />
        <button type="submit" disabled={loading} className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center">
          <UserPlus size={20} />
        </button>
      </form>

      <div>
        <p className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.3em] mb-3">Member Terdaftar</p>
        <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
          <AnimatePresence>
            {members.length === 0 && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6 text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.3em] border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">Hanya Anda (Privat)</motion.p>
            )}
            {members.map(member => (
              <motion.div key={member.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="flex justify-between items-center p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800/50"
              >
                <span className="font-mono text-xs text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{member.user_id}</span>
                <button onClick={() => handleRemoveMember(member.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}