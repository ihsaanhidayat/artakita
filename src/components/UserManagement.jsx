"use client";
import { useState, useEffect, useCallback } from "react";

// Selalu arahkan ke server yang benar — penting untuk akses dari HP/device lain
const getBase = () => typeof window !== "undefined" ? window.location.origin : "";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import {
  Users, Plus, RefreshCw, Trash2, ShieldOff, ShieldCheck,
  KeyRound, Clock, Crown, User, ChevronDown, X,
  AlertTriangle
} from "lucide-react";

// ── Helper ────────────────────────────────────────────────────────────────────
const timeAgo = (isoString) => {
  if (!isoString) return "Belum pernah login";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)   return "Baru saja";
  if (mins  < 60)  return `${mins} menit lalu`;
  if (hours < 24)  return `${hours} jam lalu`;
  if (days  < 30)  return `${days} hari lalu`;
  return new Date(isoString).toLocaleDateString("id-ID");
};

// ── Komponen Badge Role ───────────────────────────────────────────────────────
const RoleBadge = ({ role }) => (
  <span className={`flex items-center gap-2 text-2xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
    role === "admin"
      ? "bg-amber-500/10 border border-amber-500/20 text-amber-500"
      : "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ds-t3"
  }`}>
    {role === "admin" ? <Crown size={9} /> : <User size={9} />}
    {role}
  </span>
);

