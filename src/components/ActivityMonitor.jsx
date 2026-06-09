"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { timeAgo } from "@/lib/utils";
import {
  Activity, RefreshCw, Crown, Clock, Search,
  ArrowUpDown, Check, Zap, Sun, CalendarDays, Moon,
} from "lucide-react";

const getBase = () => (typeof window !== "undefined" ? window.location.origin : "");

// ── Status berdasarkan aktivitas terakhir ──────────────────────────────────────
const STATUS = {
  online:  { label: "Online",      color: "var(--income)" },
  today:   { label: "Aktif",       color: "var(--a1)" },
  week:    { label: "Minggu ini",  color: "var(--a2)" },
  dormant: { label: "Tidak aktif", color: "var(--text-3)" },
  banned:  { label: "Nonaktif",    color: "var(--a3)" },
};

function getStatus(u) {
  if (u.banned) return "banned";
  const ref = u.last_activity_at || u.last_sign_in_at;
  if (!ref) return "dormant";
  const mins = (Date.now() - new Date(ref).getTime()) / 60000;
  if (mins < 10)         return "online";
  if (mins < 60 * 24)    return "today";
  if (mins < 60 * 24 * 7) return "week";
  return "dormant";
}

const SORTS = [
  { key: "activity",     label: "Aktivitas terakhir" },
  { key: "transactions", label: "Transaksi terbanyak" },
  { key: "name",         label: "Nama (A–Z)" },
];

