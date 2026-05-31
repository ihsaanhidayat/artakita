"use client";
import { memo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * CategoryPills — Pill selector kategori yang elegant
 * Menampilkan kategori sebagai pill yang bisa diklik
 * Input teks juga tetap bisa untuk kategori baru
 */
const CategoryPills = memo(function CategoryPills({
  value, onChange, categories = [], placeholder = "Pilih kategori...", className = ""
}) {
  const [isOpen,    setIsOpen]    = useState(false);
  const [inputVal,  setInputVal]  = useState(value || "");

  const filtered = categories.filter(c =>
    c.toLowerCase().includes(inputVal.toLowerCase())
  );

  const select = (cat) => {
    onChange(cat);
    setInputVal(cat);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input + dropdown trigger */}
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800/60 pb-1">
        <input
          type="text"
          value={inputVal}
          placeholder={placeholder}
          onChange={e => { setInputVal(e.target.value); onChange(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className="flex-1 bg-transparent outline-none font-bold text-sm text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-700"
        />
        <button type="button" onClick={() => setIsOpen(p => !p)}
          className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Dropdown pills */}
      <AnimatePresence>
        {isOpen && filtered.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#0d1117] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl z-[111] p-2 max-h-48 overflow-y-auto no-scrollbar"
            >
              <div className="flex flex-wrap gap-1.5">
                {filtered.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => select(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      value === cat
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-500/10 hover:text-blue-500"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
});

export default CategoryPills;
