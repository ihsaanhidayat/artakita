"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

const QUEUE_KEY   = "arta_pending_queue";
const CACHE_KEY   = "arta_trx_cache";
const MAX_CACHE   = 100;

// ── Helpers ───────────────────────────────────────────────────────────────────
const readQueue  = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; } };
const writeQueue = (q) => { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {} };
const readCache  = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; } };
const writeCache = (c) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {} };

/**
 * useOfflineSync
 * ──────────────
 * Mengelola:
 * 1. Offline queue  — transaksi yang gagal karena offline, retry saat online
 * 2. Cache lokal    — 100 transaksi terakhir per wallet sebagai read-only fallback
 *
 * Props:
 *  - walletId: string
 *  - onSyncComplete: (count: number) => void  — dipanggil setelah sync berhasil
 */
export function useOfflineSync(walletId, onSyncComplete) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing]       = useState(false);
  const [isOnline, setIsOnline]         = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const syncingRef = useRef(false);

  // ── Hitung pending saat mount ─────────────────────────────────────────────
  useEffect(() => {
    const q = readQueue().filter(item => item.walletId === walletId);
    setPendingCount(q.length);
  }, [walletId]);

  // ── Online/Offline listener ───────────────────────────────────────────────
  useEffect(() => {
    // Verifikasi koneksi nyata dengan ping ke Supabase
    const verifyOnline = async () => {
      try {
        // Ping ringan — hanya ambil 0 rows
        await supabase.from("profiles").select("id").limit(0);
        setIsOnline(true);
        void syncQueue();
      } catch {
        // Masih bisa false positive jika Supabase down
        // Tapi ini lebih reliable dari navigator.onLine
        setIsOnline(false);
      }
    };

    const handleOnline  = () => { void verifyOnline(); };
    // Tambah delay 2 detik sebelum declare offline
    // Menghindari false positive saat network switching
    let offlineTimer = null;
    const handleOffline = () => {
      offlineTimer = setTimeout(() => {
        if (!navigator.onLine) setIsOnline(false);
      }, 2000);
    };

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (offlineTimer) clearTimeout(offlineTimer);
    };
  }, [walletId]);

  // ── Sync queue ke Supabase ────────────────────────────────────────────────
  const syncQueue = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    const queue = readQueue().filter(item => item.walletId === walletId);
    if (queue.length === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);

    const remaining = [];
    let   synced    = 0;

    for (const item of queue) {
      try {
        const { error } = await supabase.from("transactions").insert([{
          user_id:   item.user_id,
          wallet_id: item.walletId,
          note:      item.note,
          amount:    item.amount,
          category:  item.category,
          type:      item.type,
        }]);

        if (error) {
          remaining.push(item); // Gagal, simpan ulang
        } else {
          synced++;
        }
      } catch {
        remaining.push(item);
      }
    }

    // Update queue — hapus yang sudah berhasil
    const allQueue = readQueue().filter(item => item.walletId !== walletId);
    writeQueue([...allQueue, ...remaining]);
    setPendingCount(remaining.length);

    setIsSyncing(false);
    syncingRef.current = false;

    if (synced > 0) onSyncComplete?.(synced);
  }, [walletId, onSyncComplete]);

  // ── Tambah ke queue (saat offline) ───────────────────────────────────────
  const addToQueue = useCallback((trx) => {
    const queue = readQueue();
    const item  = {
      id:        `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      walletId,
      ...trx,
      createdAt: new Date().toISOString(),
    };
    writeQueue([...queue, item]);
    setPendingCount(prev => prev + 1);
    return item;
  }, [walletId]);

  // ── Cache management ──────────────────────────────────────────────────────
  const updateCache = useCallback((transactions) => {
    if (!walletId || !transactions?.length) return;
    const cache = readCache();
    // Simpan max 100 transaksi terbaru per wallet
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

  // ── Pending items untuk wallet ini ───────────────────────────────────────
  const getPendingItems = useCallback(() => {
    return readQueue().filter(item => item.walletId === walletId);
  }, [walletId]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    addToQueue,
    syncQueue,
    updateCache,
    getCached,
    clearCache,
    getPendingItems,
  };
}
