"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Transaction, UseOfflineSyncReturn, PendingQueueItem } from "@/types";

const QUEUE_KEY = "arta_pending_queue";
const CACHE_KEY = "arta_trx_cache";
const MAX_CACHE = 100;

const readQueue  = (): PendingQueueItem[] => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]") as PendingQueueItem[]; } catch { return []; } };
const writeQueue = (q: PendingQueueItem[]): void => { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {} };
const readCache  = (): Record<string, Transaction[]> => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as Record<string, Transaction[]>; } catch { return {}; } };
const writeCache = (c: Record<string, Transaction[]>): void => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {} };

export function useOfflineSync(
  walletId: string | null,
  onSyncComplete?: (count: number) => void
): UseOfflineSyncReturn {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing,    setIsSyncing]    = useState(false);
  const [isOnline,     setIsOnline]     = useState(true);
  const syncingRef = useRef(false);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!walletId) return;
    const q = readQueue().filter(i => i.walletId === walletId);
    setPendingCount(q.length);
    if (q.length > 0) setTimeout(() => { void syncQueue(); }, 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletId]);

  useEffect(() => {
    const handleOnline = (): void => {
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
      setIsOnline(true);
      void syncQueue();
    };
    const handleOffline = (): void => {
      offlineTimerRef.current = setTimeout(() => { setIsOnline(false); }, 3000);
    };
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletId]);

  const syncQueue = useCallback(async (): Promise<void> => {
    if (syncingRef.current) return;
    const queue = readQueue().filter(i => i.walletId === walletId);
    if (queue.length === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);

    const remaining: PendingQueueItem[] = [];
    let synced = 0;

    for (const item of queue) {
      try {
        const payload = {
          user_id:   item.user_id,
          wallet_id: item.walletId,
          note:      item.note,
          amount:    Number(item.amount),
          category:  item.category || "Lainnya",
          type:      item.type || "expense",
          ...(item.customDate ? { created_at: new Date(item.customDate).toISOString() } : {}),
        };

        const { error } = await supabase.from("transactions").insert([payload]);

        if (error) {
          console.error("Sync error:", error.message, "item:", item.id);
          const isNetworkErr = error.message?.includes("fetch") ||
            error.message?.includes("network") ||
            error.message?.includes("Failed");
          if (!isNetworkErr) {
            synced++;
          } else {
            remaining.push(item);
          }
        } else {
          synced++;
        }
      } catch {
        remaining.push(item);
      }
    }

    const allQueue = readQueue().filter(i => i.walletId !== walletId);
    writeQueue([...allQueue, ...remaining]);
    setPendingCount(remaining.length);
    setIsSyncing(false);
    syncingRef.current = false;
    if (synced > 0) onSyncComplete?.(synced);
  }, [walletId, onSyncComplete]);

  const addToQueue = useCallback((trx: Omit<Transaction, "id" | "created_at"> & { customDate?: string }): PendingQueueItem => {
    const item: PendingQueueItem = {
      id:        `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      walletId:  walletId ?? "",
      user_id:   trx.user_id,
      note:      trx.note,
      amount:    trx.amount,
      category:  trx.category,
      type:      trx.type,
      customDate: trx.customDate,
      createdAt: new Date().toISOString(),
    };
    writeQueue([...readQueue(), item]);
    setPendingCount(prev => prev + 1);
    return item;
  }, [walletId]);

  const updateCache = useCallback((transactions: Transaction[]): void => {
    if (!walletId || !transactions?.length) return;
    const cache = readCache();
    cache[walletId] = transactions.slice(0, MAX_CACHE);
    writeCache(cache);
  }, [walletId]);

  const getCached = useCallback((): Transaction[] => {
    if (!walletId) return [];
    return readCache()[walletId] || [];
  }, [walletId]);

  const clearCache = useCallback((): void => {
    if (!walletId) return;
    const cache = readCache();
    delete cache[walletId];
    writeCache(cache);
  }, [walletId]);

  return {
    isOnline, isSyncing, pendingCount,
    addToQueue, syncQueue,
    updateCache, getCached, clearCache,
  };
}
