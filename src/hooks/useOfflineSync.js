"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

const QUEUE_KEY = "arta_pending_queue";
const CACHE_KEY = "arta_trx_cache";
const MAX_CACHE = 100;

const readQueue  = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; } };
const writeQueue = (q) => { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {} };
const readCache  = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; } };
const writeCache = (c) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {} };

export function useOfflineSync(walletId, onSyncComplete) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing,    setIsSyncing]    = useState(false);
  const [isOnline,     setIsOnline]     = useState(true); // optimistic default
  const syncingRef = useRef(false);
  const offlineTimerRef = useRef(null);

  // Hitung pending saat mount
  useEffect(() => {
    if (!walletId) return;
    const q = readQueue().filter(i => i.walletId === walletId);
    setPendingCount(q.length);
    // Auto-sync saat mount jika ada pending
    if (q.length > 0) setTimeout(() => syncQueue(), 1000);
  }, [walletId]);

  // Online/offline listener — dengan delay untuk hindari false positive
  useEffect(() => {
    const handleOnline = () => {
      clearTimeout(offlineTimerRef.current);
      setIsOnline(true);
      void syncQueue();
    };
    const handleOffline = () => {
      // Tunggu 3 detik sebelum declare offline
      offlineTimerRef.current = setTimeout(() => {
        setIsOnline(false);
      }, 3000);
    };
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearTimeout(offlineTimerRef.current);
    };
  }, [walletId]);

  // ── Sync queue ke Supabase ────────────────────────────────────────────────
  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    const queue = readQueue().filter(i => i.walletId === walletId);
    if (queue.length === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);

    const remaining = [];
    let synced = 0;

    for (const item of queue) {
      try {
        // Bersihkan field yang tidak perlu / bisa menyebabkan error
        const payload = {
          user_id:   item.user_id,
          wallet_id: item.walletId,
          note:      item.note,
          amount:    Number(item.amount),
          category:  item.category || "Lainnya",
          type:      item.type || "expense",
        };
        // Tambah created_at hanya jika ada dan valid
        if (item.customDate) {
          payload.created_at = new Date(item.customDate).toISOString();
        }

        const { error } = await supabase.from("transactions").insert([payload]);

        if (error) {
          console.error("Sync error:", error.message, "item:", item.id);
          // Jika error bukan network (RLS, validasi) → buang item, jangan retry selamanya
          const isNetworkErr = error.message?.includes("fetch") ||
            error.message?.includes("network") ||
            error.message?.includes("Failed");
          if (!isNetworkErr) {
            synced++; // Anggap selesai — jangan stuck
          } else {
            remaining.push(item);
          }
        } else {
          synced++;
        }
      } catch (err) {
        // Network error → retry nanti
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

  // ── Tambah ke queue ───────────────────────────────────────────────────────
  const addToQueue = useCallback((trx) => {
    const item = {
      id:        `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      walletId,
      ...trx,
      createdAt: new Date().toISOString(),
    };
    writeQueue([...readQueue(), item]);
    setPendingCount(prev => prev + 1);
    return item;
  }, [walletId]);

  // ── Cache management ──────────────────────────────────────────────────────
  const updateCache = useCallback((transactions) => {
    if (!walletId || !transactions?.length) return;
    const cache = readCache();
    cache[walletId] = transactions.slice(0, MAX_CACHE);
    writeCache(cache);
  }, [walletId]);

  const getCached = useCallback(() => {
    if (!walletId) return [];
    return readCache()[walletId] || [];
  }, [walletId]);

  const clearCache = useCallback(() => {
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
