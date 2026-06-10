"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { timeAgo } from "@/lib/utils";
import {
  Users, Plus, RefreshCw, Trash2, ShieldOff, ShieldCheck,
  KeyRound, Clock, Crown, User, ChevronDown, X, AlertTriangle,
} from "lucide-react";
import type { AdminUser } from "@/types";

const getBase = (): string => (typeof window !== "undefined" ? window.location.origin : "");

// ── Sub-components ────────────────────────────────────────────────────────────

const RoleBadge = ({ role }: { role: string }) => (
  <span className={`flex items-center gap-2 text-2xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
    role === "admin"
      ? "bg-amber-500/10 border border-amber-500/20 text-amber-500"
      : "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ds-t3"
  }`}>
    {role === "admin" ? <Crown size={9} /> : <User size={9} />}
    {role}
  </span>
);

const StatusBadge = ({ banned, mustChange }: { banned: boolean; mustChange: boolean }) => {
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface AddModalState {
  open: boolean;
  username: string;
  password: string;
  loading: boolean;
}

interface ResetModalState {
  open: boolean;
  userId: string | null;
  username: string;
  password: string;
  loading: boolean;
}

interface ApiResponse {
  error?: string;
  message?: string;
  users?: AdminUser[];
}

interface UserManagementProps {
  onNotify?: (msg: string, type?: "success" | "error") => void;
  defaultExpanded?: boolean;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function UserManagement({ onNotify, defaultExpanded = false }: UserManagementProps) {
  const [isExpanded,     setIsExpanded]     = useState(defaultExpanded);
  const [users,          setUsers]          = useState<AdminUser[]>([]);
  const [isLoading,      setIsLoading]      = useState(false);
  const [currentUserId,  setCurrentUserId]  = useState<string | null>(null);
  const [addModal,       setAddModal]       = useState<AddModalState>({ open: false, username: "", password: "", loading: false });
  const [resetModal,     setResetModal]     = useState<ResetModalState>({ open: false, userId: null, username: "", password: "", loading: false });
  const [inlineDeleteId, setInlineDeleteId] = useState<string | null>(null);
  const [actionLoading,  setActionLoading]  = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const fetchUsers = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${getBase()}/api/admin/users`, {
        headers: { authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setUsers(data.users ?? []);
    } catch (err) {
      onNotify?.("Gagal memuat data user: " + (err as Error).message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    if (isExpanded) void fetchUsers();
  }, [isExpanded, fetchUsers]);

  const getToken = async (): Promise<string | undefined> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const handleAddUser = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (addModal.password.length < 6) { onNotify?.("Password minimal 6 karakter", "error"); return; }
    setAddModal(p => ({ ...p, loading: true }));
    try {
      const token = await getToken();
      const res = await fetch(`${getBase()}/api/admin/add-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: addModal.username, password: addModal.password }),
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      onNotify?.(`User @${addModal.username} berhasil dibuat!`, "success");
      setAddModal({ open: false, username: "", password: "", loading: false });
      void fetchUsers();
    } catch (err) {
      onNotify?.((err as Error).message, "error");
      setAddModal(p => ({ ...p, loading: false }));
    }
  };

  const handleResetPassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (resetModal.password.length < 6) { onNotify?.("Password minimal 6 karakter", "error"); return; }
    setResetModal(p => ({ ...p, loading: true }));
    try {
      const token = await getToken();
      const res = await fetch(`${getBase()}/api/admin/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: resetModal.userId, newPassword: resetModal.password }),
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      onNotify?.(`Password @${resetModal.username} berhasil direset!`, "success");
      setResetModal({ open: false, userId: null, username: "", password: "", loading: false });
      void fetchUsers();
    } catch (err) {
      onNotify?.((err as Error).message, "error");
      setResetModal(p => ({ ...p, loading: false }));
    }
  };

  const handleDeleteUser = async (userId: string): Promise<void> => {
    const user = users.find(u => u.id === userId);
    setActionLoading(userId);
    try {
      const token = await getToken();
      const res = await fetch(`${getBase()}/api/admin/delete-user`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      onNotify?.(`User @${user?.username} berhasil dihapus.`, "success");
      setInlineDeleteId(null);
      void fetchUsers();
    } catch (err) {
      onNotify?.((err as Error).message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBan = async (user: AdminUser): Promise<void> => {
    setActionLoading(user.id);
    const action = user.banned ? "unban" : "ban";
    try {
      const token = await getToken();
      const res = await fetch(`${getBase()}/api/admin/toggle-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id, action }),
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      onNotify?.(data.message ?? "Berhasil", "success");
      void fetchUsers();
    } catch (err) {
      onNotify?.((err as Error).message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const totalUsers  = users.length;
  const activeUsers = users.filter(u => !u.banned).length;
  const adminUsers  = users.filter(u => u.role === "admin").length;

  return (
    <div className="bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl shadow-blue-500/5 border border-gray-100 dark:border-gray-800/60 w-full">

      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex justify-between items-center outline-none group">
        <div className="flex items-center gap-4">
          <div className="p-3 text-white rounded-2xl shadow-lg group-hover:scale-105 transition-transform" style={{ background: "linear-gradient(135deg, var(--a2), var(--a3))", boxShadow: "0 8px 24px color-mix(in srgb, var(--a2) 30%, transparent)" }}>
            <Users size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-black ds-t1 uppercase tracking-widest">Manajemen Pengguna</h3>
            <p className="text-caption font-bold ds-t3 mt-0.5">
              {isExpanded ? `${totalUsers} user terdaftar` : "Admin only"}
            </p>
          </div>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }} className="bg-gray-50 dark:bg-gray-800 p-2 rounded-full">
          <ChevronDown size={20} className="ds-t3 group-hover:text-[var(--a2)] transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="pt-6 space-y-4">

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Total",  value: totalUsers,  colorVar: "var(--a1)",       bgStyle: { background: "color-mix(in srgb, var(--a1) 12%, transparent)" } },
                  { label: "Aktif",  value: activeUsers, colorVar: "var(--income)",   bgStyle: { background: "color-mix(in srgb, var(--income) 12%, transparent)" } },
                  { label: "Admin",  value: adminUsers,  colorVar: "rgb(245,158,11)", bgStyle: { background: "rgba(245,158,11,0.12)" } },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl p-3 text-center" style={s.bgStyle}>
                    <p className="text-xl font-black" style={{ color: s.colorVar }}>{s.value}</p>
                    <p className="text-label font-black ds-t3 uppercase tracking-widest">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setAddModal({ open: true, username: "", password: "", loading: false })}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-white font-black text-caption uppercase tracking-widest rounded-2xl transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))" }}
                >
                  <Plus size={14} /> Tambah User
                </button>
                <button onClick={() => void fetchUsers()} disabled={isLoading} className="p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 ds-t3 rounded-2xl transition-all disabled:opacity-50">
                  <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                </button>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-50 dark:bg-gray-900/40 rounded-[20px] animate-pulse" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map(user => {
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
                          : { borderColor: "rgba(107,114,128,0.15)" }}
                      >
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

                          {!isSelf && (
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => setResetModal({ open: true, userId: user.id, username: user.username, password: "", loading: false })}
                                disabled={isWorking}
                                className="p-2 ds-t3 hover:text-[var(--a1)] bg-white dark:bg-gray-800 rounded-xl transition-colors disabled:opacity-40"
                              >
                                <KeyRound size={14} />
                              </button>
                              <button
                                onClick={() => void handleToggleBan(user)}
                                disabled={isWorking}
                                className={`p-2 bg-white dark:bg-gray-800 rounded-xl transition-colors disabled:opacity-40 ${user.banned ? "ds-t3 hover:text-[var(--income)]" : "ds-t3 hover:text-amber-500"}`}
                              >
                                {isWorking ? <RefreshCw size={14} className="animate-spin" /> : user.banned ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                              </button>
                              <button
                                onClick={() => setInlineDeleteId(user.id)}
                                disabled={isWorking}
                                className="p-2 ds-t3 hover:text-fuchsia-400 bg-white dark:bg-gray-800 rounded-xl transition-colors disabled:opacity-40"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>

                        <AnimatePresence>
                          {inlineDeleteId === user.id && (
                            <motion.div
                              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                              transition={{ type: "spring", damping: 25, stiffness: 280 }}
                              className="absolute inset-0 z-20 flex items-center justify-between px-5 backdrop-blur-md rounded-[20px]"
                              style={{ background: "color-mix(in srgb, var(--a3) 85%, var(--a2))", borderLeft: "3px solid var(--a3)" }}
                            >
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <Trash2 size={15} className="text-white" />
                                  <span className="text-[11px] font-black text-white uppercase tracking-widest">Hapus Permanen?</span>
                                </div>
                                <span className="text-[10px] text-white/70 ml-[23px]">@{user.username}</span>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => setInlineDeleteId(null)} className="px-3 py-1.5 rounded-[10px] bg-white/20 text-white text-label font-black uppercase tracking-widest hover:bg-white/30 transition-colors">
                                  Batal
                                </button>
                                <button
                                  onClick={() => void handleDeleteUser(user.id)}
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

      {/* ── Modal Tambah User ── */}
      <AnimatePresence>
        {addModal.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black ds-t1 uppercase tracking-widest">Tambah User</h3>
                <button onClick={() => setAddModal(p => ({ ...p, open: false }))} className="p-2 ds-t3 hover:text-fuchsia-400 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors"><X size={16} /></button>
              </div>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-1.5">Username</label>
                  <input type="text" required autoFocus value={addModal.username} onChange={e => setAddModal(p => ({ ...p, username: e.target.value.replace(/\s+/g, "").toLowerCase() }))} placeholder="cth: budi, ani" className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold ds-t1 outline-none focus:border-[var(--a1)] transition-all" />
                </div>
                <div>
                  <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-1.5">Password Sementara</label>
                  <input type="text" required value={addModal.password} onChange={e => setAddModal(p => ({ ...p, password: e.target.value }))} placeholder="Min. 6 karakter" className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold ds-t1 outline-none focus:border-[var(--a1)] transition-all" />
                </div>
                <p className="text-caption ds-t3 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl">User akan diminta ganti password saat pertama login.</p>
                <button type="submit" disabled={addModal.loading} className="w-full disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all" style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))" }}>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-black ds-t1 uppercase tracking-widest">Reset Password</h3>
                  <p className="text-caption ds-t3 mt-0.5">@{resetModal.username}</p>
                </div>
                <button onClick={() => setResetModal(p => ({ ...p, open: false }))} className="p-2 ds-t3 hover:text-fuchsia-400 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors"><X size={16} /></button>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-1.5">Password Baru</label>
                  <input type="text" required autoFocus value={resetModal.password} onChange={e => setResetModal(p => ({ ...p, password: e.target.value }))} placeholder="Min. 6 karakter" className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold ds-t1 outline-none focus:border-[var(--a1)] transition-all" />
                </div>
                <p className="text-caption ds-t3 bg-orange-500/5 border border-orange-500/20 p-3 rounded-xl flex gap-2">
                  <AlertTriangle size={12} className="text-orange-500 shrink-0 mt-0.5" />
                  User akan diminta ganti password saat login berikutnya.
                </p>
                <button type="submit" disabled={resetModal.loading} className="w-full disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all" style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))" }}>
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
