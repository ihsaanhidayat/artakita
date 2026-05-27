import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { BrainCircuit, ChevronDown, Check, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

let aiHasRun = false;

export default function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [keywordsInput, setKeywordsInput] = useState('');
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAiBrainData();

    if (!aiHasRun) {
      aiHasRun = true;
      runAmbientAI().then(() => fetchAiBrainData());
    }
  }, []);

  // =========================================================================
  // 🤖 AI CORE: BATCH UPSERT (100% ANTI 409 CONFLICT)
  // =========================================================================
  const runAmbientAI = async () => {
    try {
      const { data: trxData } = await supabase.from('transactions').select('note, category');
      if (!trxData || trxData.length === 0) return;

      // 1. Ambil data kategori & kunci yang sudah ada (untuk filter lokal)
      const { data: dbCats } = await supabase.from('user_categories').select('id, name');
      const { data: dbKeys } = await supabase.from('ai_keywords').select('category_id, keyword');
      
      const catMap = new Map(dbCats.map(c => [c.name.toLowerCase().trim(), c.id]));
      const existingKeys = new Set(dbKeys.map(k => `${k.category_id}-${k.keyword.toLowerCase()}`));

      const finalKeywordsToInsert = [];

      // 2. Proses data di memori (Tanpa menunggu database sama sekali)
      for (const trx of trxData) {
        if (!trx.category || !trx.note) continue;

        let catId = catMap.get(trx.category.toLowerCase().trim());

        // Jika kategori baru, buat ID baru secara lokal
        if (!catId) {
          const { data: newCat } = await supabase.from('user_categories').insert([{ name: trx.category }]).select('id').single();
          if (newCat) {
            catId = newCat.id;
            catMap.set(trx.category.toLowerCase().trim(), catId);
          }
        }

        const words = trx.note.toLowerCase().replace(/(beli|bayar|untuk|buat|lagi|dari|ke|di)\s+/g, '').replace(/[0-9]/g, '').trim().split(/\s+/);
        
        for (const kw of words) {
          if (kw.length > 2) {
            const keyHash = `${catId}-${kw}`;
            // Hanya masukkan ke antrean jika belum ada di Set Lokal
            if (!existingKeys.has(keyHash)) {
              existingKeys.add(keyHash);
              finalKeywordsToInsert.push({ category_id: catId, keyword: kw });
            }
          }
        }
      }

      // 3. KIRIM SEKALIGUS DALAM 1 REQUEST (Batch Upsert)
      if (finalKeywordsToInsert.length > 0) {
        console.log("Mengirim batch data ke Supabase:", finalKeywordsToInsert.length, "item");
        await supabase.from('ai_keywords').upsert(finalKeywordsToInsert, { 
          onConflict: 'category_id, keyword', 
          ignoreDuplicates: true 
        });
        console.log("Sinkronisasi AI Selesai!");
      }
    } catch (e) {
      console.error("AI Learning Error:", e);
    }
  };

  const fetchAiBrainData = async () => {
    const { data: cats } = await supabase.from('user_categories').select('*').order('name', { ascending: true });
    const { data: keys } = await supabase.from('ai_keywords').select('*');

    if (cats && keys) {
      const combinedData = cats.map(c => {
        const relatedKeys = keys.filter(k => k.category_id === c.id).map(k => k.keyword);
        return { id: c.id, name: c.name, keywords: relatedKeys.join(', ') };
      });
      setCategories(combinedData);
    }
  };

  const handleSelectCategory = (cat) => {
    setSelectedCat(cat);
    setKeywordsInput(cat.keywords || ''); 
    setIsDropdownOpen(false);
  };

  const handleUpdateMemory = async (e) => {
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
    fetchAiBrainData();
  };

  return (
    <div className="bg-white dark:bg-[#121827] rounded-[32px] p-6 sm:p-8 shadow-2xl shadow-blue-500/5 border border-gray-100 dark:border-gray-800/60 w-full transition-all">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex justify-between items-center outline-none group">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
            <BrainCircuit size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white uppercase tracking-widest">Memori Otak AI</h3>
            <p className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 mt-0.5">Automasi & Intervensi Data</p>
          </div>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }} className="bg-gray-50 dark:bg-gray-800 p-2 rounded-full">
          <ChevronDown size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-8">
              
              <form onSubmit={handleUpdateMemory} className="flex flex-col gap-5 bg-gray-50/80 dark:bg-gray-900/40 p-5 sm:p-6 rounded-[24px] border border-gray-100 dark:border-gray-800/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Database size={100} />
                </div>
                
                <div className="relative z-20">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Kategori (Dari AI)</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full bg-white dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-3.5 px-4 text-left text-sm font-bold text-gray-900 dark:text-white shadow-sm flex justify-between items-center outline-none focus:border-blue-500 hover:border-blue-500/50 transition-all"
                    >
                      {selectedCat ? (
                        <span className="text-gray-900 dark:text-white">{selectedCat.name}</span>
                      ) : (
                        <span className="text-gray-400 font-normal">-- Pilih kategori --</span>
                      )}
                      <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#121827] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-[99]"
                        >
                          <div className="max-h-56 overflow-y-auto no-scrollbar py-2">
                            {categories.length === 0 ? (
                              <div className="px-5 py-4 text-xs font-bold text-gray-400 text-center">AI belum mempelajari data.</div>
                            ) : (
                              categories.map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => handleSelectCategory(cat)}
                                  className={`w-full text-left px-5 py-3.5 text-sm font-bold transition-all ${
                                    selectedCat?.id === cat.id 
                                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-l-4 border-blue-500' 
                                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-transparent'
                                  }`}
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
                
                <div className="relative z-10 border-t border-gray-200/50 dark:border-gray-800/50 pt-4 mt-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Kosakata Tersimpan (Koma)</label>
                  <input 
                    type="text" 
                    placeholder="Pilih kategori di atas untuk memuat kosakata..." 
                    value={keywordsInput} 
                    onChange={(e) => setKeywordsInput(e.target.value)} 
                    disabled={!selectedCat}
                    className="w-full bg-white dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-3.5 px-4 text-gray-900 dark:text-white outline-none focus:border-blue-500 text-sm font-bold shadow-sm transition-all disabled:opacity-50" 
                  />
                </div>
                
                <button type="submit" disabled={loading || !selectedCat} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50 relative z-10">
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