"use client";
import { memo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CategoryPillsProps {
  value: string;
  onChange: (value: string) => void;
  categories?: string[];
  placeholder?: string;
  className?: string;
}

const CategoryPills = memo(function CategoryPills({
  value, onChange, categories = [], placeholder = "Pilih kategori...", className = ""
}: CategoryPillsProps) {
  const [isOpen,   setIsOpen]   = useState(false);
  const [inputVal, setInputVal] = useState(value || "");

  const filtered = categories.filter(c =>
    c.toLowerCase().includes(inputVal.toLowerCase())
  );

  const select = (cat: string): void => {
    onChange(cat);
    setInputVal(cat);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800/60 pb-1">
        <input
          type="text"
          value={inputVal}
          placeholder={placeholder}
          onChange={e => { setInputVal(e.target.value); onChange(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className="flex-1 bg-transparent outline-none font-bold text-sm ds-t1 placeholder:opacity-30"
        />
        <button type="button" onClick={() => setIsOpen(p => !p)}
          className="ds-t3 hover:opacity-70 transition-opacity shrink-0">
          <ChevronDown size={14} />
        </button>
      </div>

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
                    className="px-3 py-1.5 rounded-xl text-caption font-black uppercase tracking-widest transition-all"
                    style={value === cat
                      ? { background: "var(--a2)", color: "#fff" }
                      : { background: "color-mix(in srgb, var(--a2) 8%, transparent)", color: "var(--text-2)" }
                    }
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
