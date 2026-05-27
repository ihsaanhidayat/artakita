import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export const useFinData = (walletId) => {
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  // --- 1. AMBIL DATA TRANSAKSI RIIL ---
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!walletId) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Gagal menarik data transaksi:", error.message);
      } else {
        setTransactions(data || []);
      }
    };

    fetchTransactions();
  }, [walletId]);

  // --- 2. KALKULASI SALDO ---
  useEffect(() => {
    let calcExpense = 0;
    let calcIncome = 0;

    transactions.forEach(t => {
      if (t.type === 'income') {
        calcIncome += Number(t.amount);
      } else if (t.type === 'expense' || !t.type) {
        calcExpense += Number(t.amount);
      }
    });

    setTotalIncome(calcIncome);
    setTotalExpense(calcExpense);
    setBalance(calcIncome - calcExpense);
  }, [transactions]);

  // --- 3. SIMPAN TRANSAKSI KE SUPABASE ---
  const addTransaction = async (note, amount, category, trxType = "expense") => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        alert("Sesi login kedaluwarsa. Silakan login kembali.");
        return;
      }

      const realUserId = session.user.id; 

      const newTrx = {
        user_id: realUserId,
        wallet_id: walletId,
        note: note,
        amount: Number(amount),
        category: category,
        type: trxType
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert([newTrx])
        .select();

      if (error) throw error;

      if (data) {
        setTransactions(prev => [data[0], ...prev]);
      }
    } catch (error) {
      throw error;
    }
  };

  // --- 4. HAPUS TRANSAKSI ---
  const deleteTransaction = async (id) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      alert("Gagal menghapus data: " + error.message);
    }
  };

  // --- 5. UPDATE TRANSAKSI (Sudah Mendukung Edit Nominal) ---
  const updateTransaction = async (id, note, category, amount) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ note, category, amount: Number(amount) })
        .eq('id', id);

      if (error) throw error;
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, note, category, amount: Number(amount) } : t));
    } catch (error) {
      alert("Gagal mengubah: " + error.message);
    }
  };

  // Baris return ini yang kemungkinan besar terhapus sebelumnya
  return { balance, totalIncome, totalExpense, transactions, addTransaction, deleteTransaction, updateTransaction };
};