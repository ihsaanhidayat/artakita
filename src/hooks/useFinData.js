import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useOfflineSync } from "@/hooks/useOfflineSync";

const DISPLAY_PAGE = 10; // Jumlah yang ditampilkan per halaman di UI

export const useFinData = (walletId) => {
  const [allTransactions, setAllTransactions] = useState([]); // SEMUA transaksi
  const [balance,         setBalance]         = useState(0);
  const [totalIncome,     setTotalIncome]      = useState(0);
  const [totalExpense,    setTotalExpense]     = useState(0);
  const [isLoading,       setIsLoading]        = useState(false);
  const [displayCount,    setDisplayCount]     = useState(DISPLAY_PAGE);

  const {
    isOnline, isSyncing, pendingCount,
    addToQueue, syncQueue, updateCache, getCached,
  } = useOfflineSync(walletId, () => {
    fetchAll();
  });

  // ── Fetch SEMUA transaksi sekaligus ──────────────────────────────────────
  // Tidak pakai pagination DB — pagination dilakukan di React side
  // Alasan: filter bulan/kategori/search dilakukan di client,
  // jadi harus punya semua data agar filter akurat
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
      updateCache(result.slice(0, 100)); // cache 100 terbaru

      // Hitung saldo
      let inc = 0, exp = 0;
      result.forEach(t => {
        if (t.type === "income") inc += Number(t.amount);
        else exp += Number(t.amount);
      });
      setTotalIncome(inc);
      setTotalExpense(exp);
      setBalance(inc - exp);

    } catch (err) {
      console.error("Gagal fetch transaksi:", err.message);
      // Fallback ke cache saat offline
      if (!navigator.onLine) {
        const cached = getCached();
        if (cached.length > 0) setAllTransactions(cached);
      }
    } finally {
      setIsLoading(false);
    }
  }, [walletId, updateCache, getCached]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!walletId) return;
    // Tampilkan cache dulu agar tidak blank
    const cached = getCached();
    if (cached.length > 0) setAllTransactions(cached);
    fetchAll();
    setDisplayCount(DISPLAY_PAGE); // reset display saat wallet berubah
  }, [walletId]);

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
          setAllTransactions(prev => {
            const exists = prev.some(t => t.id === payload.new.id);
            return exists ? prev : [payload.new, ...prev];
          });
        } else if (payload.eventType === "UPDATE") {
          setAllTransactions(prev => prev.map(t =>
            t.id === payload.new.id ? payload.new : t
          ));
        } else if (payload.eventType === "DELETE") {
          setAllTransactions(prev => prev.filter(t => t.id !== payload.old.id));
        }
        // Recalculate balance
        fetchAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [walletId]);

  // ── Recalculate balance saat allTransactions berubah ─────────────────────
  useEffect(() => {
    let inc = 0, exp = 0;
    allTransactions.forEach(t => {
      if (t.type === "income") inc += Number(t.amount);
      else exp += Number(t.amount);
    });
    setTotalIncome(inc);
    setTotalExpense(exp);
    setBalance(inc - exp);
  }, [allTransactions]);

  // ── Pagination di React side ──────────────────────────────────────────────
  // transactions = slice dari allTransactions untuk ditampilkan di HomeTab
  const transactions = allTransactions.slice(0, displayCount);
  const hasMore      = displayCount < allTransactions.length;
  const loadMore     = useCallback(() => {
    setDisplayCount(prev => prev + DISPLAY_PAGE);
  }, []);

  // ── Add ───────────────────────────────────────────────────────────────────
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

    if (!navigator.onLine) {
      const pending = addToQueue(payload);
      const optimistic = { ...payload, id: pending.id, created_at: pending.createdAt, _pending: true };
      setAllTransactions(prev => [optimistic, ...prev]);
      return optimistic;
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert([payload])
      .select()
      .single();

    if (error) {
      const pending = addToQueue(payload);
      const optimistic = { ...payload, id: pending.id, created_at: pending.createdAt, _pending: true };
      setAllTransactions(prev => [optimistic, ...prev]);
      return optimistic;
    }

    // Upload foto jika ada
    if (receiptFile && data) {
      try {
        const { uploadPhoto } = await import("@/lib/imageUtils");
        const path = `receipts/${session.user.id}/${data.id}.jpg`;
        const url  = await uploadPhoto(receiptFile, path, supabase);
        await supabase.from("transactions").update({ receipt_url: url }).eq("id", data.id);
        data.receipt_url = url;
      } catch (uploadErr) {
        console.error("Upload receipt gagal:", uploadErr.message);
      }
    }

    setAllTransactions(prev => {
      const exists = prev.some(t => t.id === data.id);
      return exists ? prev : [data, ...prev];
    });
    return data;
  }, [walletId, addToQueue]);

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
      const queue = JSON.parse(localStorage.getItem("arta_pending_queue") || "[]");
      localStorage.setItem("arta_pending_queue", JSON.stringify(queue.filter(q => q.id !== id)));
    } else {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    }
    setAllTransactions(prev => prev.filter(t => t.id !== id));
  }, [allTransactions]);

  // ── Update ────────────────────────────────────────────────────────────────
  const updateTransaction = useCallback(async (id, note, category, amount) => {
    const { error } = await supabase
      .from("transactions")
      .update({ note, category, amount: Number(amount) })
      .eq("id", id);
    if (error) throw error;
    setAllTransactions(prev =>
      prev.map(t => t.id === id ? { ...t, note, category, amount: Number(amount) } : t)
    );
  }, []);

  return {
    balance, totalIncome, totalExpense,
    transactions,        // slice untuk ditampilkan
    allTransactions,     // semua, untuk filter bulan/stats
    isLoading, hasMore, loadMore,
    isOnline, isSyncing, pendingCount,
    syncQueue,
    refetch: fetchAll,
  };
};
