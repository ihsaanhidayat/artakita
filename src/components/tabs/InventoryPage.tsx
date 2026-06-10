"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import imageCompression from "browser-image-compression";
import {
  Eye, Search, X, Calendar, MapPin,
  DollarSign, Plus, ChevronUp, Image as ImageIcon, Loader2, Archive,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  price: number;
  store_name: string | null;
  purchase_date: string | null;
  photo_url: string | null;
  created_at: string;
}

interface ItemForm {
  name: string;
  price: string;
  store_name: string;
  purchase_date: string;
}

const ITEMS_PER_PAGE = 5;

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ItemForm>({ name: "", price: "", store_name: "", purchase_date: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const pageRef = useRef(page);
  const itemsRef = useRef(items);
  pageRef.current = page;
  itemsRef.current = items;

  const fetchInventory = useCallback(async (isLoadMore = false, currentSearch = ""): Promise<void> => {
    setIsLoading(true);
    const from = isLoadMore ? (pageRef.current + 1) * ITEMS_PER_PAGE : 0;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from("inventory")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (currentSearch) {
      query = query.ilike("name", `%${currentSearch}%`);
    }

    const { data, count, error } = await query.range(from, to);

    if (!error && data) {
      if (isLoadMore) {
        setItems(prev => [...prev, ...(data as InventoryItem[])]);
        setPage(p => p + 1);
      } else {
        setItems(data as InventoryItem[]);
        setPage(0);
      }
      setHasMore(to < (count ?? 0) - 1);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchInventory(false, searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchInventory]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!formData.name) { alert("Nama barang wajib diisi!"); return; }
    setIsSubmitting(true);
    let finalPhotoUrl: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Anda belum login!");

      if (selectedFile) {
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true };
        const compressed = await imageCompression(selectedFile, options);
        const ext = selectedFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const filePath = `inventory/${user.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from("artakita_buckets").upload(filePath, compressed);
        if (uploadError) throw uploadError;
        const { data: pub } = supabase.storage.from("artakita_buckets").getPublicUrl(filePath);
        finalPhotoUrl = pub.publicUrl;
      }

      const amount = formData.price ? Number(formData.price.replace(/\D/g, "")) : 0;
      const { error: dbError } = await supabase.from("inventory").insert([{
        user_id: user.id,
        name: formData.name,
        price: amount,
        store_name: formData.store_name || null,
        purchase_date: formData.purchase_date || null,
        photo_url: finalPhotoUrl,
      }]);
      if (dbError) throw dbError;

      setFormData({ name: "", price: "", store_name: "", purchase_date: "" });
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsFormOpen(false);
      void fetchInventory(false, "");
    } catch (err) {
      alert("Gagal menyimpan: " + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm("Yakin ingin menghapus barang ini?")) return;
    await supabase.from("inventory").delete().eq("id", id);
    void fetchInventory(false, searchQuery);
  };

  return (
    <div className="h-full pb-32 overflow-y-auto no-scrollbar pt-6 px-4 bg-[#0a0f1c]">
      <h2 className="text-xl font-bold text-white mb-6 tracking-tight uppercase">Aset & Inventaris</h2>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input type="text" placeholder="Cari nama barang..." value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-[#121827] text-white pl-12 pr-4 py-4 rounded-2xl outline-none border border-gray-800 focus:border-blue-500/50 transition-colors text-sm font-bold" />
      </div>

      <div className="space-y-4">
        {items.map(item => (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={item.id}
            className="bg-[#121827] border border-gray-800 p-5 rounded-[24px] shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-white text-base leading-tight pr-4">{item.name}</h3>
              {item.photo_url && (
                <button onClick={() => { setSelectedPhoto(item.photo_url); setIsZoomed(false); }}
                  className="shrink-0 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 p-2.5 rounded-xl transition-colors flex items-center gap-2">
                  <Eye size={16} />
                </button>
              )}
            </div>
            <div className="space-y-2 text-xs font-bold">
              <div className="flex items-center gap-3 text-gray-400">
                <DollarSign size={14} className="text-emerald-500" />
                <span className="text-gray-200 ff-mono">Rp {Number(item.price).toLocaleString("id-ID")}</span>
              </div>
              {item.purchase_date && (
                <div className="flex items-center gap-3 text-gray-400">
                  <Calendar size={14} />
                  <span>{new Date(item.purchase_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              )}
              {item.store_name && (
                <div className="flex items-center gap-3 text-gray-400">
                  <MapPin size={14} />
                  <span className="truncate">{item.store_name}</span>
                </div>
              )}
            </div>
            <button onClick={() => void handleDelete(item.id)} className="absolute bottom-4 right-4 text-gray-600 hover:text-red-500 text-caption font-black uppercase tracking-widest">
              Hapus
            </button>
          </motion.div>
        ))}

        {!isLoading && items.length === 0 && (
          <div className="text-center py-10">
            <Archive size={40} className="mx-auto text-gray-800 mb-3" />
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Belum ada barang dicatat</p>
          </div>
        )}
      </div>

      {hasMore && items.length > 0 && (
        <button onClick={() => void fetchInventory(true)} disabled={isLoading}
          className="w-full mt-6 bg-[#121827] text-gray-400 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest border border-gray-800 transition-colors">
          {isLoading ? "Memuat..." : "Tampilkan Lebih Banyak"}
        </button>
      )}

      {!isFormOpen && (
        <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setIsFormOpen(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg shadow-blue-900/50 flex items-center justify-center text-white z-40 transition-transform active:scale-90">
          <Plus size={24} />
        </motion.button>
      )}

      <AnimatePresence>
        {isFormOpen && (
          <motion.form initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
            onSubmit={e => void handleSubmit(e)}
            className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#0a0f1c] border-t border-gray-800 p-6 rounded-t-[32px] shadow-2xl z-[100] max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-black uppercase tracking-widest text-sm">Catat Aset Baru</h3>
              <button type="button" onClick={() => setIsFormOpen(false)} className="text-gray-500 bg-gray-900 p-2 rounded-full"><ChevronUp size={20} /></button>
            </div>
            <div className="space-y-4">
              <label className="block w-full border-2 border-dashed border-gray-800 hover:border-blue-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#121827]">
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                {previewUrl ? (
                  <div className="relative w-full h-32">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-xl" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <ImageIcon size={28} className="text-gray-600" />
                    <span className="text-xs font-bold uppercase tracking-widest">Pilih Foto Barang</span>
                  </div>
                )}
              </label>
              <input type="text" placeholder="Nama Barang *" required value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#121827] text-white p-4 rounded-xl outline-none border border-gray-800 text-sm font-bold" />
              <div className="flex gap-2">
                <input type="text" placeholder="Harga (Rp)" value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="flex-1 bg-[#121827] text-white p-4 rounded-xl outline-none border border-gray-800 text-sm font-bold" />
                <input type="date" value={formData.purchase_date}
                  onChange={e => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="flex-1 bg-[#121827] text-gray-400 p-4 rounded-xl outline-none border border-gray-800 text-sm font-bold" />
              </div>
              <input type="text" placeholder="Beli di mana? (Toko/Lokasi)" value={formData.store_name}
                onChange={e => setFormData({ ...formData, store_name: e.target.value })}
                className="w-full bg-[#121827] text-white p-4 rounded-xl outline-none border border-gray-800 text-sm font-bold" />
              <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 disabled:bg-gray-800 text-white py-4 mt-2 rounded-xl font-black uppercase tracking-widest flex justify-center items-center gap-2">
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : "Simpan Barang"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
            <button onClick={() => setSelectedPhoto(null)} className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors z-50">
              <X size={24} />
            </button>
            <motion.img initial={{ scale: 0.9 }} animate={{ scale: isZoomed ? 2 : 1 }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={() => setIsZoomed(!isZoomed)}
              src={selectedPhoto} alt="Preview"
              className={`max-w-full max-h-[85vh] rounded-2xl object-contain transition-transform ${isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`} />
            <p className="absolute bottom-10 text-gray-500 text-caption font-black tracking-[0.2em] uppercase">
              Ketuk gambar untuk {isZoomed ? "memperkecil" : "memperbesar"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
