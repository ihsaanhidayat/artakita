"use client";
import { memo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit3, Check, Plus, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { THEME_GRADIENTS } from "@/lib/utils";
import { WALLET } from "@/lib/constants";
import ShareWallet from "@/components/ShareWallet";

const WalletModal = memo(function WalletModal({
  isOpen, onClose,
  wallets, activeWallet, session,
  onSelectWallet, onAddWallet, onDeleteWallet,
  onNotify,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [sharingId, setSharingId] = useState(null);
  const [sharedInfo, setSharedInfo] = useState({});

  // State Form Inline Tambah
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSavingNew, setIsSavingNew] = useState(false);

  // State khusus untuk Alur Hapus Dompet
  const [deleteStatus, setDeleteStatus] = useState({ id: null, loading: false, hasTrx: false, isDeleting: false });

  // Reset saat modal ditutup
  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setSharingId(null);
      setIsAdding(false);
      setNewName("");
      setDeleteStatus({ id: null, loading: false, hasTrx: false, isDeleting: false });
    }
  }, [isOpen]);

  // Fetch shared info
  useEffect(() => {
    if (!isOpen || !wallets?.length || !session?.user?.id) return;
    const fetchInfo = async () => {
      const info = {};
      for (const wallet of wallets) {
        const isOwner = session.user.id === wallet.user_id;
        try {
          if (isOwner) {
            const { data } = await supabase
              .from("wallet_members")
              .select("user_id")
              .eq("wallet_id", wallet.id)
              .neq("user_id", session.user.id)
              .limit(1)
              .single();
            if (data?.user_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("username")
                .eq("id", data.user_id)
                .single();
              info[wallet.id] = { type: "owner", with: profile?.username || data.user_id.slice(0, 8) };
            }
          } else {
            const { data } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", wallet.user_id)
              .single();
            info[wallet.id] = { type: "member", by: data?.username || String(wallet.user_id).slice(0, 8) };
          }
        } catch { }
      }
      setSharedInfo(info);
    };
    fetchInfo();
  }, [isOpen, wallets, session?.user?.id]);

  // Handler Edit Nama
  const handleSaveEdit = useCallback(async (walletId) => {
    if (!editName.trim()) return;
    setIsSaving(true);
    const { error } = await supabase.from("wallets").update({ name: editName.trim() }).eq("id", walletId);
    if (!error) {
      onNotify?.("Nama rekening berhasil diubah!", "success");
      if (activeWallet?.id === walletId) onSelectWallet({ id: walletId, name: editName.trim() });
    } else {
      onNotify?.("Gagal mengubah nama.", "error");
    }
    setIsSaving(false);
    setEditingId(null);
  }, [editName, activeWallet, onSelectWallet, onNotify]);

  // Handler Tambah Rekening (Inline)
  const handleAddNew = useCallback(async () => {
    if (!newName.trim()) return;
    setIsSavingNew(true);
    try {
      if (typeof onAddWallet === 'function') await onAddWallet(newName.trim());
      onNotify?.("Rekening berhasil ditambahkan!", "success");
      setIsAdding(false);
      setNewName("");
    } catch (err) {
      onNotify?.("Gagal menambahkan rekening.", "error");
    } finally {
      setIsSavingNew(false);
    }
  }, [newName, onAddWallet, onNotify]);

  // Handler Mulai Hapus (Mengecek Transaksi)
  const handleInitiateDelete = async (walletId) => {
    setDeleteStatus({ id: walletId, loading: true, hasTrx: false, isDeleting: false });

    const { count, error } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("wallet_id", walletId);

    setDeleteStatus({
      id: walletId,
      loading: false,
      hasTrx: count > 0 || !!error,
      isDeleting: false
    });
  };

  // Handler Eksekusi Hapus (Permanen & Bersih dari Sampah)
  const handleConfirmDelete = async (walletId) => {
    setDeleteStatus(prev => ({ ...prev, isDeleting: true }));

    try {
      // 1. HAPUS SEMUA TRANSAKSI TERKAIT DULU (Mencegah Data Sampah)
      if (deleteStatus.hasTrx) {
        const { error: trxError } = await supabase
          .from("transactions")
          .delete()
          .eq("wallet_id", walletId);

        if (trxError) throw trxError;
      }

      // 2. (Opsional) HAPUS MEMBER DOMPET JIKA ADA
      await supabase.from("wallet_members").delete().eq("wallet_id", walletId);

      // 3. BARU HAPUS DOMPET UTAMANYA
      const { error: walletError } = await supabase
        .from("wallets")
        .delete()
        .eq("id", walletId);

      if (walletError) throw walletError;

      // JIKA SUKSES HAPUS DARI DATABASE:
      onNotify?.("Rekening & seluruh datanya berhasil dihapus.", "success");

      // 4 & 5. PERPINDAHAN DOMPET & REFRESH OTOMATIS
      // Jika yang dihapus adalah dompet aktif, kita cari dompet pengganti
      if (activeWallet?.id === walletId) {
        const fallbackWallet = wallets.find(w => w.id !== walletId);
        if (fallbackWallet && typeof onSelectWallet === 'function') {
          onSelectWallet({ id: fallbackWallet.id, name: fallbackWallet.name });
        } else if (typeof onSelectWallet === 'function') {
          // Jika kosong semua, set aktif ke null
          onSelectWallet(null);
        }
      }

      // 6. TRIGGER PENGHAPUSAN DI LAYAR UTAMA (Mulus tanpa reload)
      if (typeof onDeleteWallet === 'function') {
        onDeleteWallet(walletId);
      }

    } catch (err) {
      console.error("Error saat menghapus:", err);
      // Mengambil pesan error aslinya agar tidak jadi [object Object]
      onNotify?.("Gagal menghapus: " + (err.message || "Terjadi kesalahan"), "error");
    } finally {
      // Tutup overlay loading
      setDeleteStatus({ id: null, loading: false, hasTrx: false, isDeleting: false });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md cursor-pointer"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-x-4 top-[15vh] z-[101] max-w-sm mx-auto bg-white dark:bg-[#121827] rounded-[32px] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800/60">
              <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                {WALLET.TITLE}
              </p>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800/50 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Share Wallet view */}
            <AnimatePresence>
              {sharingId && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white dark:bg-[#121827] z-30 rounded-[32px] p-6 overflow-y-auto"
                >
                  <button
                    onClick={() => setSharingId(null)}
                    className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 hover:text-blue-500 transition-colors"
                  >
                    ← Kembali
                  </button>
                  <ShareWallet
                    walletId={sharingId}
                    onClose={() => setSharingId(null)}
                    onSuccess={msg => { onNotify?.(msg, "success"); setSharingId(null); }}
                    onError={msg => onNotify?.(msg, "error")}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Wallet list */}
            <div className="px-4 py-3 space-y-2.5 max-h-[45vh] overflow-y-auto no-scrollbar relative z-10">
              {wallets.map((wallet, idx) => {
                const isActive = activeWallet?.id === wallet.id;
                const isOwner = session?.user?.id === wallet.user_id;
                const info = sharedInfo[wallet.id];
                const isEditing = editingId === wallet.id;
                const isDeleting = deleteStatus.id === wallet.id;

                let headerLabel = isOwner ? WALLET.PERSONAL : "Dompet Bersama";
                if (info?.type === "owner" && info.with) headerLabel = WALLET.SHARED_WITH(info.with);
                if (info?.type === "member" && info.by) headerLabel = WALLET.SHARED_BY(info.by);

                return (
                  // KUNCI 1: Menggunakan motion.div dengan properti "layout" agar bisa menyesuaikan tinggi dengan smooth
                  <motion.div
                    layout
                    key={wallet.id}
                    className={`relative overflow-hidden rounded-[20px] transition-all ${isActive && !isDeleting ? "ring-2 ring-blue-500 shadow-lg shadow-blue-500/15" : "ring-1 ring-gray-100 dark:ring-gray-800"
                      }`}
                  >
                    {/* Background Gradient (Tetap di belakang) */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${THEME_GRADIENTS[idx % THEME_GRADIENTS.length]}`} />
                    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-2xl" />

                    {/* KUNCI 2: Mode Wait akan mengganti tampilan Normal ke Hapus tanpa tumpang tindih */}
                    <AnimatePresence mode="wait">
                      {isDeleting ? (
                        <motion.div
                          key="delete-view"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                          // KUNCI 3: Menggunakan "relative" agar layout dompet terdorong oleh konten di dalamnya
                          className="relative z-20 bg-[#0a0f1c]/95 backdrop-blur-md p-5 border border-red-500/30 flex flex-col justify-center min-h-[140px]"
                        >
                          {deleteStatus.loading ? (
                            <div className="flex flex-col items-center justify-center gap-3 text-white/70 py-4">
                              <Loader2 size={24} className="animate-spin text-red-500" />
                              <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Memeriksa Data...</p>
                            </div>
                          ) : (
                            <div className="flex flex-col h-full justify-between">
                              <div className="flex gap-3 items-start">
                                <div className="p-2 bg-red-500/20 rounded-full shrink-0 mt-0.5">
                                  <AlertTriangle size={14} className="text-red-400" />
                                </div>
                                <div className="text-white/90">
                                  <p className="text-xs font-black text-red-400 mb-1.5">YAKIN HAPUS REKENING?</p>
                                  {deleteStatus.hasTrx ? (
                                    <p className="text-[11px] font-bold text-white/60 leading-relaxed">
                                      Rekening ini berisi transaksi. Menghapus rekening ini akan <strong className="text-white">menghilangkan seluruh transaksi tersebut</strong> secara permanen.
                                    </p>
                                  ) : (
                                    <p className="text-[11px] font-bold text-white/60">
                                      Tindakan ini tidak dapat dikembalikan.
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-2 mt-5">
                                <button
                                  onClick={() => setDeleteStatus({ id: null, loading: false, hasTrx: false, isDeleting: false })}
                                  disabled={deleteStatus.isDeleting}
                                  className="flex-[0.8] py-2.5 rounded-xl text-[11px] font-bold bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                                >
                                  Batal
                                </button>
                                <button
                                  onClick={() => handleConfirmDelete(wallet.id)}
                                  disabled={deleteStatus.isDeleting}
                                  className="flex-[1.2] py-2.5 rounded-xl text-[11px] font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 transition-all flex items-center justify-center gap-1.5"
                                >
                                  {deleteStatus.isDeleting ? <Loader2 size={12} className="animate-spin" /> : "Ya, Hapus!"}
                                </button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="normal-view"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                          className="relative z-10 p-4"
                        >
                          <p className="text-white/70 text-[9px] font-black uppercase tracking-[0.2em] mb-1.5">
                            {headerLabel}
                          </p>

                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                autoFocus
                                type="text"
                                value={editName}
                                onChange={e => { setEditName(e.target.value); setIsDirty(true); }}
                                onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(wallet.id); }}
                                className="flex-1 bg-white/20 backdrop-blur-sm text-white placeholder-white/50 font-bold text-sm rounded-xl px-3 py-1.5 outline-none border border-white/30 focus:border-white/60"
                              />
                              <button
                                onClick={() => handleSaveEdit(wallet.id)}
                                disabled={isSaving}
                                className="p-1.5 bg-white/20 hover:bg-white/40 rounded-xl text-white transition-colors disabled:opacity-50"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => { setEditingId(null); setIsDirty(false); }}
                                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-white/70 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => { onSelectWallet({ id: wallet.id, name: wallet.name }); onClose(); }}
                                className="flex items-center gap-2 flex-1 text-left"
                              >
                                <span className="text-white font-black text-lg tracking-tight">{wallet.name}</span>
                                {isActive && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-lg text-white text-[8px] font-black uppercase tracking-widest">
                                    <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                                    Aktif
                                  </span>
                                )}
                              </button>

                              {isOwner && (
                                <div className="flex gap-1.5 shrink-0">
                                  <button
                                    onClick={() => { setEditingId(wallet.id); setEditName(wallet.name); }}
                                    className="p-1.5 bg-white/20 hover:bg-white/40 rounded-xl text-white transition-colors"
                                    title="Ubah nama"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    onClick={() => setSharingId(wallet.id)}
                                    className="p-1.5 bg-white/20 hover:bg-white/40 rounded-xl text-white transition-colors"
                                    title="Bagikan akses"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleInitiateDelete(wallet.id)}
                                    className="p-1.5 bg-red-500/30 hover:bg-red-500/60 rounded-xl text-white transition-colors"
                                    title="Hapus rekening"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {/* Inline Add Wallet */}
            <div className="px-4 pt-2 pb-8 relative z-10">
              <AnimatePresence mode="wait">
                {!isAdding ? (
                  <motion.button
                    key="add-btn"
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}
                    onClick={() => setIsAdding(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-blue-500 hover:border-blue-500/50 hover:bg-blue-500/5 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all"
                  >
                    <Plus size={14} /> {WALLET.ADD_NEW || "Tambah Rekening Baru"}
                  </motion.button>
                ) : (
                  <motion.div
                    key="add-form"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="bg-gray-50 dark:bg-[#151b2b] rounded-[20px] p-4 border border-gray-200 dark:border-gray-800 overflow-hidden"
                  >
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
                      Nama Rekening Baru
                    </p>
                    <input
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleAddNew(); }}
                      placeholder="Contoh: BCA Pribadi"
                      className="w-full bg-white dark:bg-[#0a0f1c] text-gray-900 dark:text-white text-sm font-bold px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-800 focus:border-blue-500/50 outline-none transition-colors placeholder-gray-500 mb-3"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setIsAdding(false); setNewName(""); }}
                        className="flex-1 py-3 rounded-xl font-bold text-xs bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:text-white transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleAddNew}
                        disabled={isSavingNew || !newName.trim()}
                        className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${newName.trim()
                          ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30"
                          : "bg-gray-200 dark:bg-[#121827] border border-gray-300 dark:border-gray-800/60 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                          }`}
                      >
                        {isSavingNew ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Simpan"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default WalletModal;