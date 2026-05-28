"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle } from "lucide-react";

/**
 * Toast — Notifikasi pill mewah di atas layar
 *
 * Props:
 *  - isOpen: boolean
 *  - message: string
 *  - type: "error" | "success"
 */
export default function Toast({ isOpen, message, type = "error" }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-6 left-0 right-0 z-[999999] flex justify-center px-4 pointer-events-none"
        >
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-full shadow-2xl backdrop-blur-xl border ${
            type === "error"
              ? "bg-red-500/10 border-red-500/20 text-red-500 shadow-red-500/10"
              : "bg-green-500/10 border-green-500/20 text-green-500 shadow-green-500/10"
          }`}>
            {type === "error"
              ? <X size={15} />
              : <CheckCircle size={15} />
            }
            <span className="text-xs font-bold tracking-wide">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
