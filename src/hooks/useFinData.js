"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useFinData(userId = "mock-user-1", walletId = "mock-wallet-1") {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClientData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: walletData, error: walletErr } = await supabase
        .from("wallets").select("balance").eq("id", walletId).single();

      if (walletErr && walletErr.code === "PGRST116") {
        await supabase.from("wallets").insert([{ id: walletId, user_id: userId, name: "Dompet Utama", balance: 5000000 }]);
        setBalance(5000000);
      } else if (walletData) {
        setBalance(Number(walletData.balance));
      }

      const { data: trxData } = await supabase
        .from("transactions").select("*").eq("wallet_id", walletId)
        .order("created_at", { ascending: false }).limit(20);

      if (trxData) setTransactions(trxData);
    } catch (error) {
      console.error("Sync Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClientData(); }, [walletId]);

  const addTransaction = async (parsedData) => {
    const { amount, note, category } = parsedData;
    const newTransaction = { user_id: userId, wallet_id: walletId, amount, type: "expense", category, note };
    const tempId = crypto.randomUUID();
    
    setTransactions((prev) => [{ id: tempId, ...newTransaction, created_at: new Date().toISOString() }, ...prev]);
    setBalance((prev) => prev - amount);

    if (!supabase) return;
    const { data, error } = await supabase.from("transactions").insert([newTransaction]).select().single();
    if (error) { fetchClientData(); } 
    else {
      setTransactions((prev) => prev.map((trx) => (trx.id === tempId ? data : trx)));
      await supabase.rpc("decrement_balance", { target_wallet_id: walletId, deduct_amount: amount });
    }
  };

  const deleteTransaction = async (trxId, amount) => {
    setTransactions((prev) => prev.filter((trx) => trx.id !== trxId));
    setBalance((prev) => prev + Number(amount));

    if (!supabase) return;
    const { error } = await supabase.from("transactions").delete().eq("id", trxId);
    if (error) fetchClientData();
    else await supabase.rpc("increment_balance", { target_wallet_id: walletId, refund_amount: amount });
  };

  // FUNGSI BARU: Update Transaksi (Note & Category)
  const updateTransaction = async (trxId, newNote, newCategory) => {
    // Update lokal (Optimistic)
    setTransactions((prev) => 
      prev.map(t => t.id === trxId ? { ...t, note: newNote, category: newCategory } : t)
    );

    if (!supabase) return;
    const { error } = await supabase
      .from("transactions")
      .update({ note: newNote, category: newCategory })
      .eq("id", trxId);

    if (error) {
      console.error("Update Error:", error);
      fetchClientData();
    }
  };

  return { balance, transactions, loading, addTransaction, deleteTransaction, updateTransaction, refresh: fetchClientData };
}