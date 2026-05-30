"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle } from "lucide-react";

/**
 * Toast — notifikasi pill di dekat QuickCommandBar (bottom)
 * Props: isOpen, message, type ("error"|"success"), position ("bottom"|"top")
 */
export default function Toast({ isOpen, message, type = "error", position = "bottom" }) {
  const isBottom = position === "bottom";
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: isBottom ? 20 : -20, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: isBottom ? 12 : -12, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className={`fixed ${isBottom ? "bottom-[160px]" : "top-6"} left-0 right-0 z-[999] flex justify-center px-4 pointer-events-none`}
        >
          <div className={`flex items-center gap-2.5 px-5 py-3 rounded-full shadow-2xl backdrop-blur-xl border max-w-xs text-center ${
            type === "error"
              ? "bg-red-500/15 border-red-500/25 text-red-400 shadow-red-500/10"
              : "bg-green-500/15 border-green-500/25 text-green-400 shadow-green-500/10"
          }`}>
            {type === "error"
              ? <X size={13} className="shrink-0" />
              : <CheckCircle size={13} className="shrink-0" />
            }
            <span className="text-xs font-bold tracking-wide">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
