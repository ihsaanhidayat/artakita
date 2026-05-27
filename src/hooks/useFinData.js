import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { z } from "zod";

// Skema Zod dipindahkan ke luar hook agar bisa diakses secara global
const transactionSchema = z.object({
  note: z.string().min(2, "Catatan minimal 2 karakter").max(100, "Catatan terlalu panjang"),
  amount: z.number().positive("Nominal tidak boleh minus atau nol!"),
  category: z.string().min(1, "Kategori tidak valid"),
  type: z.enum(['income', 'expense'], { required_error: "Tipe transaksi harus 'income' atau 'expense'" })
});

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
      // Data difilter dan divalidasi oleh Zod terlebih dahulu
      const validatedData = transactionSchema.parse({ 
        note, 
        amount: Number(amount), 
        category, 
        type: trxType 
      });

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        alert("Sesi login kedaluwarsa. Silakan login kembali.");
        return;
      }

      const newTrx = {
        user_id: session.user.id,
        wallet_id: walletId,
        note: validatedData.note,
        amount: validatedData.amount,
        category: validatedData.category,
        type: validatedData.type
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
      // Penanganan khusus untuk error Zod agar pesan rapi
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0].message);
      }
      throw error; // Lempar error Supabase ke fungsi pemanggil
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

  // --- 5. UPDATE TRANSAKSI ---
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

  return { balance, totalIncome, totalExpense, transactions, addTransaction, deleteTransaction, updateTransaction };
};