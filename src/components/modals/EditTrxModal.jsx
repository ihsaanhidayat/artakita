"use client";
import { memo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Eye, Trash2, Camera } from "lucide-react";
import PhotoViewer from "@/components/PhotoViewer";
import PhotoUploadButton from "@/components/PhotoUploadButton";
import { supabase } from "@/lib/supabaseClient";
import { uploadPhoto } from "@/lib/imageUtils";

/**
 * EditTrxModal — Modern bottom sheet untuk edit transaksi + foto nota
 */
const EditTrxModal = memo(function EditTrxModal({
  isOpen, data, setData,
  onSubmit, onClose,
  existingCategories,
}) {
  const [viewer, setViewer]           = useState({ open: false });
  const [photoFile, setPhotoFile]     = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) { setPhotoFile(null); setViewer({ open: false }); }
  }, [isOpen]);

  const handleSubmitWithPhoto = async (e) => {
    e.preventDefault();
    if (!data) return;

    // Upload foto baru jika ada
    if (photoFile) {
      setIsUploading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const path = `receipts/${session.user.id}/${data.id}.jpg`;
          const url  = await uploadPhoto(photoFile, path, supabase);
          setData({ ...data, receipt_url: url });
        }
      } catch (err) {
        console.error("Upload gagal:", err.message);
      } finally {
        setIsUploading(false);
      }
    }
    onSubmit(e);
  };

  if (!isOpen || !data) return null;

  const isIncome = data.type === "income";

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-[101] bg-white dark:bg-[#0a0f1c] rounded-t-[32px] border-t border-gray-100 dark:border-gray-800 shadow-2xl pb-safe"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>

              <form onSubmit={handleSubmitWithPhoto}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isIncome ? "bg-green-500" : "bg-red-500"}`} />
                    <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                      Edit Transaksi
                    </p>
                  </div>
                  <button type="button" onClick={onClose} className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-red-500 transition-colors">
                    <X size={16} />
                  </button>
                </div>

                <div className="px-5 pb-6 space-y-4 max-h-[70dvh] overflow-y-auto no-scrollbar">

                  {/* Nominal */}
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                      Nominal
                    </label>
                    <input
                      type="text"
                      required
                      inputMode="decimal"
                      placeholder="Cth: 50k, 1jt, 500rb"
                      value={data.amount}
                      onChange={e => setData({ ...data, amount: e.target.value })}
                      className={`w-full bg-gray-50 dark:bg-[#121827] border-2 rounded-2xl py-3.5 px-4 text-gray-900 dark:text-white font-bold text-base outline-none transition-all placeholder-gray-300 dark:placeholder-gray-700 ${
                        isIncome
                          ? "border-green-500/30 focus:border-green-500"
                          : "border-red-500/30 focus:border-red-500"
                      }`}
                    />
                  </div>

                  {/* Catatan */}
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                      Catatan
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Deskripsi transaksi..."
                      value={data.note}
                      onChange={e => setData({ ...data, note: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800 rounded-2xl py-3.5 px-4 text-gray-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-all placeholder-gray-300 dark:placeholder-gray-700"
                    />
                  </div>

                  {/* Kategori */}
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                      Kategori
                    </label>
                    <input
                      list="edit-category-list"
                      type="text"
                      required
                      placeholder="Pilih atau ketik kategori..."
                      value={data.category}
                      onChange={e => setData({ ...data, category: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800 rounded-2xl py-3.5 px-4 text-gray-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-all placeholder-gray-300 dark:placeholder-gray-700"
                    />
                    <datalist id="edit-category-list">
                      {existingCategories?.map(cat => <option key={cat} value={cat} />)}
                    </datalist>
                  </div>

                  {/* Foto Nota */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        Foto Nota
                      </label>
                      {data.receipt_url && !photoFile && (
                        <button
                          type="button"
                          onClick={() => setViewer({ open: true })}
                          className="flex items-center gap-1 text-[9px] font-black text-violet-500 uppercase tracking-widest"
                        >
                          <Eye size={11} /> Lihat
                        </button>
                      )}
                    </div>
                    <PhotoUploadButton
                      label=""
                      onFileSelected={setPhotoFile}
                      isUploading={isUploading}
                      currentUrl={data.receipt_url || null}
                      onRemove={() => { setPhotoFile(null); setData({ ...data, receipt_url: null }); }}
                      onError={(msg) => console.error(msg)}
                    />
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isUploading}
                    className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 ${
                      isIncome
                        ? "bg-green-600 hover:bg-green-500 text-white shadow-green-500/30"
                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30"
                    }`}
                  >
                    <Save size={14} />
                    {isUploading ? "Mengupload..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <PhotoViewer
        url={data?.receipt_url}
        isOpen={viewer.open}
        onClose={() => setViewer({ open: false })}
        label={data?.note}
      />
    </>
  );
});

export default EditTrxModal;
