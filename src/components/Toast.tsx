"use client";
import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle } from "lucide-react";

interface ToastProps {
  isOpen: boolean;
  message: string;
  type?: "error" | "success";
  position?: "bottom" | "top";
}

const Toast = function Toast({ isOpen, message, type = "error", position = "bottom" }: ToastProps) {
  const isBottom = position === "bottom";
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: isBottom ? 20 : -20, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: isBottom ? 12 : -12, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className={`fixed ${isBottom ? "bottom-[160px]" : "top-6"} left-0 right-0 z-[99] flex justify-center px-4 pointer-events-none`}
        >
          <div
            className="flex items-center gap-2.5 px-5 py-3 rounded-full shadow-2xl backdrop-blur-xl border max-w-xs text-center"
            style={type === "error"
              ? { background: "color-mix(in srgb, var(--a3) 15%, transparent)", borderColor: "color-mix(in srgb, var(--a3) 25%, transparent)", color: "var(--a3)", boxShadow: "0 8px 32px color-mix(in srgb, var(--a3) 15%, transparent)" }
              : { background: "color-mix(in srgb, var(--income) 15%, transparent)", borderColor: "color-mix(in srgb, var(--income) 25%, transparent)", color: "var(--income)", boxShadow: "0 8px 32px color-mix(in srgb, var(--income) 15%, transparent)" }
            }
          >
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
};

export default memo(Toast);
