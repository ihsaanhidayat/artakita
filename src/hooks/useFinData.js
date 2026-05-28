import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { uploadPhoto, deletePhoto } from "@/lib/imageUtils";
import { useOfflineSync } from "@/hooks/useOfflineSync";

const PAGE_SIZE = 10;

export const useFinData = (walletId) => {
  const [transactions, setTransactions] = useState([]);
  const [balance,      setBalance]      = useState(0);
  const [totalIncome,  setTotalIncome]  = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [isLoading,    setIsLoading]    = useState(false);
  const [hasMore,      setHasMore]      = useState(false);
  const [page,         setPage]         = useState(0);

  const {
    isOnline, isSyncing, pendingCount,
    addToQueue, syncQueue, updateCache, getCached,
  } = useOfflineSync(walletId, (count) => {
    // Setelah sync berhasil, refresh data
    fetchPage(0);
    fetchBalance();
  });

  // ── Fetch transaksi dengan pagination ─────────────────────────────────────
  const fetchPage = useCallback(async (pageIndex = 0, append = false) => {
    if (!walletId) return;
    setIsLoading(true);
    try {
      const from = pageIndex * PAGE_SIZE;
      const to   = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("transactions")
        .select("id, wallet_id, user_id, note, amount, category, type, created_at, receipt_url, debt_id")
        .eq("wallet_id", walletId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const result = data || [];
      setHasMore(result.length === PAGE_SIZE);
      setTransactions(prev => {
        const merged = append ? [...prev, ...result] : result;
        return merged;
      });
      setPage(pageIndex);

      // Update cache dengan data fresh
      if (!append && result.length > 0) {
        updateCache(result);
      }
    } catch (err) {
      console.error("Gagal fetch transaksi:", err.message);
      // Fallback ke cache jika offline
      if (!navigator.onLine) {
        const cached = getCached();
        if (cached.length > 0 && !append) {
          setTransactions(cached);
          setHasMore(false);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [walletId, updateCache, getCached]);

  // ── Fetch saldo total (semua waktu) ────────────────────────────────────────
  const fetchBalance = useCallback(async () => {
    if (!walletId) return;
    try {
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
    } catch (err) {
      console.error("Gagal fetch balance:", err.message);
    }
  }, [walletId]);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!walletId) return;

    // Tampilkan cache dulu agar UI tidak kosong
    const cached = getCached();
    if (cached.length > 0) {
      setTransactions(cached);
    }

    fetchPage(0);
    fetchBalance();
  }, [walletId]);

  // ── Realtime subscription ──────────────────────────────────────────────────
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
        fetchBalance();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [walletId, fetchBalance]);

  // ── Load more ──────────────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    fetchPage(page + 1, true);
  }, [page, fetchPage]);

  // ── Add transaction ────────────────────────────────────────────────────────
  const addTransaction = useCallback(async (note, amount, category, trxType = "expense", receiptFile = null) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Sesi login kedaluwarsa.");

    const payload = {
      user_id:   session.user.id,
      wallet_id: walletId,
      note:      note.trim(),
      amount:    Number(amount),
      category,
      type:      trxType,
    };

    // Jika offline → masuk queue
    if (!navigator.onLine) {
      const pending = addToQueue(payload);
      // Tambah ke state lokal sebagai optimistic update
      const optimistic = { ...payload, id: pending.id, created_at: pending.createdAt, _pending: true };
      setTransactions(prev => [optimistic, ...prev]);
      return optimistic;
    }

    // Online → langsung ke DB
    const { data, error } = await supabase
      .from("transactions")
      .insert([payload])
      .select()
      .single();

    if (error) {
      // Gagal padahal online → masuk queue juga
      const pending = addToQueue(payload);
      const optimistic = { ...payload, id: pending.id, created_at: pending.createdAt, _pending: true };
      setTransactions(prev => [optimistic, ...prev]);
      return optimistic;
    }

    // Upload foto jika ada
    if (receiptFile && data) {
      try {
        const { uploadPhoto: upload } = await import("@/lib/imageUtils");
        const path = `receipts/${session.user.id}/${data.id}.jpg`;
        const url  = await upload(receiptFile, path, supabase);
        await supabase.from("transactions").update({ receipt_url: url }).eq("id", data.id);
        data.receipt_url = url;
      } catch (uploadErr) {
        console.error("Upload receipt gagal:", uploadErr.message);
      }
    }

    fetchBalance();
    return data;
  }, [walletId, addToQueue, fetchBalance]);

  // ── Delete transaction ─────────────────────────────────────────────────────
  const deleteTransaction = useCallback(async (id) => {
    const trx = transactions.find(t => t.id === id);

    // Hapus foto di storage jika ada
    if (trx?.receipt_url && !trx._pending) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const path = `receipts/${session.user.id}/${id}.jpg`;
        deletePhoto(path, supabase).catch(() => {});
      }
    }

    // Jika pending item → hapus dari queue saja
    if (trx?._pending) {
      const queue = JSON.parse(localStorage.getItem("arta_pending_queue") || "[]");
      localStorage.setItem("arta_pending_queue", JSON.stringify(queue.filter(q => q.id !== id)));
    } else {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    }

    setTransactions(prev => prev.filter(t => t.id !== id));
    fetchBalance();
  }, [transactions, fetchBalance]);

  // ── Update transaction ─────────────────────────────────────────────────────
  const updateTransaction = useCallback(async (id, note, category, amount) => {
    const { error } = await supabase
      .from("transactions")
      .update({ note, category, amount: Number(amount) })
      .eq("id", id);
    if (error) throw error;

    setTransactions(prev =>
      prev.map(t => t.id === id ? { ...t, note, category, amount: Number(amount) } : t)
    );
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance, totalIncome, totalExpense,
    transactions,
    isLoading, hasMore,
    isOnline, isSyncing, pendingCount,
    loadMore,
    addTransaction, deleteTransaction, updateTransaction,
    syncQueue,
    refetch: () => { fetchPage(0); fetchBalance(); },
  };
};
