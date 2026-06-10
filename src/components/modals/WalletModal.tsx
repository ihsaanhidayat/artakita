"use client";
import { memo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit3, Check, Plus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { THEME_GRADIENTS } from "@/lib/utils";
import { WALLET } from "@/lib/constants";
import ShareWallet from "@/components/ShareWallet";
import type { Wallet, ActiveWallet } from "@/types";
import type { Session } from "@supabase/supabase-js";

interface SharedInfoEntry {
  type: "owner" | "member";
  with?: string;
  by?: string;
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  activeWallet: ActiveWallet | null;
  session: Session | null;
  onSelectWallet: (wallet: ActiveWallet) => void;
  onAddWallet: () => void;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

const WalletModal = memo(function WalletModal({
  isOpen, onClose,
  wallets, activeWallet, session,
  onSelectWallet, onAddWallet,
  onNotify,
}: WalletModalProps) {
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editName,   setEditName]   = useState("");
  const [isSaving,   setIsSaving]   = useState(false);
  const [sharingId,  setSharingId]  = useState<string | null>(null);
  const [sharedInfo, setSharedInfo] = useState<Record<string, SharedInfoEntry>>({});

  useEffect(() => {
    if (!isOpen) { setEditingId(null); setSharingId(null); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !wallets?.length || !session?.user?.id) return;
    const fetchInfo = async (): Promise<void> => {
      const info: Record<string, SharedInfoEntry> = {};
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
            if (data && (data as { user_id: string }).user_id) {
              const uid = (data as { user_id: string }).user_id;
              const { data: profile } = await supabase
                .from("profiles")
                .select("username")
                .eq("id", uid)
                .single();
              info[wallet.id] = { type: "owner", with: (profile as { username?: string } | null)?.username || uid.slice(0, 8) };
            }
          } else {
            const { data } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", wallet.user_id)
              .single();
            info[wallet.id] = { type: "member", by: (data as { username?: string } | null)?.username || String(wallet.user_id).slice(0, 8) };
          }
        } catch { /* wallet has no shared member */ }
      }
      setSharedInfo(info);
    };
    void fetchInfo();
  }, [isOpen, wallets, session?.user?.id]);

  const handleSaveEdit = useCallback(async (walletId: string): Promise<void> => {
    if (!editName.trim()) return;
    setIsSaving(true);
    const { error } = await supabase.from("wallets").update({ name: editName.trim() }).eq("id", walletId);
    if (!error) {
      onNotify?.("Nama rekening berhasil diubah!", "success");
      if (activeWallet?.id === walletId) {
        onSelectWallet({ id: walletId, name: editName.trim() });
      }
    } else {
      onNotify?.("Gagal mengubah nama.", "error");
    }
    setIsSaving(false);
    setEditingId(null);
  }, [editName, activeWallet, onSelectWallet, onNotify]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-x-4 top-[50%] -translate-y-[50%] z-[101] max-w-sm mx-auto ds-bg-1 rounded-[32px] shadow-2xl border ds-border overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b ds-border">
              <p className="text-sm font-black ds-t1 uppercase tracking-widest">{WALLET.TITLE}</p>
              <button onClick={onClose} className="p-2 ds-t3 hover:text-fuchsia-400 ds-bg-3 rounded-full transition-colors">
                <X size={16} />
              </button>
            </div>

            <AnimatePresence>
              {sharingId && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 ds-bg-1 z-10 rounded-[32px] p-6 overflow-y-auto"
                >
                  <button
                    onClick={() => setSharingId(null)}
                    className="flex items-center gap-2 text-caption font-black text-gray-400 uppercase tracking-widest mb-4 hover:ds-aurora-text transition-colors"
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

            <div className="px-4 py-3 space-y-2.5 max-h-[40vh] overflow-y-auto no-scrollbar">
              {wallets.map((wallet, idx) => {
                const isActive  = activeWallet?.id === wallet.id;
                const isOwner   = session?.user?.id === wallet.user_id;
                const info      = sharedInfo[wallet.id];
                const isEditing = editingId === wallet.id;

                let headerLabel = isOwner ? WALLET.PERSONAL : "Dompet Bersama";
                if (info?.type === "owner" && info.with) headerLabel = WALLET.SHARED_WITH(info.with);
                if (info?.type === "member" && info.by)  headerLabel = WALLET.SHARED_BY(info.by);

                return (
                  <div
                    key={wallet.id}
                    className="relative overflow-hidden rounded-[20px] transition-all"
                    style={isActive
                      ? { boxShadow: `0 0 0 2px var(--a1), 0 8px 24px color-mix(in srgb, var(--a1) 20%, transparent)` }
                      : { boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}
                  >
                    <div className="absolute inset-0" style={{ background: THEME_GRADIENTS[idx % THEME_GRADIENTS.length] }} />
                    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-2xl" />

                    <div className="relative z-10 p-4">
                      <p className="text-white/70 text-label font-black uppercase tracking-[0.2em] mb-1.5">{headerLabel}</p>

                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") void handleSaveEdit(wallet.id); }}
                            className="flex-1 bg-white/20 backdrop-blur-sm text-white placeholder-white/50 font-bold text-sm rounded-xl px-3 py-1.5 outline-none border border-white/30 focus:border-white/60"
                          />
                          <button
                            onClick={() => void handleSaveEdit(wallet.id)}
                            disabled={isSaving}
                            className="p-1.5 bg-white/20 hover:bg-white/40 rounded-xl text-white transition-colors disabled:opacity-50"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
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
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-lg text-white text-2xs font-black uppercase tracking-widest">
                                <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: "var(--income)" }} />
                                Aktif
                              </span>
                            )}
                          </button>

                          {isOwner && (
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => { setEditingId(wallet.id); setEditName(wallet.name); }}
                                className="p-1.5 bg-white/20 hover:bg-white/40 rounded-xl text-white transition-colors"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => setSharingId(wallet.id)}
                                className="p-1.5 bg-white/20 hover:bg-white/40 rounded-xl text-white transition-colors"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-4 pt-2 pb-8">
              <button
                onClick={onAddWallet}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed ds-border ds-t3 hover:ds-aurora-text ds-aurora-border-c font-black text-caption uppercase tracking-widest rounded-2xl transition-all"
              >
                <Plus size={14} /> {WALLET.ADD_NEW}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default WalletModal;