export default function ActivityMonitor({ onNotify }) {
  const [users, setUsers]             = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [lastSync, setLastSync]       = useState(null);
  const [search, setSearch]           = useState("");
  const [sortKey, setSortKey]         = useState("activity");
  const [sortOpen, setSortOpen]       = useState(false);
  const [auto, setAuto]               = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setCurrentUserId(user.id); });
  }, []);

  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${getBase()}/api/admin/users`, {
        headers: { authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users || []);
      setLastSync(new Date());
    } catch (err) {
      onNotify?.("Gagal memuat aktivitas: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [onNotify]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Auto-refresh tiap 30 detik (silent)
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => fetchUsers(true), 30000);
    return () => clearInterval(id);
  }, [auto, fetchUsers]);

  // ── Ringkasan ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let online = 0, today = 0, week = 0, dormant = 0, totalTrx = 0;
    for (const u of users) {
      const s = getStatus(u);
      if (s === "online") online++;
      if (s === "online" || s === "today") today++;
      if (s === "online" || s === "today" || s === "week") week++;
      if (s === "dormant" || s === "banned") dormant++;
      totalTrx += u.activity_month || 0;
    }
    return { online, today, week, dormant, totalTrx };
  }, [users]);

  const maxMonth = useMemo(
    () => Math.max(1, ...users.map(u => u.activity_month || 0)),
    [users]
  );

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = users.filter(u => !q || u.username.toLowerCase().includes(q));
    return arr.sort((a, b) => {
      if (sortKey === "name")         return a.username.localeCompare(b.username);
      if (sortKey === "transactions") return (b.activity_month || 0) - (a.activity_month || 0);
      const ta = new Date(a.last_activity_at || a.last_sign_in_at || 0).getTime();
      const tb = new Date(b.last_activity_at || b.last_sign_in_at || 0).getTime();
      return tb - ta;
    });
  }, [users, search, sortKey]);

  const SUMMARY = [
    { key: "online", label: "Online",     value: stats.online,  Icon: Zap,          color: "var(--income)" },
    { key: "today",  label: "Hari Ini",   value: stats.today,   Icon: Sun,          color: "var(--a1)" },
    { key: "week",   label: "Minggu Ini", value: stats.week,    Icon: CalendarDays, color: "var(--a2)" },
    { key: "idle",   label: "Pasif",      value: stats.dormant, Icon: Moon,         color: "var(--text-3)" },
  ];

  return (
    <div className="space-y-4">

      {/* ── Live header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))", boxShadow: "0 6px 20px color-mix(in srgb, var(--a1) 30%, transparent)" }}>
            <Activity size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black ds-t1 uppercase tracking-widest leading-none">Monitor Aktivitas</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--income)", boxShadow: "0 0 6px var(--income)" }} />
              <p className="text-label font-bold ds-t3">
                {lastSync ? `Sinkron ${timeAgo(lastSync.toISOString(), "—")}` : "Memuat…"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAuto(a => !a)}
            className="px-2.5 h-9 rounded-xl border text-2xs font-black uppercase tracking-widest transition-all active:scale-95"
            style={auto
              ? { color: "var(--income)", background: "color-mix(in srgb, var(--income) 10%, transparent)", borderColor: "color-mix(in srgb, var(--income) 25%, transparent)" }
              : { color: "var(--text-3)", borderColor: "var(--border)" }}
            title="Auto-refresh 30 detik"
          >
            {auto ? "Live" : "Manual"}
          </button>
          <button
            onClick={() => fetchUsers()}
            disabled={isLoading}
            className="w-9 h-9 rounded-xl border ds-border ds-bg-1 ds-t3 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
            title="Muat ulang"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-4 gap-2">
        {SUMMARY.map(s => (
          <div key={s.key} className="ds-bg-1 border ds-border rounded-[18px] p-3 text-center shadow-sm">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1.5"
              style={{ background: `color-mix(in srgb, ${s.color} 14%, transparent)`, color: s.color }}>
              <s.Icon size={15} />
            </div>
            <p className="text-xl font-black leading-none" style={{ color: s.color }}>{s.value}</p>
            <p className="text-2xs font-black ds-t3 uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Search + sort ── */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 ds-bg-1 border ds-border rounded-xl px-3 h-10">
          <Search size={13} className="ds-t3 shrink-0" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari pengguna…"
            className="w-full bg-transparent outline-none text-xs font-bold ds-t1 placeholder:ds-t3"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setSortOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 h-10 ds-bg-1 border ds-border rounded-xl text-2xs font-black ds-t2 uppercase tracking-widest transition-all active:scale-95"
          >
            <ArrowUpDown size={12} />
          </button>
          <AnimatePresence>
            {sortOpen && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 top-full mt-1.5 w-52 ds-bg-1 border ds-border rounded-2xl shadow-xl z-50 overflow-hidden"
                >
                  <p className="text-2xs font-black ds-t3 uppercase tracking-widest px-3 pt-3 pb-1">Urutkan</p>
                  {SORTS.map(opt => (
                    <button key={opt.key}
                      onClick={() => { setSortKey(opt.key); setSortOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                      style={sortKey === opt.key
                        ? { color: "var(--a1)", background: "color-mix(in srgb, var(--a1) 10%, transparent)" }
                        : { color: "var(--text-1)" }}
                    >
                      <span className="text-xs font-bold flex-1">{opt.label}</span>
                      {sortKey === opt.key && <Check size={13} />}
                    </button>
                  ))}
                  <div className="h-1.5" />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── List ── */}
      {isLoading && users.length === 0 ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-[88px] ds-bg-3 rounded-[20px] animate-pulse" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 rounded-[24px] border border-dashed ds-border">
          <p className="text-caption font-black ds-t4 uppercase tracking-[0.3em]">Tidak ada pengguna</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {list.map((u, i) => {
            const s  = getStatus(u);
            const st = STATUS[s];
            const initial = (u.username?.[0] || "?").toUpperCase();
            const isSelf  = u.id === currentUserId;
            const barPct  = Math.round(((u.activity_month || 0) / maxMonth) * 100);

            return (
              <motion.div
                key={u.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.025, 0.25) }}
                className="ds-bg-1 border ds-border rounded-[20px] p-4 shadow-sm"
                style={u.banned ? { opacity: 0.65 } : undefined}
              >
                <div className="flex items-center gap-3.5">
                  {/* Avatar + online dot */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg"
                      style={{
                        background: `color-mix(in srgb, ${st.color} 14%, transparent)`,
                        color: st.color,
                        border: `1px solid color-mix(in srgb, ${st.color} 30%, transparent)`,
                      }}>
                      {initial}
                    </div>
                    {s === "online" && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                        style={{ background: "var(--income)", borderColor: "var(--bg-1)" }}>
                        <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "var(--income)", opacity: 0.55 }} />
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-black text-sm ds-t1 truncate">@{u.username}</p>
                      {u.role === "admin" && <Crown size={11} className="shrink-0" style={{ color: "rgb(245,158,11)" }} />}
                      {isSelf && <span className="text-2xs font-bold shrink-0" style={{ color: "var(--a1)" }}>(Anda)</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-label">
                      <Activity size={10} style={{ color: st.color }} />
                      <span className="font-bold ds-t2">
                        {u.last_activity_at ? timeAgo(u.last_activity_at) : "Belum ada transaksi"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-label ds-t3">
                      <Clock size={10} />
                      <span>Login {timeAgo(u.last_sign_in_at, "—")}</span>
                    </div>
                  </div>

                  {/* Status + counts */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-2xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ color: st.color, background: `color-mix(in srgb, ${st.color} 12%, transparent)` }}>
                      {st.label}
                    </span>
                    <div className="text-label ds-t3 text-right leading-tight">
                      <span><b className="ds-t1">{u.activity_today || 0}</b> hari ini</span>
                      <span className="mx-1 ds-t4">·</span>
                      <span><b className="ds-t1">{u.activity_week || 0}</b>/7h</span>
                    </div>
                  </div>
                </div>

                {/* Activity bar (30 hari) */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 ds-bg-3 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barPct}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${st.color}, color-mix(in srgb, ${st.color} 55%, transparent))` }}
                    />
                  </div>
                  <span className="text-2xs font-black ff-mono ds-t3 shrink-0">{u.activity_month || 0} trx/30h</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
