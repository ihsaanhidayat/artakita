import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useOfflineSync } from "@/hooks/useOfflineSync";

const DISPLAY_PAGE = 10;

export const useFinData = (walletId) => {
  const [allTransactions, setAllTransactions] = useState([]);
  const [balance,         setBalance]         = useState(0);
  const [totalIncome,     setTotalIncome]      = useState(0);
  const [totalExpense,    setTotalExpense]     = useState(0);
  const [isLoading,       setIsLoading]        = useState(false);
  const [displayCount,    setDisplayCount]     = useState(DISPLAY_PAGE);

  const { isOnline, isSyncing, pendingCount, addToQueue, syncQueue, updateCache, getCached } =
    useOfflineSync(walletId, () => { fetchAll(); });

  // ── Recalculate balance ───────────────────────────────────────────────────
  const recalc = useCallback((data) => {
    let inc = 0, exp = 0;
    (data || []).forEach(t => {
      if (t.type === "income") inc += Number(t.amount);
      else exp += Number(t.amount);
    });
    setTotalIncome(inc);
    setTotalExpense(exp);
    setBalance(inc - exp);
  }, []);

  // ── Fetch ALL transaksi sekaligus ─────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!walletId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, wallet_id, user_id, note, amount, category, type, created_at, receipt_url, debt_id")
        .eq("wallet_id", walletId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const result = data || [];
      setAllTransactions(result);
      recalc(result);
      updateCache(result.slice(0, 100));
    } catch (err) {
      console.error("Gagal fetch:", err.message);
      if (!navigator.onLine) {
        const cached = getCached();
        if (cached.length) { setAllTransactions(cached); recalc(cached); }
      }
    } finally {
      setIsLoading(false);
    }
  }, [walletId, updateCache, getCached, recalc]);

  // ── Load saat wallet berubah ──────────────────────────────────────────────
  useEffect(() => {
    if (!walletId) return;
    const cached = getCached();
    if (cached.length) { setAllTransactions(cached); recalc(cached); }
    fetchAll();
    setDisplayCount(DISPLAY_PAGE);
  }, [walletId]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!walletId) return;
    const channel = supabase
      .channel(`trx:${walletId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "transactions",
        filter: `wallet_id=eq.${walletId}`,
      }, () => { fetchAll(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [walletId, fetchAll]);

  // ── Pagination React-side ─────────────────────────────────────────────────
  const transactions = useMemo(() =>
    allTransactions.slice(0, displayCount),
    [allTransactions, displayCount]
  );
  const hasMore  = displayCount < allTransactions.length;
  const loadMore = useCallback(() => setDisplayCount(p => p + DISPLAY_PAGE), []);

  // ── Add ───────────────────────────────────────────────────────────────────
  const addTransaction = useCallback(async (
    note, amount, category, trxType = "expense",
    receiptFile = null, customDate = null
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Sesi login kedaluwarsa.");

    const payload = {
      user_id:    session.user.id,
      wallet_id:  walletId,
      note:       note.trim(),
      amount:     Number(amount),
      category,
      type:       trxType,
      // Backdate support
      ...(customDate ? { created_at: new Date(customDate).toISOString() } : {}),
    };

    // Langsung coba insert — jangan cek navigator.onLine karena tidak reliable
    // Kalau gagal (network error) baru masuk offline queue
    let data, error;
    try {
      const result = await supabase
        .from("transactions").insert([payload]).select().single();
      data  = result.data;
      error = result.error;
    } catch (networkErr) {
      // Network error nyata → masuk queue
      error = networkErr;
    }

    if (error) {
      // Cek apakah ini network error atau error lain (validasi, RLS, dll)
      const isNetworkErr = !navigator.onLine ||
        error?.message?.includes("fetch") ||
        error?.message?.includes("network") ||
        error?.message?.includes("Failed to fetch");

      if (isNetworkErr) {
        const pending = addToQueue(payload);
        const optimistic = { ...payload, id: pending.id, created_at: pending.createdAt, _pending: true };
        setAllTransactions(prev => [optimistic, ...prev]);
        recalc([optimistic, ...allTransactions]);
        return optimistic;
      }
      // Error bukan network (RLS, validasi) → throw agar ditangani UI
      throw new Error(error.message || "Gagal menyimpan transaksi");
    }

    // Upload foto jika ada
    if (receiptFile && data) {
      try {
        const { uploadPhoto } = await import("@/lib/imageUtils");
        const path = `receipts/${session.user.id}/${data.id}.jpg`;
        const url  = await uploadPhoto(receiptFile, path, supabase);
        await supabase.from("transactions").update({ receipt_url: url }).eq("id", data.id);
        data.receipt_url = url;
      } catch (err) {
        console.error("Upload foto gagal:", err.message);
      }
    }

    setAllTransactions(prev => {
      const updated = [data, ...prev.filter(t => t.id !== data.id)];
      recalc(updated);
      return updated;
    });
    return data;
  }, [walletId, allTransactions, addToQueue, recalc]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteTransaction = useCallback(async (id) => {
    const trx = allTransactions.find(t => t.id === id);
    if (trx?.receipt_url && !trx._pending) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { deletePhoto } = await import("@/lib/imageUtils");
        await deletePhoto(`receipts/${session.user.id}/${id}.jpg`, supabase).catch(() => {});
      }
    }
    if (trx?._pending) {
      const q = JSON.parse(localStorage.getItem("arta_pending_queue") || "[]");
      localStorage.setItem("arta_pending_queue", JSON.stringify(q.filter(x => x.id !== id)));
    } else {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    }
    setAllTransactions(prev => {
      const updated = prev.filter(t => t.id !== id);
      recalc(updated);
      return updated;
    });
  }, [allTransactions, recalc]);

  // ── Update ────────────────────────────────────────────────────────────────
  const updateTransaction = useCallback(async (id, note, category, amount) => {
    const { error } = await supabase
      .from("transactions")
      .update({ note, category, amount: Number(amount) })
      .eq("id", id);
    if (error) throw error;
    setAllTransactions(prev => {
      const updated = prev.map(t =>
        t.id === id ? { ...t, note, category, amount: Number(amount) } : t
      );
      recalc(updated);
      return updated;
    });
  }, [recalc]);

  return {
    balance, totalIncome, totalExpense,
    transactions,
    allTransactions,
    isLoading, hasMore, loadMore,
    isOnline, isSyncing, pendingCount,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    syncQueue,
    refetch: fetchAll,
  };
};
