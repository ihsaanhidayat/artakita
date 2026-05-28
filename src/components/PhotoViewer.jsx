"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

/**
 * PhotoViewer — Full screen overlay foto dengan pinch-to-zoom
 * Lazy: foto hanya di-load saat viewer dibuka
 *
 * Props:
 *  - url: string | null
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - label?: string  — caption di bawah foto
 */
export default function PhotoViewer({ url, isOpen, onClose, label }) {
  const [scale, setScale]   = useState(1);
  const [loaded, setLoaded] = useState(false);

  // Reset zoom setiap kali dibuka
  useEffect(() => {
    if (isOpen) { setScale(1); setLoaded(false); }
  }, [isOpen, url]);

  // Tutup dengan ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Cegah scroll body saat viewer terbuka
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const zoomIn  = () => setScale(s => Math.min(s + 0.5, 4));
  const zoomOut = () => setScale(s => Math.max(s - 0.5, 1));
  const reset   = () => setScale(1);

  return (
    <AnimatePresence>
      {isOpen && url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[999998] bg-black/95 backdrop-blur-md flex flex-col"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          {/* Top bar */}
          <div className="flex justify-between items-center px-4 py-4 shrink-0">
            <div>
              {label && (
                <p className="text-xs font-bold text-white/80 tracking-wide truncate max-w-[200px]">{label}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Image container — overflow scroll untuk panned zoom */}
          <div className="flex-1 overflow-auto flex items-center justify-center">
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <motion.img
              src={url}
              alt={label || "foto"}
              onLoad={() => setLoaded(true)}
              animate={{ scale, opacity: loaded ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="max-w-full max-h-full object-contain cursor-zoom-in select-none"
              style={{
                // Touch pinch-to-zoom native
                touchAction: "manipulation",
                transformOrigin: "center center",
              }}
              draggable={false}
            />
          </div>

          {/* Bottom controls */}
          <div className="flex justify-center items-center gap-4 px-4 py-5 shrink-0">
            <button
              onClick={zoomOut}
              disabled={scale <= 1}
              className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-2xl transition-all text-white"
            >
              <ZoomOut size={18} />
            </button>
            <button
              onClick={reset}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-white text-xs font-black uppercase tracking-widest"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={zoomIn}
              disabled={scale >= 4}
              className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-2xl transition-all text-white"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={reset}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-white"
              title="Reset zoom"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
