"use client";
import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut, AlertTriangle } from "lucide-react";

const PhotoViewer = function PhotoViewer({ url, isOpen, onClose, label }) {
  const [scale,   setScale]   = useState(1);
  const [loaded,  setLoaded]  = useState(false);
  const [error,   setError]   = useState(false);
  const [timedOut,setTimedOut]= useState(false);

  useEffect(() => {
    if (isOpen && url) {
      setScale(1);
      setLoaded(false);
      setError(false);
      setTimedOut(false);
      // Timeout 12 detik — jika belum load, tampilkan error
      const t = setTimeout(() => {
        setTimedOut(true);
      }, 12000);
      return () => clearTimeout(t);
    }
  }, [isOpen, url]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const hasError = error || timedOut;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] bg-black/96 flex flex-col"
        >
          {/* Top bar — selalu terlihat, tidak tertutup loading */}
          <div className="flex justify-between items-center px-4 py-4 shrink-0 z-10">
            <p className="text-xs font-bold text-white/70 truncate max-w-[200px]">
              {label || "Foto"}
            </p>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-90 rounded-full transition-all text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Image area */}
          <div className="flex-1 flex items-center justify-center overflow-auto relative">
            {/* Loading spinner */}
            {!loaded && !hasError && url && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <p className="text-white/40 text-xs font-bold">Memuat foto...</p>
                {/* Tombol close darurat saat loading */}
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/60 text-xs font-black uppercase tracking-widest transition-all"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* Error state */}
            {hasError && (
              <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                <AlertTriangle size={40} className="text-red-400" />
                <p className="text-white font-black text-sm">
                  {timedOut ? "Foto terlalu lama dimuat" : "Gagal memuat foto"}
                </p>
                <p className="text-white/40 text-xs">
                  Periksa koneksi internet kamu
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white font-black text-xs uppercase tracking-widest transition-all"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* Foto */}
            {url && !hasError && (
              <motion.img
                src={url}
                alt={label || "foto"}
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
                animate={{ scale, opacity: loaded ? 1 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="max-w-full max-h-full object-contain select-none"
                style={{ touchAction: "manipulation", transformOrigin: "center" }}
                draggable={false}
              />
            )}
          </div>

          {/* Bottom controls — hanya tampil saat foto sudah load */}
          {loaded && !hasError && (
            <div className="flex justify-center items-center gap-3 px-4 py-5 shrink-0">
              <button onClick={() => setScale(s => Math.max(s - 0.5, 1))} disabled={scale <= 1}
                className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-2xl transition-all text-white">
                <ZoomOut size={18} />
              </button>
              <button onClick={() => setScale(1)}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-white text-xs font-black uppercase tracking-widest">
                {Math.round(scale * 100)}%
              </button>
              <button onClick={() => setScale(s => Math.min(s + 0.5, 4))} disabled={scale >= 4}
                className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-2xl transition-all text-white">
                <ZoomIn size={18} />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(PhotoViewer);
