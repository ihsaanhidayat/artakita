"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { BrainCircuit, ChevronDown, Check, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CategoryEntry {
  id: string;
  name: string;
  keywords: string;
}

interface DbCategory {
  id: string;
  name: string;
}

interface DbKeyword {
  category_id: string;
  keyword: string;
}

interface TrxRow {
  note: string | null;
  category: string | null;
}

let aiHasRun = false;

export default function ManageCategories() {
  const [categories,     setCategories]     = useState<CategoryEntry[]>([]);
  const [selectedCat,    setSelectedCat]    = useState<CategoryEntry | null>(null);
  const [keywordsInput,  setKeywordsInput]  = useState('');
  const [isExpanded,     setIsExpanded]     = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading,        setLoading]        = useState(false);

  useEffect(() => {
    void fetchAiBrainData();
    if (!aiHasRun) {
      aiHasRun = true;
      void runAmbientAI().then(() => fetchAiBrainData());
    }
  }, []);

  async function runAmbientAI(): Promise<void> {
    try {
      const { data: trxData } = await supabase.from('transactions').select('note, category');
      if (!trxData || trxData.length === 0) return;

      const { data: dbCats } = await supabase.from('user_categories').select('id, name');
      const { data: dbKeys } = await supabase.from('ai_keywords').select('category_id, keyword');

      const catMap = new Map<string, string>((dbCats as DbCategory[] || []).map(c => [c.name.toLowerCase().trim(), c.id]));
      const existingKeys = new Set<string>((dbKeys as DbKeyword[] || []).map(k => `${k.category_id}-${k.keyword.toLowerCase()}`));

      const finalKeywordsToInsert: { category_id: string; keyword: string }[] = [];

      for (const trx of trxData as TrxRow[]) {
        if (!trx.category || !trx.note) continue;

        let catId = catMap.get(trx.category.toLowerCase().trim());
        if (!catId) {
          const { data: newCat } = await supabase.from('user_categories').insert([{ name: trx.category }]).select('id').single();
          if (newCat) {
            catId = (newCat as DbCategory).id;
            catMap.set(trx.category.toLowerCase().trim(), catId);
          }
        }
        if (!catId) continue;

        const words = trx.note.toLowerCase()
          .replace(/(beli|bayar|untuk|buat|lagi|dari|ke|di)\s+/g, '')
          .replace(/[0-9]/g, '')
          .trim()
          .split(/\s+/);

        for (const kw of words) {
          if (kw.length > 2) {
            const keyHash = `${catId}-${kw}`;
            if (!existingKeys.has(keyHash)) {
              existingKeys.add(keyHash);
              finalKeywordsToInsert.push({ category_id: catId, keyword: kw });
            }
          }
        }
      }

      if (finalKeywordsToInsert.length > 0) {
        await supabase.from('ai_keywords').upsert(finalKeywordsToInsert, {
          onConflict: 'category_id, keyword',
          ignoreDuplicates: true,
        });
      }
    } catch (e) {
      console.error("AI Learning Error:", e);
    }
  }

  async function fetchAiBrainData(): Promise<void> {
    const { data: cats } = await supabase.from('user_categories').select('*').order('name', { ascending: true });
    const { data: keys } = await supabase.from('ai_keywords').select('*');

    if (cats && keys) {
      const combinedData: CategoryEntry[] = (cats as DbCategory[]).map(c => {
        const relatedKeys = (keys as DbKeyword[]).filter(k => k.category_id === c.id).map(k => k.keyword);
        return { id: c.id, name: c.name, keywords: relatedKeys.join(', ') };
      });
      setCategories(combinedData);
    }
  }

  const handleSelectCategory = (cat: CategoryEntry): void => {
    setSelectedCat(cat);
    setKeywordsInput(cat.keywords || '');
    setIsDropdownOpen(false);
  };

  const handleUpdateMemory = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!selectedCat) return;
    setLoading(true);

    await supabase.from('ai_keywords').delete().eq('category_id', selectedCat.id);

    if (keywordsInput.trim()) {
      const keywordArray = [...new Set(keywordsInput.split(',').map(k => k.trim().toLowerCase()).filter(k => k))];
      const insertData = keywordArray.map(kw => ({ category_id: selectedCat.id, keyword: kw }));
      if (insertData.length > 0) await supabase.from('ai_keywords').insert(insertData);
    }

    setSelectedCat(null);
    setKeywordsInput('');
    setLoading(false);
    void fetchAiBrainData();
  };

  return (
    <div className="ds-bg-1 rounded-[32px] p-6 sm:p-8 shadow-sm border ds-border w-full transition-all">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex justify-between items-center outline-none group">
        <div className="flex items-center gap-4">
          <div className="p-3 text-white rounded-2xl shadow-lg group-hover:scale-105 transition-transform" style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))", boxShadow: "0 8px 24px color-mix(in srgb, var(--a1) 30%, transparent)" }}>
            <BrainCircuit size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-sm sm:text-base font-black ds-t1 uppercase tracking-widest">Memori Otak AI</h3>
            <p className="text-caption sm:text-xs font-bold ds-t3 mt-0.5">Automasi & Intervensi Data</p>
          </div>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }} className="ds-bg-3 p-2 rounded-full">
          <ChevronDown size={20} className="ds-t3 group-hover:text-[var(--a1)] transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-8">
              <form onSubmit={handleUpdateMemory} className="flex flex-col gap-5 ds-bg-3 p-5 sm:p-6 rounded-[24px] border ds-border relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Database size={100} />
                </div>

                <div className="relative z-20">
                  <label className="block text-caption font-black ds-t3 uppercase tracking-[0.2em] mb-1.5 ml-1">Kategori (Dari AI)</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full ds-bg-0 border ds-border rounded-2xl py-3.5 px-4 text-left text-sm font-bold ds-t1 flex justify-between items-center outline-none focus:border-[var(--a1)] hover:border-[var(--a1)] transition-all"
                    >
                      {selectedCat ? (
                        <span className="ds-t1">{selectedCat.name}</span>
                      ) : (
                        <span className="ds-t3 font-normal">-- Pilih kategori --</span>
                      )}
                      <ChevronDown size={18} className={`ds-t3 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} style={isDropdownOpen ? { color: "var(--a1)" } : undefined} />
                    </button>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 right-0 mt-2 ds-bg-1 border ds-border rounded-2xl shadow-xl overflow-hidden z-[99]"
                        >
                          <div className="max-h-56 overflow-y-auto no-scrollbar py-2">
                            {categories.length === 0 ? (
                              <div className="px-5 py-4 text-xs font-bold ds-t3 text-center">AI belum mempelajari data.</div>
                            ) : (
                              categories.map(cat => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => handleSelectCategory(cat)}
                                  className="w-full text-left px-5 py-3.5 text-sm font-bold ds-t1 transition-all border-l-4"
                                  style={selectedCat?.id === cat.id
                                    ? { color: "var(--a1)", background: "color-mix(in srgb, var(--a1) 10%, transparent)", borderLeftColor: "var(--a1)" }
                                    : { borderLeftColor: "transparent" }
                                  }
                                >
                                  {cat.name}
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="relative z-10 border-t ds-border pt-4 mt-2">
                  <label className="block text-caption font-black ds-t3 uppercase tracking-[0.2em] mb-1.5 ml-1">Kosakata Tersimpan (Koma)</label>
                  <input
                    type="text"
                    placeholder="Pilih kategori di atas untuk memuat kosakata..."
                    value={keywordsInput}
                    onChange={e => setKeywordsInput(e.target.value)}
                    disabled={!selectedCat}
                    className="w-full ds-bg-0 border ds-border rounded-2xl py-3.5 px-4 ds-t1 outline-none focus:border-[var(--a1)] text-sm font-bold transition-all disabled:opacity-50"
                  />
                </div>

                <button type="submit" disabled={loading || !selectedCat} className="w-full py-4 text-white font-black text-caption sm:text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 relative z-10" style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))" }}>
                  <Check size={16} /> Simpan Perubahan
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
