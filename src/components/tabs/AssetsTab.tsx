"use client";
import { memo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { uploadPhoto, deletePhoto } from "@/lib/imageUtils";
import { parseFlexibleNumber, fmt, formatDateTime } from "@/lib/utils";
import PhotoViewer from "@/components/PhotoViewer";
import PhotoUploadButton from "@/components/PhotoUploadButton";
import {
  Trash2, Edit3, X, Save, Eye,
  Package, Store, Calendar, Tag,
  ChevronDown, Loader2,
} from "lucide-react";
import type { ActiveWallet } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type Condition = "baru" | "baik" | "perlu_servis" | "rusak";

interface Asset {
  id: string;
  name: string;
  store_name: string | null;
  purchase_date: string | null;
  price: number;
  condition: Condition;
  notes: string | null;
  photo_url: string | null;
  wallet_id: string;
  created_at: string;
}

interface AssetForm { name: string; store_name: string; purchase_date: string; price: string; condition: Condition; notes: string; }

interface ConditionEntry { value: Condition; label: string; style: React.CSSProperties; }

interface AssetsTabProps { activeWallet: ActiveWallet | null; refreshKey?: number; }

// ── Constants ─────────────────────────────────────────────────────────────────

const CONDITIONS: ConditionEntry[] = [
  { value: "baru",         label: "Baru",         style: { color: "var(--a1)",    background: "color-mix(in srgb, var(--a1) 12%, transparent)",    borderColor: "color-mix(in srgb, var(--a1) 25%, transparent)" } },
  { value: "baik",         label: "Baik",         style: { color: "var(--income)", background: "color-mix(in srgb, var(--income) 12%, transparent)", borderColor: "color-mix(in srgb, var(--income) 25%, transparent)" } },
  { value: "perlu_servis", label: "Perlu Servis", style: { color: "rgb(245,158,11)", background: "rgba(245,158,11,0.10)", borderColor: "rgba(245,158,11,0.25)" } },
  { value: "rusak",        label: "Rusak",        style: { color: "var(--a3)",    background: "color-mix(in srgb, var(--a3) 12%, transparent)",    borderColor: "color-mix(in srgb, var(--a3) 25%, transparent)" } },
];

const getCondition = (val: string | null): ConditionEntry => CONDITIONS.find(c => c.value === val) ?? CONDITIONS[1];

// ── Component ─────────────────────────────────────────────────────────────────

const AssetsTabComponent = memo(function AssetsTab({ activeWallet, refreshKey }: AssetsTabProps) {
  const [assets,        setAssets]       = useState<Asset[]>([]);
  const [isLoading,     setIsLoading]    = useState(false);
  const [isFormOpen,    setIsFormOpen]   = useState(false);
  const [editingId,     setEditingId]    = useState<string | null>(null);
  const [expandedId,    setExpandedId]   = useState<string | null>(null);
  const [inlineDeleteId,setInlineDeleteId] = useState<string | null>(null);
  const [viewer,        setViewer]       = useState<{ open: boolean; url: string | null; label: string }>({ open: false, url: null, label: "" });
  const [toast,         setToast]        = useState({ show: false, msg: "", type: "error" });
  const [form,          setForm]         = useState<AssetForm>({ name: "", store_name: "", purchase_date: "", price: "", condition: "baik", notes: "" });
  const [photoFile,     setPhotoFile]    = useState<File | null>(null);
  const [isUploading,   setIsUploading]  = useState(false);
  const [isSaving,      setIsSaving]     = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "error") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "error" }), 3500);
  };

  const fetchAssets = useCallback(async (): Promise<void> => {
    if (!activeWallet?.id) return;
    setIsLoading(true);
    const { data } = await supabase.from("assets").select("*").eq("wallet_id", activeWallet.id).order("created_at", { ascending: false });
    if (data) setAssets(data as Asset[]);
    setIsLoading(false);
  }, [activeWallet?.id]);

  useEffect(() => { void fetchAssets(); }, [fetchAssets, refreshKey]);

  const resetForm = () => { setForm({ name: "", store_name: "", purchase_date: "", price: "", condition: "baik", notes: "" }); setPhotoFile(null); setEditingId(null); };

  const openEdit = (asset: Asset) => {
    setForm({ name: asset.name || "", store_name: asset.store_name || "", purchase_date: asset.purchase_date || "", price: asset.price ? String(asset.price) : "", condition: asset.condition || "baik", notes: asset.notes || "" });
    setPhotoFile(null); setEditingId(asset.id); setIsFormOpen(true); setExpandedId(null);
  };

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.name.trim()) { showToast("Nama barang wajib diisi."); return; }
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      const parsedPrice = parseFlexibleNumber(form.price);
      let photoUrl: string | null = editingId ? (assets.find(a => a.id === editingId)?.photo_url ?? null) : null;
      if (photoFile && userId) {
        setIsUploading(true);
        const assetId = editingId ?? crypto.randomUUID();
        const path = `assets/${userId}/${assetId}.jpg`;
        try { photoUrl = await uploadPhoto(photoFile, path, supabase); }
        catch (err) { showToast("Upload foto gagal: " + (err as Error).message); setIsUploading(false); setIsSaving(false); return; }
        setIsUploading(false);
      }
      const payload = { name: form.name.trim(), store_name: form.store_name.trim() || null, purchase_date: form.purchase_date || null, price: parsedPrice, condition: form.condition, notes: form.notes.trim() || null, photo_url: photoUrl, wallet_id: activeWallet!.id };
      if (editingId) { const { error } = await supabase.from("assets").update(payload).eq("id", editingId); if (error) throw error; }
      else { const { error } = await supabase.from("assets").insert([{ ...payload, user_id: userId }]); if (error) throw error; }
      showToast(editingId ? "Aset berhasil diperbarui!" : "Aset berhasil ditambahkan!", "success");
      resetForm(); setIsFormOpen(false); void fetchAssets();
    } catch (err) { showToast("Gagal: " + (err as Error).message); }
    finally { setIsSaving(false); }
  };

  const confirmDelete = async (id: string): Promise<void> => {
    const asset = assets.find(a => a.id === id);
    if (asset?.photo_url) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await deletePhoto(`assets/${session.user.id}/${asset.id}.jpg`, supabase).catch(() => {});
    }
    await supabase.from("assets").delete().eq("id", id);
    setInlineDeleteId(null); showToast("Aset dihapus.", "success"); void fetchAssets();
  };

  const totalValue = assets.reduce((s, a) => s + Number(a.price || 0), 0);

  return (
    <div className="pt-8 px-3 pb-32 h-[100dvh] overflow-y-auto no-scrollbar w-full flex flex-col">
      <div className="mb-6 flex-none">
        <h2 className="text-[26px] font-light tracking-[-1.5px] leading-none ds-t1">Manajemen Aset</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="ds-live-dot" />
          <p className="text-caption font-black tracking-[0.14em] uppercase ds-aurora-text">{activeWallet?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6 flex-none">
        <div className="ds-bg-1 border ds-border rounded-[20px] p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1.5" style={{ color: "var(--a2)" }}><Package size={13} /><span className="text-label font-black uppercase tracking-widest">Total Aset</span></div>
          <p className="font-black text-xl ds-t1">{assets.length}</p>
          <p className="text-label ds-t3 mt-0.5">barang tercatat</p>
        </div>
        <div className="ds-bg-1 border ds-border rounded-[20px] p-4 shadow-sm">
          <div className="flex items-center gap-1.5 ds-aurora-text mb-1.5"><Tag size={13} /><span className="text-label font-black uppercase tracking-widest">Nilai Total</span></div>
          <p className="font-black text-base ds-t1 ff-mono leading-tight">Rp {fmt(totalValue)}</p>
          <p className="text-label ds-t3 mt-0.5">estimasi harga beli</p>
        </div>
      </div>

      <div className="space-y-3 flex-1">
        {isLoading && assets.length === 0 && <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 ds-bg-3 rounded-[24px] animate-pulse" />)}</div>}
        {!isLoading && assets.length === 0 && (
          <div className="text-center py-16 ds-bg-1/10 rounded-[28px] border border-dashed ds-border">
            <Package size={32} className="ds-t3 mx-auto mb-3" />
            <p className="text-caption font-black ds-t3 uppercase tracking-[0.4em]">Belum Ada Aset</p>
          </div>
        )}
        {assets.map((asset, index) => {
          const cond = getCondition(asset.condition);
          const isExpanded = expandedId === asset.id;
          return (
            <motion.div key={asset.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="ds-bg-1 border ds-border rounded-[24px] shadow-sm overflow-hidden relative">
              <button onClick={() => setExpandedId(isExpanded ? null : asset.id)} className="w-full flex items-center gap-4 p-4 text-left">
                <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 ds-bg-3 flex items-center justify-center">
                  {asset.photo_url ? <img src={asset.photo_url} alt={asset.name} className="w-full h-full object-cover" loading="lazy" /> : <Package size={20} className="ds-t3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm ds-t1 truncate">{asset.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-2xs font-black px-2 py-0.5 rounded-full border uppercase tracking-widest" style={cond.style}>{cond.label}</span>
                    {asset.price > 0 && <span className="text-label ds-t3 ff-mono">Rp {fmt(asset.price)}</span>}
                  </div>
                </div>
                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="ds-t3 shrink-0"><ChevronDown size={16} /></motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
                    <div className="px-4 pb-4 pt-2 border-t ds-border space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {asset.store_name && <div className="flex items-center gap-2"><Store size={12} className="ds-t3 shrink-0" /><div><p className="text-2xs font-black ds-t3 uppercase tracking-widest">Toko</p><p className="text-xs font-bold ds-t1">{asset.store_name}</p></div></div>}
                        {asset.purchase_date && <div className="flex items-center gap-2"><Calendar size={12} className="ds-t3 shrink-0" /><div><p className="text-2xs font-black ds-t3 uppercase tracking-widest">Tgl Beli</p><p className="text-xs font-bold ds-t1">{new Date(asset.purchase_date).toLocaleDateString("id-ID")}</p></div></div>}
                      </div>
                      {asset.notes && <p className="text-xs ds-t2 ds-bg-3 px-3 py-2 rounded-xl">{asset.notes}</p>}
                      <p className="text-label ds-t3">Ditambahkan: {formatDateTime(asset.created_at)}</p>
                      <div className="flex gap-2 pt-1">
                        {asset.photo_url && (
                          <button onClick={() => setViewer({ open: true, url: asset.photo_url, label: asset.name })} className="flex items-center gap-1.5 px-3 py-2 border font-black text-label uppercase tracking-widest rounded-xl transition-all" style={{ color: "var(--a2)", background: "color-mix(in srgb, var(--a2) 12%, transparent)", borderColor: "color-mix(in srgb, var(--a2) 25%, transparent)" }}>
                            <Eye size={12} /> Lihat Foto
                          </button>
                        )}
                        <button onClick={() => openEdit(asset)} className="flex items-center gap-1.5 px-3 py-2 ds-aurora-bg border ds-aurora-border-c ds-aurora-text font-black text-label uppercase tracking-widest rounded-xl transition-all"><Edit3 size={12} /> Edit</button>
                        <button onClick={() => setInlineDeleteId(asset.id)} className="p-2 ds-t3 hover:text-fuchsia-400 ds-bg-3 rounded-xl transition-colors ml-auto"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {inlineDeleteId === asset.id && (
                  <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 280 }}
                    className="absolute inset-0 z-20 flex items-center justify-between px-5 backdrop-blur-md"
                    style={{ background: "color-mix(in srgb, var(--a3) 85%, var(--a2))", borderLeft: "3px solid var(--a3)", boxShadow: "inset 4px 0 20px color-mix(in srgb, var(--a3) 30%, transparent)" }}>
                    <div className="flex items-center gap-2"><Trash2 size={15} className="text-white" /><span className="text-[11px] font-black text-white uppercase tracking-widest">Hapus Permanen?</span></div>
                    <div className="flex gap-2">
                      <button onClick={() => setInlineDeleteId(null)} className="px-3 py-1.5 rounded-[10px] bg-white/20 text-white text-label font-black uppercase tracking-widest hover:bg-white/30 transition-colors">Batal</button>
                      <button onClick={() => void confirmDelete(asset.id)} className="px-3 py-1.5 rounded-[10px] text-label font-black uppercase tracking-widest active:scale-95 transition-all" style={{ background: "rgba(255,255,255,0.9)", color: "var(--a2)" }}>Hapus</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => { if (!isSaving) { resetForm(); setIsFormOpen(false); } }} />
            <motion.form initial={{ y: 600, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 600, opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 280 }}
              onSubmit={e => void handleSave(e)}
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto ds-bg-1 border-t ds-border rounded-t-[32px] pb-safe shadow-2xl z-50 max-h-[92dvh] overflow-y-auto no-scrollbar">
              <div className="p-6 pb-8">
                <div className="w-10 h-1 ds-bg-3 rounded-full mx-auto mb-5" />
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-sm font-black ds-t1 uppercase tracking-widest">Edit Aset</h3>
                  <button type="button" onClick={() => { if (!isSaving) { resetForm(); setIsFormOpen(false); } }} className="p-2 ds-t3 hover:text-fuchsia-400 ds-bg-3 rounded-full transition-colors"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                  <PhotoUploadButton label="Foto Aset" onFileSelected={setPhotoFile} isUploading={isUploading} currentUrl={editingId ? (assets.find(a => a.id === editingId)?.photo_url ?? null) : null} onRemove={() => setPhotoFile(null)} />
                  <div>
                    <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-1.5">Nama Barang *</label>
                    <input type="text" required autoFocus placeholder="Cth: Laptop Dell XPS, iPhone 15" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full ds-bg-3 border ds-border ds-t1 font-bold text-sm p-4 rounded-2xl outline-none focus:border-[var(--a1)] transition-all placeholder-gray-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-1.5">Nama Toko</label>
                      <input type="text" placeholder="Tokopedia, iBox..." value={form.store_name} onChange={e => setForm(p => ({ ...p, store_name: e.target.value }))} className="w-full ds-bg-3 border ds-border ds-t1 font-bold text-sm p-3 rounded-2xl outline-none focus:border-[var(--a1)] transition-all placeholder-gray-400" />
                    </div>
                    <div>
                      <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-1.5">Tgl Pembelian</label>
                      <input type="date" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} className="w-full ds-bg-3 border ds-border ds-t1 font-bold text-sm p-3 rounded-2xl outline-none focus:border-[var(--a1)] transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-1.5">Harga Beli</label>
                    <input type="text" placeholder="Cth: 5jt, 1.5jt, 500k" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="w-full ds-bg-3 border ds-border ds-t1 font-bold text-sm p-4 rounded-2xl outline-none focus:border-[var(--a1)] transition-all placeholder-gray-400" />
                  </div>
                  <div>
                    <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-2">Kondisi</label>
                    <div className="grid grid-cols-4 gap-2">
                      {CONDITIONS.map(c => (
                        <button key={c.value} type="button" onClick={() => setForm(p => ({ ...p, condition: c.value }))}
                          className={`py-2 rounded-xl font-black text-label uppercase tracking-widest border transition-all ${form.condition !== c.value ? "ds-bg-3 ds-border ds-t3" : ""}`}
                          style={form.condition === c.value ? c.style : undefined}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-label font-black ds-t3 uppercase tracking-widest mb-1.5">Catatan</label>
                    <textarea rows={2} placeholder="Serial number, garansi, keterangan lain..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="w-full ds-bg-3 border ds-border ds-t1 font-bold text-sm p-4 rounded-2xl outline-none focus:border-[var(--a1)] transition-all placeholder-gray-400 resize-none" />
                  </div>
                  <button type="submit" disabled={isSaving || isUploading} className="w-full flex items-center justify-center gap-2 py-4 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all" style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))" }}>
                    {(isSaving || isUploading) ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Save size={14} /> Simpan Perubahan</>}
                  </button>
                </div>
              </div>
            </motion.form>
          </>
        )}
      </AnimatePresence>

      <PhotoViewer url={viewer.url} isOpen={viewer.open} onClose={() => setViewer({ open: false, url: null, label: "" })} label={viewer.label} />

      <AnimatePresence>
        {toast.show && (
          <motion.div initial={{ opacity: 0, y: -40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} className="fixed top-6 left-0 right-0 z-[50] flex justify-center px-4 pointer-events-none">
            <div className="flex items-center gap-3 px-5 py-3.5 rounded-full shadow-2xl backdrop-blur-xl border"
              style={toast.type === "error" ? { background: "color-mix(in srgb, var(--a3) 12%, transparent)", borderColor: "color-mix(in srgb, var(--a3) 25%, transparent)", color: "var(--a3)" } : { background: "color-mix(in srgb, var(--income) 12%, transparent)", borderColor: "color-mix(in srgb, var(--income) 25%, transparent)", color: "var(--income)" }}>
              <X size={15} />
              <span className="text-xs font-bold tracking-wide">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default AssetsTabComponent;
