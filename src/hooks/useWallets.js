import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export const useWallets = () => {
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
    const fetchWallets = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });
      
      if (data) setWallets(data);
    };
    
    fetchWallets();
  }, []);

  const addWallet = async (name) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesi tidak valid");

      const newWallet = {
        user_id: session.user.id,
        name: name
      };

      const { data, error } = await supabase.from('wallets').insert([newWallet]).select();
      if (error) throw error;
      
      if (data) {
        setWallets(prev => [...prev, data[0]]);
        return data[0]; // Kembalikan data dompet baru untuk langsung dipakai
      }
    } catch (error) {
      alert("Gagal menambah dompet: " + error.message);
      return null;
    }
  };

  const deleteWallet = async (id) => {
    const confirmDelete = window.confirm("Yakin hapus dompet ini? Pastikan tidak ada transaksi penting di dalamnya.");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from('wallets').delete().eq('id', id);
      if (error) throw error;
      setWallets(prev => prev.filter(w => w.id !== id));
    } catch(error) {
      alert("Gagal menghapus dompet: " + error.message);
    }
  };

  return { wallets, addWallet, deleteWallet };
};