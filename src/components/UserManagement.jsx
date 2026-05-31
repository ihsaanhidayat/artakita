"use client";
import { useState, useEffect, useCallback } from "react";

// Selalu arahkan ke server yang benar — penting untuk akses dari HP/device lain
const getBase = () => typeof window !== "undefined" ? window.location.origin : "";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import {
  Users, Plus, RefreshCw, Trash2, ShieldOff, ShieldCheck,
  KeyRound, Clock, Crown, User, ChevronDown, X, Check,
  AlertTriangle
} from "lucide-react";

// ── Helper ────────────────────────────────────────────────────────────────────
const timeAgo = (isoString) => {
  if (!isoString) return "Belum pernah login";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days < 30) return `${days} hari lalu`;
  return new Date(isoString).toLocaleDateString("id-ID");
};

// ── Komponen Badge Role ───────────────────────────────────────────────────────
const RoleBadge = ({ role }) => (
  <span className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${role === "admin"
      ? "bg-amber-500/10 border border-amber-500/20 text-amber-500"
      : "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500"
    }`}>
    {role === "admin" ? <Crown size={9} /> : <User size={9} />}
    {role}
  </span>
);

// ── Komponen Status Badge ─────────────────────────────────────────────────────
const StatusBadge = ({ banned, mustChange }) => {
  if (banned) return (
    <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500">
      <ShieldOff size={9} /> Nonaktif
    </span>
  );
  if (mustChange) return (
    <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500">
      <KeyRound size={9} /> Ganti Password
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500">
      <ShieldCheck size={9} /> Aktif
    </span>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function UserManagement({ onNotify }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Modal states
  const [addModal, setAddModal] = useState({ open: false, username: "", password: "", loading: false });
  const [resetModal, setResetModal] = useState({ open: false, userId: null, username: "", password: "", loading: false });
  const [deleteModal, setDeleteModal] = useState({ open: false, userId: null, username: "" });
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
      const res = await fetch(`${getBase()}/api/admin/users`, {
        headers: { authorization: `Bearer ${session?.access_token}` },
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
      const res = await fetch(`${getBase()}/api/admin/add-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`${getBase()}/api/admin/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  const handleDeleteUser = async () => {
    setActionLoading(deleteModal.userId);
    try {
      const res = await fetch(`${getBase()}/api/admin/delete-user`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteModal.userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onNotify?.(`User @${deleteModal.username} berhasil dihapus.`, "success");
      setDeleteModal({ open: false, userId: null, username: "" });
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
      const res = await fetch(`${getBase()}/api/admin/toggle-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  const totalUsers = users.length;
  const activeUsers = users.filter(u => !u.banned).length;
  const adminUsers = users.filter(u => u.role === "admin").length;

  return (
    <div className="bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl shadow-blue-500/5 border border-gray-100 dark:border-gray-800/60 w-full">

      {/* ── Header toggle ── */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center outline-none group"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl shadow-lg shadow-violet-500/30 group-hover:scale-105 transition-transform">
            <Users size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
              Manajemen Pengguna
            </h3>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-0.5">
              {isExpanded ? `${totalUsers} user terdaftar` : "Admin only"}
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gray-50 dark:bg-gray-800 p-2 rounded-full"
        >
          <ChevronDown size={20} className="text-gray-400 group-hover:text-violet-500 transition-colors" />
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
                  { label: "Total", value: totalUsers, color: "text-blue-500", bg: "bg-blue-500/10" },
                  { label: "Aktif", value: activeUsers, color: "text-green-500", bg: "bg-green-500/10" },
                  { label: "Admin", value: adminUsers, color: "text-amber-500", bg: "bg-amber-500/10" },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-2xl p-3 text-center`}>
                    <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* ── Action buttons ── */}
              <div className="flex gap-2">
                <button
                  onClick={() => setAddModal({ open: true, username: "", password: "", loading: false })}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-violet-500/30 active:scale-95"
                >
                  <Plus size={14} /> Tambah User
                </button>
                <button
                  onClick={fetchUsers}
                  disabled={isLoading}
                  className="p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 rounded-2xl transition-all disabled:opacity-50"
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
                    const isSelf = user.id === currentUserId;
                    const isWorking = actionLoading === user.id;

                    return (
                      <motion.div
                        key={user.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-gray-50 dark:bg-gray-900/40 border rounded-[20px] p-4 transition-all ${user.banned
                            ? "border-red-200 dark:border-red-900/30 opacity-60"
                            : "border-gray-100 dark:border-gray-800/50"
                          }`}
                      >
                        {/* Row atas */}
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-black text-sm text-gray-900 dark:text-white">
                                @{user.username}
                                {isSelf && <span className="text-blue-400 font-normal text-xs ml-1">(Anda)</span>}
                              </p>
                              <RoleBadge role={user.role} />
                              <StatusBadge banned={user.banned} mustChange={user.must_change_password} />
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-gray-400">
                              <Clock size={9} />
                              <span>Login: {timeAgo(user.last_sign_in_at)}</span>
                            </div>
                            <div className="text-[9px] text-gray-400 mt-0.5">
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
                                className="p-2 text-gray-400 hover:text-blue-500 bg-white dark:bg-gray-800 rounded-xl transition-colors disabled:opacity-40"
                                title="Reset Password"
                              >
                                <KeyRound size={14} />
                              </button>

                              {/* Ban / Unban */}
                              <button
                                onClick={() => handleToggleBan(user)}
                                disabled={isWorking}
                                className={`p-2 bg-white dark:bg-gray-800 rounded-xl transition-colors disabled:opacity-40 ${user.banned
                                    ? "text-gray-400 hover:text-green-500"
                                    : "text-gray-400 hover:text-orange-500"
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
                                onClick={() => setDeleteModal({ open: true, userId: user.id, username: user.username })}
                                disabled={isWorking}
                                className="p-2 text-gray-400 hover:text-red-500 bg-white dark:bg-gray-800 rounded-xl transition-colors disabled:opacity-40"
                                title="Hapus User"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}

                  {users.length === 0 && !isLoading && (
                    <div className="text-center py-8 text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-widest">
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
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Tambah User</h3>
                <button onClick={() => setAddModal(p => ({ ...p, open: false }))} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Username</label>
                  <input
                    type="text" required autoFocus
                    value={addModal.username}
                    onChange={e => setAddModal(p => ({ ...p, username: e.target.value.replace(/\s+/g, "").toLowerCase() }))}
                    placeholder="cth: budi, ani"
                    className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-violet-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Password Sementara</label>
                  <input
                    type="text" required
                    value={addModal.password}
                    onChange={e => setAddModal(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min. 6 karakter"
                    className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-violet-500 transition-all"
                  />
                </div>
                <p className="text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl">
                  User akan diminta ganti password saat pertama login.
                </p>
                <button
                  type="submit" disabled={addModal.loading}
                  className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-violet-500/30"
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
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Reset Password</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">@{resetModal.username}</p>
                </div>
                <button onClick={() => setResetModal(p => ({ ...p, open: false }))} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Password Baru</label>
                  <input
                    type="text" required autoFocus
                    value={resetModal.password}
                    onChange={e => setResetModal(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min. 6 karakter"
                    className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <p className="text-[10px] text-gray-400 bg-orange-500/5 border border-orange-500/20 p-3 rounded-xl flex gap-2">
                  <AlertTriangle size={12} className="text-orange-500 shrink-0 mt-0.5" />
                  User akan diminta ganti password saat login berikutnya.
                </p>
                <button
                  type="submit" disabled={resetModal.loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-500/30"
                >
                  {resetModal.loading ? "Memproses..." : "Reset Password"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal Konfirmasi Hapus ── */}
      <AnimatePresence>
        {deleteModal.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-red-100 dark:border-red-900/30 text-center"
            >
              <div className="w-14 h-14 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-red-500" size={24} />
              </div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-2">
                Hapus User?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                Akun <strong>@{deleteModal.username}</strong> akan dihapus permanen beserta semua data terkait. Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal({ open: false, userId: null, username: "" })}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={actionLoading === deleteModal.userId}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-red-500/30"
                >
                  {actionLoading === deleteModal.userId ? "Menghapus..." : "Hapus Permanen"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
