"use client";
import { useRef, useState } from "react";
import { Camera, X, Image as ImageIcon, Loader2 } from "lucide-react";

/**
 * PhotoUploadButton — Tombol upload foto reusable
 * Compress otomatis ke max 2MB via imageUtils
 *
 * Props:
 *  - onFileSelected: (file: File) => void
 *  - isUploading?: boolean
 *  - currentUrl?: string | null   — preview URL jika sudah ada foto
 *  - onRemove?: () => void
 *  - accept?: string              — default "image/*"
 *  - label?: string
 */
export default function PhotoUploadButton({
  onFileSelected,
  isUploading = false,
  currentUrl  = null,
  onRemove,
  onError,
  label = "Foto",
}) {
  const inputRef   = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi ukuran awal (maks 5MB sebelum compress)
    if (file.size > 5 * 1024 * 1024) {
      onError?.("File terlalu besar! Maksimal 5MB."); return;
    }

    // Tampilkan preview lokal sebelum upload
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    onFileSelected(file);

    // Reset input agar file yang sama bisa dipilih lagi
    e.target.value = "";
  };

  const displayUrl = preview || currentUrl;

  return (
    <div>
      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
        {label}
      </label>

      {displayUrl ? (
        <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
          <img
            src={displayUrl}
            alt="preview"
            className="w-full h-full object-cover"
          />
          {/* Overlay loading */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 size={24} className="text-white animate-spin" />
            </div>
          )}
          {/* Tombol hapus */}
          {!isUploading && (
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                onRemove?.();
              }}
              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 rounded-full text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
          {/* Ganti foto */}
          {!isUploading && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1.5 bg-black/60 hover:bg-blue-600 rounded-xl text-white text-[9px] font-black uppercase tracking-widest transition-colors"
            >
              <Camera size={11} /> Ganti
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-24 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <Camera size={20} />
              <span className="text-[9px] font-black uppercase tracking-widest">
                Kamera / Galeri
              </span>
            </>
          )}
        </button>
      )}

      {/* Input hidden — accept kamera & galeri */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={false}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
