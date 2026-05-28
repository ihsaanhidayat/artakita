"use client";
import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, CreditCard, X, ChevronDown } from "lucide-react";
import { THEME_GRADIENTS } from "@/lib/utils";

/**
 * WalletSwitcher — Tap nama dompet di header → bottom sheet pilih dompet
 *
 * Props:
 *  - wallets: array
 *  - activeWallet: { id, name }
 *  - onSelect: (wallet) => void
 *  - session: supabase session
 */
const WalletSwitcher = memo(function WalletSwitcher({ wallets, activeWallet, onSelect, session }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (wallet) => {
    onSelect({ id: wallet.id, name: wallet.name });
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger — nama dompet di header */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 group"
      >
        <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 tracking-[0.15em] uppercase">
          {activeWallet?.name || "Pilih Dompet"}
        </p>
        <ChevronDown
          size={12}
          className="text-blue-500/60 group-hover:text-blue-500 transition-colors mt-0.5"
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm"
            />

            {/* Bottom sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-[96] bg-white dark:bg-[#0a0f1c] rounded-t-[32px] border-t border-gray-100 dark:border-gray-800 shadow-2xl pb-safe"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>

              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800/60">
                <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                  Pilih Dompet
                </p>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-4 py-3 space-y-2 max-h-[50dvh] overflow-y-auto no-scrollbar pb-6">
                {wallets.map((wallet, idx) => {
                  const isActive = activeWallet?.id === wallet.id;
                  const isOwner  = session?.user?.id === wallet.user_id;

                  return (
                    <button
                      key={wallet.id}
                      onClick={() => handleSelect(wallet)}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98] ${
                        isActive
                          ? "bg-blue-500/10 border-2 border-blue-500/40"
                          : "bg-gray-50 dark:bg-gray-900/40 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                      }`}
                    >
                      {/* Color dot */}
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${THEME_GRADIENTS[idx % THEME_GRADIENTS.length]} flex items-center justify-center shrink-0`}>
                        <CreditCard size={16} className="text-white" />
                      </div>

                      <div className="flex-1 text-left min-w-0">
                        <p className="font-black text-sm text-gray-900 dark:text-white truncate">
                          {wallet.name}
                        </p>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                          {isOwner ? "Rekening Pribadi" : "Shared Wallet"}
                        </p>
                      </div>

                      {isActive && (
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                          <CheckCircle2 size={16} className="text-blue-500" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});

export default WalletSwitcher;
