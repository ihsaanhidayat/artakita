"use client";
import { useRef, useState } from "react";
import { Camera, Image, X, Loader2 } from "lucide-react";

/**
 * PhotoUploadButton
 * Dua tombol terpisah: Kamera dan Galeri
 * - Kamera: capture="environment" → langsung buka kamera belakang
 * - Galeri: tanpa capture → buka file picker galeri
 */
export default function PhotoUploadButton({
  onFileSelected,
  isUploading = false,
  currentUrl  = null,
  onRemove,
  onError,
  label = "Foto",
}) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      onError?.("File terlalu besar! Maksimal 5MB.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    onFileSelected(file);
    e.target.value = "";
  };

  const displayUrl = preview || currentUrl;

  return (
    <div>
      {displayUrl ? (
        <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
          <img src={displayUrl} alt="preview" className="w-full h-full object-cover" />

          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 size={24} className="text-white animate-spin" />
            </div>
          )}

          {!isUploading && (
            <>
              {/* Hapus */}
              <button
                type="button"
                onClick={() => { setPreview(null); onRemove?.(); }}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 rounded-full text-white transition-colors"
              >
                <X size={14} />
              </button>

              {/* Ganti — buka galeri */}
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1.5 bg-black/60 hover:bg-blue-600 rounded-xl text-white text-[9px] font-black uppercase tracking-widest transition-colors"
              >
                <Camera size={11} /> Ganti
              </button>
            </>
          )}
        </div>
      ) : (
        /* Dua tombol: Kamera & Galeri */
        <div className="grid grid-cols-2 gap-2">
          {/* Kamera — langsung buka kamera belakang */}
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={isUploading}
            className="h-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-blue-500 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all disabled:opacity-50"
          >
            <Camera size={18} />
            <span className="text-[9px] font-black uppercase tracking-widest">Kamera</span>
          </button>

          {/* Galeri — buka file picker */}
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={isUploading}
            className="h-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-violet-500 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all disabled:opacity-50"
          >
            {isUploading
              ? <Loader2 size={18} className="animate-spin" />
              : <Image size={18} />
            }
            <span className="text-[9px] font-black uppercase tracking-widest">Galeri</span>
          </button>
        </div>
      )}

      {/* Input kamera — capture=environment → kamera belakang */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />

      {/* Input galeri — tanpa capture → file picker */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
