import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { uploadPhoto, deletePhoto } from "@/lib/imageUtils";
import { z } from "zod";

const PAGE_SIZE = 10;

const transactionSchema = z.object({
  note:     z.string().min(2, "Catatan minimal 2 karakter").max(100),
  amount:   z.number().positive("Nominal tidak boleh minus atau nol!"),
  category: z.string().min(1, "Kategori tidak valid"),
  type:     z.enum(["income", "expense"]),
});

export const useFinData = (walletId) => {
  const [transactions, setTransactions] = useState([]);
  const [balance,      setBalance]      = useState(0);
  const [totalIncome,  setTotalIncome]  = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [isLoading,    setIsLoading]    = useState(false);
  const [hasMore,      setHasMore]      = useState(false);
  const [page,         setPage]         = useState(0);

  // ── Fetch dengan pagination ───────────────────────────────────────────────
  const fetchPage = useCallback(async (pageIndex = 0, append = false) => {
    if (!walletId) return;
    setIsLoading(true);
    try {
      const from = pageIndex * PAGE_SIZE;
      const to   = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("wallet_id", walletId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      setHasMore((data?.length || 0) === PAGE_SIZE);
      setTransactions(prev => append ? [...prev, ...(data || [])] : (data || []));
      setPage(pageIndex);
    } catch (err) {
      console.error("Gagal fetch transaksi:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [walletId]);

  // ── Fetch saldo (semua waktu, tanpa pagination) ───────────────────────────
  const fetchBalance = useCallback(async () => {
    if (!walletId) return;
    const { data } = await supabase
      .from("transactions")
      .select("amount, type")
      .eq("wallet_id", walletId);

    if (!data) return;
    let inc = 0, exp = 0;
    data.forEach(t => {
      if (t.type === "income") inc += Number(t.amount);
      else exp += Number(t.amount);
    });
    setTotalIncome(inc);
    setTotalExpense(exp);
    setBalance(inc - exp);
  }, [walletId]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!walletId) return;
    fetchPage(0);
    fetchBalance();
  }, [walletId, fetchPage, fetchBalance]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!walletId) return;

    const channel = supabase
      .channel(`transactions:wallet:${walletId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "transactions",
        filter: `wallet_id=eq.${walletId}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setTransactions(prev => {
            const exists = prev.some(t => t.id === payload.new.id);
            return exists ? prev : [payload.new, ...prev];
          });
        } else if (payload.eventType === "UPDATE") {
          setTransactions(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
        } else if (payload.eventType === "DELETE") {
          setTransactions(prev => prev.filter(t => t.id !== payload.old.id));
        }
        // Recalculate balance on any change
        fetchBalance();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [walletId, fetchBalance]);

  // ── Load more ─────────────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    fetchPage(page + 1, true);
  }, [page, fetchPage]);

  // ── Add transaction ───────────────────────────────────────────────────────
  const addTransaction = async (note, amount, category, trxType = "expense", receiptFile = null) => {
    const validated = transactionSchema.parse({
      note, amount: Number(amount), category, type: trxType,
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Sesi login kedaluwarsa.");

    // Insert dulu, dapat ID
    const { data, error } = await supabase
      .from("transactions")
      .insert([{
        user_id:   session.user.id,
        wallet_id: walletId,
        note:      validated.note,
        amount:    validated.amount,
        category:  validated.category,
        type:      validated.type,
      }])
      .select()
      .single();

    if (error) throw error;

    // Upload foto jika ada
    if (receiptFile && data) {
      try {
        const path = `receipts/${session.user.id}/${data.id}.jpg`;
        const url  = await uploadPhoto(receiptFile, path, supabase);
        await supabase.from("transactions").update({ receipt_url: url }).eq("id", data.id);
        data.receipt_url = url;
      } catch (uploadErr) {
        console.error("Upload receipt gagal:", uploadErr.message);
        // Transaksi tetap berhasil meski foto gagal
      }
    }

    fetchBalance();
    return data;
  };

  // ── Delete transaction ────────────────────────────────────────────────────
  const deleteTransaction = async (id) => {
    // Hapus foto di storage jika ada
    const trx = transactions.find(t => t.id === id);
    if (trx?.receipt_url) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const path = `receipts/${session.user.id}/${id}.jpg`;
        await deletePhoto(path, supabase).catch(() => {}); // ignore error
      }
    }

    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) throw error;

    setTransactions(prev => prev.filter(t => t.id !== id));
    fetchBalance();
  };

  // ── Update transaction ────────────────────────────────────────────────────
  const updateTransaction = async (id, note, category, amount) => {
    const { error } = await supabase
      .from("transactions")
      .update({ note, category, amount: Number(amount) })
      .eq("id", id);
    if (error) throw error;

    setTransactions(prev =>
      prev.map(t => t.id === id ? { ...t, note, category, amount: Number(amount) } : t)
    );
    fetchBalance();
  };

  return {
    balance, totalIncome, totalExpense,
    transactions,
    isLoading, hasMore,
    loadMore,
    addTransaction, deleteTransaction, updateTransaction,
    refetch: () => { fetchPage(0); fetchBalance(); },
  };
};
