import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import type { Transaction, UseFinDataReturn } from "@/types";

const DISPLAY_PAGE = 10;

export const useFinData = (walletId: string | null): UseFinDataReturn => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance]                 = useState(0);
  const [totalIncome, setTotalIncome]         = useState(0);
  const [totalExpense, setTotalExpense]       = useState(0);
  const [isLoading, setIsLoading]             = useState(false);
  const [displayCount, setDisplayCount]       = useState(DISPLAY_PAGE);

  // Hoist refs before useOfflineSync so onSyncComplete can reference them cleanly
  const fetchAllRef          = useRef<() => Promise<void>>(async () => {});
  const allTransactionsRef   = useRef<Transaction[]>([]);

  const onSyncComplete = useCallback(() => { void fetchAllRef.current(); }, []);
  const { isOnline, isSyncing, pendingCount, addToQueue, syncQueue, updateCache, getCached } =
    useOfflineSync(walletId, onSyncComplete);

  const recalc = useCallback((data: Transaction[]): void => {
    let inc = 0, exp = 0;
    (data || []).forEach(t => {
      if (t.type === "income") inc += Number(t.amount);
      else exp += Number(t.amount);
    });
    setTotalIncome(inc);
    setTotalExpense(exp);
    setBalance(inc - exp);
  }, []);

  const fetchAll = useCallback(async (): Promise<void> => {
    if (!walletId) return;
    setIsLoading(true);
    try {
      // Parallel: recent 500 rows for display, all rows (type+amount only) for accurate balance
      const [displayRes, balanceRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("id, wallet_id, user_id, note, amount, category, type, created_at, receipt_url, debt_id")
          .eq("wallet_id", walletId)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("transactions")
          .select("type, amount")
          .eq("wallet_id", walletId),
      ]);
      if (displayRes.error) throw displayRes.error;

      const result = (displayRes.data || []) as Transaction[];
      setAllTransactions(result);
      updateCache(result.slice(0, 100));

      let inc = 0, exp = 0;
      ((balanceRes.data || []) as { type: string; amount: number }[]).forEach(t => {
        if (t.type === "income") inc += Number(t.amount);
        else exp += Number(t.amount);
      });
      setTotalIncome(inc);
      setTotalExpense(exp);
      setBalance(inc - exp);
    } catch (err) {
      console.error("Gagal fetch:", (err as Error).message);
      if (!navigator.onLine) {
        const cached = getCached();
        if (cached.length) { setAllTransactions(cached); recalc(cached); }
      }
    } finally {
      setIsLoading(false);
    }
  }, [walletId, updateCache, getCached, recalc]);

  // Keep refs in sync with latest values
  useEffect(() => { fetchAllRef.current = fetchAll; }, [fetchAll]);
  useEffect(() => { allTransactionsRef.current = allTransactions; }, [allTransactions]);

  useEffect(() => {
    if (!walletId) return;
    const cached = getCached();
    if (cached.length) { setAllTransactions(cached); recalc(cached); }
    void fetchAll();
    setDisplayCount(DISPLAY_PAGE);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletId]);

  useEffect(() => {
    if (!walletId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    const timer = setTimeout(() => {
      if (!active) return;
      try {
        channel = supabase
          .channel(`trx:${walletId}`)
          .on("postgres_changes", {
            event: "*", schema: "public", table: "transactions",
            filter: `wallet_id=eq.${walletId}`,
          }, () => { if (active) void fetchAllRef.current(); })
          .subscribe();
      } catch {
        // Channel already exists — ignore
      }
    }, 100);

    return () => {
      active = false;
      clearTimeout(timer);
      if (channel) supabase.removeChannel(channel).catch(() => {});
    };
  }, [walletId]);

  const transactions = useMemo(() =>
    allTransactions.slice(0, displayCount),
    [allTransactions, displayCount]
  );
  const hasMore = displayCount < allTransactions.length;
  const loadMore = useCallback(() => setDisplayCount(p => p + DISPLAY_PAGE), []);

  const addTransaction = useCallback(async (
    note: string,
    amount: number,
    category: string,
    trxType: "income" | "expense" = "expense",
    receiptFile: File | null = null,
    customDate: string | null = null
  ): Promise<Transaction> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Sesi login kedaluwarsa.");

    const payload = {
      user_id: session.user.id,
      wallet_id: walletId,
      note: note.trim(),
      amount: Number(amount),
      category,
      type: trxType,
      ...(customDate ? { created_at: new Date(customDate).toISOString() } : {}),
    };

    let data: Transaction | null = null;
    let error: Error | null = null;
    try {
      const result = await supabase
        .from("transactions").insert([payload]).select().single();
      data = result.data as Transaction | null;
      error = result.error as Error | null;
    } catch (networkErr) {
      error = networkErr as Error;
    }

    if (error) {
      const isNetworkErr = !navigator.onLine ||
        error?.message?.includes("fetch") ||
        error?.message?.includes("network") ||
        error?.message?.includes("Failed to fetch");

      if (isNetworkErr) {
        const pending = addToQueue({ ...payload, user_id: session.user.id, wallet_id: walletId ?? "", note: payload.note, amount: payload.amount, category: payload.category, type: trxType, receipt_url: null, debt_id: null });
        const optimistic: Transaction = {
          ...payload,
          id: pending.id,
          user_id: session.user.id,
          wallet_id: walletId ?? "",
          receipt_url: null,
          debt_id: null,
          created_at: pending.createdAt,
          _pending: true,
        };
        setAllTransactions(prev => {
          const updated = [optimistic, ...prev];
          recalc(updated);
          return updated;
        });
        return optimistic;
      }
      throw new Error(error.message || "Gagal menyimpan transaksi");
    }

    if (!data) throw new Error("Gagal menyimpan transaksi");

    if (receiptFile) {
      try {
        const { uploadPhoto } = await import("@/lib/imageUtils");
        const path = `receipts/${session.user.id}/${data.id}.jpg`;
        const url = await uploadPhoto(receiptFile, path, supabase);
        await supabase.from("transactions").update({ receipt_url: url }).eq("id", data.id);
        data.receipt_url = url;
      } catch (err) {
        console.error("Upload foto gagal:", (err as Error).message);
      }
    }

    setAllTransactions(prev => {
      const updated = [data!, ...prev.filter(t => t.id !== data!.id)];
      recalc(updated);
      return updated;
    });
    return data;
  }, [walletId, addToQueue, recalc]);

  const deleteTransaction = useCallback(async (id: string): Promise<void> => {
    // Read from ref — avoids capturing stale allTransactions in deps
    const trx = allTransactionsRef.current.find(t => t.id === id);
    if (trx?.receipt_url && !trx._pending) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { deletePhoto } = await import("@/lib/imageUtils");
        await deletePhoto(`receipts/${session.user.id}/${id}.jpg`, supabase).catch(() => {});
      }
    }
    if (trx?._pending) {
      const q = JSON.parse(localStorage.getItem("arta_pending_queue") || "[]") as { id: string }[];
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
  }, [recalc]);

  const updateTransaction = useCallback(async (
    id: string,
    note: string,
    category: string,
    amount: number,
    created_at?: string
  ): Promise<void> => {
    const updatePayload: Record<string, unknown> = { note, category, amount: Number(amount) };
    if (created_at) updatePayload.created_at = created_at;

    const { error } = await supabase
      .from("transactions")
      .update(updatePayload)
      .eq("id", id);
    if (error) throw error;
    setAllTransactions(prev => {
      const updated = prev.map(t =>
        t.id === id ? { ...t, ...updatePayload } as Transaction : t
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