// ── Komponen Status Badge ─────────────────────────────────────────────────────
const StatusBadge = ({ banned, mustChange }) => {
  if (banned) return (
    <span className="flex items-center gap-2 text-2xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full border" style={{ color: "var(--a3)", background: "color-mix(in srgb, var(--a3) 12%, transparent)", borderColor: "color-mix(in srgb, var(--a3) 25%, transparent)" }}>
      <ShieldOff size={9} /> Nonaktif
    </span>
  );
  if (mustChange) return (
    <span className="flex items-center gap-2 text-2xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500">
      <KeyRound size={9} /> Ganti Password
    </span>
  );
  return (
    <span className="flex items-center gap-2 text-2xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full border" style={{ color: "var(--income)", background: "color-mix(in srgb, var(--income) 12%, transparent)", borderColor: "color-mix(in srgb, var(--income) 25%, transparent)" }}>
      <ShieldCheck size={9} /> Aktif
    </span>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function UserManagement({ onNotify }) {
  const [isExpanded, setIsExpanded]       = useState(false);
  const [users, setUsers]                 = useState([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Modal states
  const [addModal, setAddModal]           = useState({ open: false, username: "", password: "", loading: false });
  const [resetModal, setResetModal]       = useState({ open: false, userId: null, username: "", password: "", loading: false });
  const [inlineDeleteId, setInlineDeleteId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // userId yang sedang diproses

  // Ambil ID user yang sedang login (agar tidak bisa hapus/ban diri sendiri)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Kirim session token sebagai auth header
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        // Coba refresh session
        const { data: refreshed } = await supabase.auth.refreshSession();      }
      
      const token = session?.access_token;
      const res = await fetch(`${getBase()}/api/admin/users`, {
        headers: { 
          authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
    } catch (err) {
      onNotify?.("Gagal memuat data user: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [onNotify]);

  // Fetch saat panel dibuka
  useEffect(() => {
    if (isExpanded) fetchUsers();
  }, [isExpanded, fetchUsers]);

  // ── Tambah User ──────────────────────────────────────────────────────────
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (addModal.password.length < 6) {
      onNotify?.("Password minimal 6 karakter", "error");
      return;
    }
    setAddModal(p => ({ ...p, loading: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || tokenRef.current;
      const res = await fetch(`${getBase()}/api/admin/add-user`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: addModal.username, password: addModal.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onNotify?.(`User @${addModal.username} berhasil dibuat!`, "success");
      setAddModal({ open: false, username: "", password: "", loading: false });
      fetchUsers();
    } catch (err) {
      onNotify?.(err.message, "error");
      setAddModal(p => ({ ...p, loading: false }));
    }
  };

  // ── Reset Password ───────────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetModal.password.length < 6) {
      onNotify?.("Password minimal 6 karakter", "error");
      return;
    }
    setResetModal(p => ({ ...p, loading: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || tokenRef.current;
      const res = await fetch(`${getBase()}/api/admin/reset-password`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: resetModal.userId, newPassword: resetModal.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onNotify?.(`Password @${resetModal.username} berhasil direset!`, "success");
      setResetModal({ open: false, userId: null, username: "", password: "", loading: false });
      fetchUsers();
    } catch (err) {
      onNotify?.(err.message, "error");
      setResetModal(p => ({ ...p, loading: false }));
    }
  };

  // ── Hapus User ───────────────────────────────────────────────────────────
  const handleDeleteUser = async (userId) => {
    const user = users.find(u => u.id === userId);
    setActionLoading(userId);
    try {
      const res = await fetch(`${getBase()}/api/admin/delete-user`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onNotify?.(`User @${user?.username} berhasil dihapus.`, "success");
      setInlineDeleteId(null);
      fetchUsers();
    } catch (err) {
      onNotify?.(err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Ban / Unban ──────────────────────────────────────────────────────────
  const handleToggleBan = async (user) => {
    setActionLoading(user.id);
    const action = user.banned ? "unban" : "ban";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || tokenRef.current;
      const res = await fetch(`${getBase()}/api/admin/toggle-user`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onNotify?.(data.message, "success");
      fetchUsers();
    } catch (err) {
      onNotify?.(err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Statistik ────────────────────────────────────────────────────────────
  const totalUsers  = users.length;
  const activeUsers = users.filter(u => !u.banned).length;
  const adminUsers  = users.filter(u => u.role === "admin").length;

  return (
    <div className="bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl shadow-blue-500/5 border border-gray-100 dark:border-gray-800/60 w-full">

      {/* ── Header toggle ── */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center outline-none group"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 text-white rounded-2xl shadow-lg group-hover:scale-105 transition-transform" style={{ background: "linear-gradient(135deg, var(--a2), var(--a3))", boxShadow: "0 8px 24px color-mix(in srgb, var(--a2) 30%, transparent)" }}>
            <Users size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-black ds-t1 uppercase tracking-widest">
              Manajemen Pengguna
            </h3>
            <p className="text-caption font-bold ds-t3 mt-0.5">
              {isExpanded ? `${totalUsers} user terdaftar` : "Admin only"}
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gray-50 dark:bg-gray-800 p-2 rounded-full"
        >
          <ChevronDown size={20} className="ds-t3 group-hover:text-[var(--a2)] transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-6 space-y-4">

              {/* ── Stats pills ── */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Total",  value: totalUsers,  colorVar: "var(--a1)",      bgStyle: { background: "color-mix(in srgb, var(--a1) 12%, transparent)" } },
                  { label: "Aktif",  value: activeUsers, colorVar: "var(--income)",  bgStyle: { background: "color-mix(in srgb, var(--income) 12%, transparent)" } },
                  { label: "Admin",  value: adminUsers,  colorVar: "rgb(245,158,11)", bgStyle: { background: "rgba(245,158,11,0.12)" } },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl p-3 text-center" style={s.bgStyle}>
                    <p className="text-xl font-black" style={{ color: s.colorVar }}>{s.value}</p>
                    <p className="text-label font-black ds-t3 uppercase tracking-widest">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* ── Action buttons ── */}
              <div className="flex gap-2">
                <button
                  onClick={() => setAddModal({ open: true, username: "", password: "", loading: false })}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-white font-black text-caption uppercase tracking-widest rounded-2xl transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))" }}
                >
                  <Plus size={14} /> Tambah User
                </button>
                <button
                  onClick={fetchUsers}
                  disabled={isLoading}
                  className="p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 ds-t3 rounded-2xl transition-all disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                </button>
              </div>

              {/* ── User list ── */}
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-gray-50 dark:bg-gray-900/40 rounded-[20px] animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => {
                    const isSelf    = user.id === currentUserId;
                    const isWorking = actionLoading === user.id;

                    return (
                      <motion.div
                        key={user.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative overflow-hidden bg-gray-50 dark:bg-gray-900/40 border rounded-[20px] p-4 transition-all"
                        style={user.banned
                          ? { borderColor: "color-mix(in srgb, var(--a3) 28%, transparent)", opacity: 0.6 }
                          : { borderColor: "rgba(107,114,128,0.15)" }
                        }
                      >
                        {/* Row atas */}
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-black text-sm ds-t1">
                                @{user.username}
                                {isSelf && <span className="font-normal text-xs ml-1" style={{ color: "var(--a1)" }}>(Anda)</span>}
                              </p>
                              <RoleBadge role={user.role} />
                              <StatusBadge banned={user.banned} mustChange={user.must_change_password} />
                            </div>
                            <div className="flex items-center gap-2 text-label ds-t3">
                              <Clock size={9} />
                              <span>Login: {timeAgo(user.last_sign_in_at)}</span>
                            </div>
                            <div className="text-label ds-t3 mt-0.5">
                              Dibuat: {new Date(user.created_at).toLocaleDateString("id-ID")}
                            </div>
                          </div>

                          {/* Action buttons — tidak untuk diri sendiri */}
                          {!isSelf && (
                            <div className="flex gap-1.5 shrink-0">
                              {/* Reset Password */}
                              <button
                                onClick={() => setResetModal({ open: true, userId: user.id, username: user.username, password: "", loading: false })}
                                disabled={isWorking}
                                className="p-2 ds-t3 hover:text-[var(--a1)] bg-white dark:bg-gray-800 rounded-xl transition-colors disabled:opacity-40"
                                title="Reset Password"
                              >
                                <KeyRound size={14} />
                              </button>

                              {/* Ban / Unban */}
                              <button
                                onClick={() => handleToggleBan(user)}
                                disabled={isWorking}
                                className={`p-2 bg-white dark:bg-gray-800 rounded-xl transition-colors disabled:opacity-40 ${
                                  user.banned
                                    ? "ds-t3 hover:text-[var(--income)]"
                                    : "ds-t3 hover:text-amber-500"
                                }`}
                                title={user.banned ? "Aktifkan User" : "Nonaktifkan User"}
                              >
                                {isWorking
                                  ? <RefreshCw size={14} className="animate-spin" />
                                  : user.banned
                                  ? <ShieldCheck size={14} />
                                  : <ShieldOff size={14} />
                                }
                              </button>

                              {/* Hapus */}
                              <button
                                onClick={() => setInlineDeleteId(user.id)}
                                disabled={isWorking}
                                className="p-2 ds-t3 hover:text-fuchsia-400 bg-white dark:bg-gray-800 rounded-xl transition-colors disabled:opacity-40"
                                title="Hapus User"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      {/* Inline delete confirm overlay */}
                      <AnimatePresence>
                        {inlineDeleteId === user.id && (
                          <motion.div
                            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 280 }}
                            className="absolute inset-0 z-20 flex items-center justify-between px-5 backdrop-blur-md rounded-[20px]"
                            style={{
                              background: "color-mix(in srgb, var(--a3) 85%, var(--a2))",
                              borderLeft: "3px solid var(--a3)",
                              boxShadow: "inset 4px 0 20px color-mix(in srgb, var(--a3) 30%, transparent)",
                            }}
                          >
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <Trash2 size={15} className="text-white" />
                                <span className="text-[11px] font-black text-white uppercase tracking-widest">Hapus Permanen?</span>
                              </div>
                              <span className="text-[10px] text-white/70 ml-[23px]">@{user.username}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setInlineDeleteId(null)}
                                className="px-3 py-1.5 rounded-[10px] bg-white/20 text-white text-label font-black uppercase tracking-widest hover:bg-white/30 transition-colors"
                              >
                                Batal
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={actionLoading === user.id}
                                className="px-3 py-1.5 rounded-[10px] text-label font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                                style={{ background: "rgba(255,255,255,0.9)", color: "var(--a2)" }}
                              >
                                {actionLoading === user.id ? "..." : "Hapus"}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      </motion.div>
                    );
                  })}

                  {users.length === 0 && !isLoading && (
                    <div className="text-center py-8 text-caption font-black ds-t4 uppercase tracking-widest">
                      Belum ada user
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================
          MODALS
      ================================================================ */}

      {/* ── Modal Tambah User ── */}
      <AnimatePresence>
        {addModal.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black ds-t1 uppercase tracking-widest">Tambah User</h3>
                <button onClick={() => setAddModal(p => ({ ...p, open: false }))} className="p-2 ds-t3 hover:text-fuchsia-400 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-1.5">Username</label>
                  <input
                    type="text" required autoFocus
                    value={addModal.username}
                    onChange={e => setAddModal(p => ({ ...p, username: e.target.value.replace(/\s+/g, "").toLowerCase() }))}
                    placeholder="cth: budi, ani"
                    className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold ds-t1 outline-none focus:border-[var(--a1)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-1.5">Password Sementara</label>
                  <input
                    type="text" required
                    value={addModal.password}
                    onChange={e => setAddModal(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min. 6 karakter"
                    className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold ds-t1 outline-none focus:border-[var(--a1)] transition-all"
                  />
                </div>
                <p className="text-caption ds-t3 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl">
                  User akan diminta ganti password saat pertama login.
                </p>
                <button
                  type="submit" disabled={addModal.loading}
                  className="w-full disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all"
                  style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))" }}
                >
                  {addModal.loading ? "Memproses..." : "Buat Akun"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal Reset Password ── */}
      <AnimatePresence>
        {resetModal.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-black ds-t1 uppercase tracking-widest">Reset Password</h3>
                  <p className="text-caption ds-t3 mt-0.5">@{resetModal.username}</p>
                </div>
                <button onClick={() => setResetModal(p => ({ ...p, open: false }))} className="p-2 ds-t3 hover:text-fuchsia-400 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-1.5">Password Baru</label>
                  <input
                    type="text" required autoFocus
                    value={resetModal.password}
                    onChange={e => setResetModal(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min. 6 karakter"
                    className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold ds-t1 outline-none focus:border-[var(--a1)] transition-all"
                  />
                </div>
                <p className="text-caption ds-t3 bg-orange-500/5 border border-orange-500/20 p-3 rounded-xl flex gap-2">
                  <AlertTriangle size={12} className="text-orange-500 shrink-0 mt-0.5" />
                  User akan diminta ganti password saat login berikutnya.
                </p>
                <button
                  type="submit" disabled={resetModal.loading}
                  className="w-full disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all"
                  style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))" }}
                >
                  {resetModal.loading ? "Memproses..." : "Reset Password"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}
