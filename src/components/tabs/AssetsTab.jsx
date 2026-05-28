"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { uploadPhoto, deletePhoto } from "@/lib/imageUtils";
import { parseFlexibleNumber, fmt, formatDateTime } from "@/lib/utils";
import PhotoViewer from "@/components/PhotoViewer";
import PhotoUploadButton from "@/components/PhotoUploadButton";
import {
  Plus, Trash2, Edit3, X, Save, Eye,
  Package, Store, Calendar, Tag,
  ChevronDown, Loader2, Wallet
} from "lucide-react";

const CONDITIONS = [
  { value: "baru",        label: "Baru",         color: "text-blue-500",   bg: "bg-blue-500/10 border-blue-500/20" },
  { value: "baik",        label: "Baik",          color: "text-green-500",  bg: "bg-green-500/10 border-green-500/20" },
  { value: "perlu_servis",label: "Perlu Servis",  color: "text-amber-500",  bg: "bg-amber-500/10 border-amber-500/20" },
  { value: "rusak",       label: "Rusak",         color: "text-red-500",    bg: "bg-red-500/10 border-red-500/20" },
];

const getCondition = (val) => CONDITIONS.find(c => c.value === val) || CONDITIONS[1];

export default function AssetsTab({ activeWallet }) {
  const [assets, setAssets]             = useState([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [isFormOpen, setIsFormOpen]     = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [expandedId, setExpandedId]     = useState(null);
  const [deleteModal, setDeleteModal]   = useState({ show: false, id: null, name: "" });
  const [viewer, setViewer]             = useState({ open: false, url: null, label: "" });
  const [toast, setToast]               = useState({ show: false, msg: "", type: "error" });

  // Form state
  const [form, setForm] = useState({
    name: "", store_name: "", purchase_date: "",
    price: "", condition: "baik", notes: "",
  });
  const [photoFile, setPhotoFile]     = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving]       = useState(false);

  const showToast = (msg, type = "error") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "error" }), 3500);
  };

  // ── Fetch assets ────────────────────────────────────────────────────────
  const fetchAssets = useCallback(async () => {
    if (!activeWallet?.id) return;
    setIsLoading(true);
    const { data } = await supabase
      .from("assets")
      .select("*")
      .eq("wallet_id", activeWallet.id)
      .order("created_at", { ascending: false });
    if (data) setAssets(data);
    setIsLoading(false);
  }, [activeWallet?.id]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  // ── Reset form ──────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm({ name: "", store_name: "", purchase_date: "", price: "", condition: "baik", notes: "" });
    setPhotoFile(null);
    setEditingId(null);
  };

  const openAdd = () => { resetForm(); setIsFormOpen(true); };

  const openEdit = (asset) => {
    setForm({
      name:          asset.name || "",
      store_name:    asset.store_name || "",
      purchase_date: asset.purchase_date || "",
      price:         asset.price ? String(asset.price) : "",
      condition:     asset.condition || "baik",
      notes:         asset.notes || "",
    });
    setPhotoFile(null);
    setEditingId(asset.id);
    setIsFormOpen(true);
    setExpandedId(null);
  };

  // ── Save (add or edit) ──────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast("Nama barang wajib diisi."); return; }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      const parsedPrice = parseFlexibleNumber(form.price);

      let photoUrl = editingId
        ? assets.find(a => a.id === editingId)?.photo_url || null
        : null;

      // Upload foto baru jika ada
      if (photoFile && userId) {
        setIsUploading(true);
        const assetId = editingId || crypto.randomUUID();
        const path    = `assets/${userId}/${assetId}.jpg`;
        try {
          photoUrl = await uploadPhoto(photoFile, path, supabase);
        } catch (err) {
          showToast("Upload foto gagal: " + err.message);
          setIsUploading(false);
          setIsSaving(false);
          return;
        }
        setIsUploading(false);
      }

      const payload = {
        name:          form.name.trim(),
        store_name:    form.store_name.trim() || null,
        purchase_date: form.purchase_date || null,
        price:         parsedPrice,
        condition:     form.condition,
        notes:         form.notes.trim() || null,
        photo_url:     photoUrl,
        wallet_id:     activeWallet.id,
      };

      if (editingId) {
        const { error } = await supabase.from("assets").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("assets").insert([{ ...payload, user_id: userId }]);
        if (error) throw error;
      }

      showToast(editingId ? "Aset berhasil diperbarui!" : "Aset berhasil ditambahkan!", "success");
      resetForm();
      setIsFormOpen(false);
      fetchAssets();
    } catch (err) {
      showToast("Gagal: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    const asset = assets.find(a => a.id === deleteModal.id);
    if (asset?.photo_url) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await deletePhoto(`assets/${session.user.id}/${asset.id}.jpg`, supabase).catch(() => {});
      }
    }
    await supabase.from("assets").delete().eq("id", deleteModal.id);
    setDeleteModal({ show: false, id: null, name: "" });
    showToast("Aset dihapus.", "success");
    fetchAssets();
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalValue = assets.reduce((s, a) => s + Number(a.price || 0), 0);

  return (
    <div className="pt-8 px-3 pb-32 h-[100dvh] overflow-y-auto no-scrollbar w-full flex flex-col">

      {/* Header */}
      <div className="flex justify-between items-start mb-6 flex-none">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Manajemen Aset</h2>
          <div className="flex items-center gap-2 mt-1">
            <Wallet size={11} className="text-blue-400" />
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">{activeWallet?.name}</p>
          </div>
        </div>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-2 gap-3 mb-6 flex-none">
        <div className="bg-white dark:bg-[#121827] border border-gray-100 dark:border-gray-800/60 rounded-[20px] p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-violet-500 mb-1.5">
            <Package size={13} />
            <span className="text-[9px] font-black uppercase tracking-widest">Total Aset</span>
          </div>
          <p className="font-black text-xl text-gray-900 dark:text-white">{assets.length}</p>
          <p className="text-[9px] text-gray-400 mt-0.5">barang tercatat</p>
        </div>
        <div className="bg-white dark:bg-[#121827] border border-gray-100 dark:border-gray-800/60 rounded-[20px] p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-blue-500 mb-1.5">
            <Tag size={13} />
            <span className="text-[9px] font-black uppercase tracking-widest">Nilai Total</span>
          </div>
          <p className="font-black text-base text-gray-900 dark:text-white leading-tight">Rp {fmt(totalValue)}</p>
          <p className="text-[9px] text-gray-400 mt-0.5">estimasi harga beli</p>
        </div>
      </div>

      {/* Asset list */}
      <div className="space-y-3 flex-1">
        {isLoading && assets.length === 0 && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 bg-gray-50 dark:bg-gray-900/40 rounded-[24px] animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && assets.length === 0 && (
          <div className="text-center py-16 bg-gray-50/50 dark:bg-gray-900/10 rounded-[28px] border border-dashed border-gray-200 dark:border-gray-800">
            <Package size={32} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.4em]">Belum Ada Aset</p>
          </div>
        )}

        {assets.map((asset, index) => {
          const cond       = getCondition(asset.condition);
          const isExpanded = expandedId === asset.id;

          return (
            <motion.div
              key={asset.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="bg-white dark:bg-[#121827] border border-gray-100 dark:border-gray-800/60 rounded-[24px] shadow-sm overflow-hidden"
            >
              {/* Collapsed header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : asset.id)}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                {/* Thumbnail foto */}
                <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  {asset.photo_url ? (
                    <img
                      src={asset.photo_url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Package size={20} className="text-gray-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-gray-900 dark:text-white truncate">{asset.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${cond.bg} ${cond.color}`}>
                      {cond.label}
                    </span>
                    {asset.price > 0 && (
                      <span className="text-[9px] text-gray-400">Rp {fmt(asset.price)}</span>
                    )}
                  </div>
                </div>

                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-gray-400 shrink-0"
                >
                  <ChevronDown size={16} />
                </motion.div>
              </button>

              {/* Expanded detail */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-800/60 space-y-3">

                      {/* Detail rows */}
                      <div className="grid grid-cols-2 gap-2">
                        {asset.store_name && (
                          <div className="flex items-center gap-2">
                            <Store size={12} className="text-gray-400 shrink-0" />
                            <div>
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Toko</p>
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{asset.store_name}</p>
                            </div>
                          </div>
                        )}
                        {asset.purchase_date && (
                          <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-gray-400 shrink-0" />
                            <div>
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Tgl Beli</p>
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                {new Date(asset.purchase_date).toLocaleDateString("id-ID")}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {asset.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 px-3 py-2 rounded-xl">
                          {asset.notes}
                        </p>
                      )}

                      <p className="text-[9px] text-gray-300 dark:text-gray-700">
                        Ditambahkan: {formatDateTime(asset.created_at)}
                      </p>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-1">
                        {/* Lihat foto */}
                        {asset.photo_url && (
                          <button
                            onClick={() => setViewer({ open: true, url: asset.photo_url, label: asset.name })}
                            className="flex items-center gap-1.5 px-3 py-2 bg-violet-500/10 hover:bg-violet-500 border border-violet-500/20 text-violet-500 hover:text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
                          >
                            <Eye size={12} /> Lihat Foto
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(asset)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 hover:bg-blue-500 border border-blue-500/20 text-blue-500 hover:text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all"
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteModal({ show: true, id: asset.id, name: asset.name })}
                          className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl transition-colors ml-auto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* FAB */}
      <AnimatePresence>
        {!isFormOpen && (
          <motion.button
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={openAdd}
            className="fixed bottom-24 right-6 w-14 h-14 bg-violet-600 hover:bg-violet-500 rounded-full shadow-2xl shadow-violet-600/40 flex items-center justify-center text-white z-40 transition-colors"
          >
            <Plus size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom Sheet Form */}
      <AnimatePresence>
        {isFormOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => { if (!isSaving) { resetForm(); setIsFormOpen(false); } }}
            />
            <motion.form
              initial={{ y: 600, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 600, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              onSubmit={handleSave}
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white dark:bg-[#0a0f1c] border-t border-gray-100 dark:border-gray-800 rounded-t-[32px] shadow-2xl z-50 max-h-[90dvh] overflow-y-auto no-scrollbar"
            >
              <div className="p-6">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                    {editingId ? "Edit Aset" : "Tambah Aset"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => { if (!isSaving) { resetForm(); setIsFormOpen(false); } }}
                    className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Foto */}
                  <PhotoUploadButton
                    label="Foto Aset"
                    onFileSelected={setPhotoFile}
                    isUploading={isUploading}
                    currentUrl={editingId ? assets.find(a => a.id === editingId)?.photo_url : null}
                    onRemove={() => setPhotoFile(null)}
                  />

                  {/* Nama */}
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nama Barang *</label>
                    <input
                      type="text" required autoFocus
                      placeholder="Cth: Laptop Dell XPS, iPhone 15"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold text-sm p-4 rounded-2xl outline-none focus:border-violet-500 transition-all placeholder-gray-400"
                    />
                  </div>

                  {/* Toko + Tanggal */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nama Toko</label>
                      <input
                        type="text"
                        placeholder="Tokopedia, iBox..."
                        value={form.store_name}
                        onChange={e => setForm(p => ({ ...p, store_name: e.target.value }))}
                        className="w-full bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold text-sm p-3 rounded-2xl outline-none focus:border-violet-500 transition-all placeholder-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Tgl Pembelian</label>
                      <input
                        type="date"
                        value={form.purchase_date}
                        onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))}
                        className="w-full bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold text-sm p-3 rounded-2xl outline-none focus:border-violet-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Harga */}
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Harga Beli</label>
                    <input
                      type="text"
                      placeholder="Cth: 5jt, 1.5jt, 500k"
                      value={form.price}
                      onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold text-sm p-4 rounded-2xl outline-none focus:border-violet-500 transition-all placeholder-gray-400"
                    />
                  </div>

                  {/* Kondisi */}
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Kondisi</label>
                    <div className="grid grid-cols-4 gap-2">
                      {CONDITIONS.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setForm(p => ({ ...p, condition: c.value }))}
                          className={`py-2 rounded-xl font-black text-[9px] uppercase tracking-widest border transition-all ${
                            form.condition === c.value
                              ? `${c.bg} ${c.color}`
                              : "bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 text-gray-400"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Catatan */}
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Catatan</label>
                    <textarea
                      rows={2}
                      placeholder="Serial number, garansi, keterangan lain..."
                      value={form.notes}
                      onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold text-sm p-4 rounded-2xl outline-none focus:border-violet-500 transition-all placeholder-gray-400 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving || isUploading}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-violet-500/30"
                  >
                    {(isSaving || isUploading)
                      ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</>
                      : <><Save size={14} /> {editingId ? "Simpan Perubahan" : "Tambah Aset"}</>
                    }
                  </button>
                </div>
              </div>
            </motion.form>
          </>
        )}
      </AnimatePresence>

      {/* Photo Viewer */}
      <PhotoViewer
        url={viewer.url}
        isOpen={viewer.open}
        onClose={() => setViewer({ open: false, url: null, label: "" })}
        label={viewer.label}
      />

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteModal.show && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-red-100 dark:border-red-900/30 text-center"
            >
              <div className="w-14 h-14 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-red-500" size={24} />
              </div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-2">Hapus Aset?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                <strong>{deleteModal.name}</strong> beserta fotonya akan dihapus permanen.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteModal({ show: false, id: null, name: "" })} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all">Batal</button>
                <button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-red-500/30">Hapus</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-0 right-0 z-[999999] flex justify-center px-4 pointer-events-none"
          >
            <div className={`flex items-center gap-3 px-5 py-3.5 rounded-full shadow-2xl backdrop-blur-xl border ${
              toast.type === "error"
                ? "bg-red-500/10 border-red-500/20 text-red-500"
                : "bg-green-500/10 border-green-500/20 text-green-500"
            }`}>
              <X size={15} />
              <span className="text-xs font-bold tracking-wide">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
