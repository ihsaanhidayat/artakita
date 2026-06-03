"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";

export default function Toast({ isOpen, message, type = "error" }) {
  const isSuccess = type === "success";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed top-8 left-0 right-0 z-[999999] flex justify-center px-4 pointer-events-none"
        >
          {/* Hanya Flex container murni, tanpa background sama sekali */}
          <div className="flex items-center gap-2.5">

            {/* Ikon Merah / Hijau */}
            {isSuccess ? (
              <Check size={16} strokeWidth={4} className="text-green-500 drop-shadow-md" />
            ) : (
              <X size={16} strokeWidth={4} className="text-red-500 drop-shadow-md" />
            )}

            {/* Teks Merah / Hijau */}
            <span className={`text-[12px] font-black uppercase tracking-widest drop-shadow-md ${isSuccess ? "text-green-500" : "text-red-500"
              }`}>
              {message}
            </span>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}