import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { Trash2, Plus, Target, ChevronDown, PieChart, X as XIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ManageBudgets({ selectedMonth }) {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // STATE BARU: Untuk Inline Confirm Delete ala AI Memory
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    if (isExpanded) {
      fetchData();
    }
  }, [isExpanded, selectedMonth]); 

  const fetchData = async () => {
    const { data: aiData } = await supabase.from('user_categories').select('name');
    const { data: trxData } = await supabase.from('transactions').select('category');

    const aiCats = aiData ? aiData.map(c => c.name) : [];
    const trxCats = trxData ? trxData.map(t => t.category) : [];

    const merged = [...new Set([...aiCats, ...trxCats])].filter(Boolean).sort();
    setCategories(merged);

    const { data: budData } = await supabase.from('budgets').select('*').eq('month_year', selectedMonth);
    if (budData) setBudgets(budData);
  };

  const handleAddBudget = async (e) => {
    e.preventDefault();
    if (!selectedCategory || !limitAmount) return;
    setLoading(true);

    const { error } = await supabase.from('budgets').insert([{ 
      category_name: selectedCategory, 
      month_year: selectedMonth,
      limit_amount: limitAmount 
    }]);
    
    setLoading(false);

    if (error) {
      if (error.code === '23505') alert("Anggaran untuk kategori ini sudah ada di bulan ini!");
      else alert("Gagal: " + error.message);
    } else {
      setSelectedCategory('');
      setLimitAmount('');
      setIsDropdownOpen(false); 
      fetchData(); 
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (!error) {
      setDeleteConfirmId(null);
      fetchData(); 
    }
  };

  return (
    <div className="bg-white dark:bg-[#121827] rounded-[32px] p-6 sm:p-8 shadow-2xl shadow-emerald-500/5 border border-gray-100 dark:border-gray-800/60 w-full transition-all">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex justify-between items-center outline-none group">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-emerald-400 to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform">
            <Target size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white uppercase tracking-widest">Alokasi Anggaran</h3>
            <span className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 mt-0.5">Periode: {selectedMonth}</span>
          </div>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }} className="bg-gray-50 dark:bg-gray-800 p-2 rounded-full">
          <ChevronDown size={20} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-8">
              <form onSubmit={handleAddBudget} className="flex flex-col gap-5 mb-6 bg-gray-50/80 dark:bg-gray-900/40 p-5 rounded-[24px] border border-gray-100 dark:border-gray-800/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <PieChart size={100} />
                </div>
                
                {/* CUSTOM LUXURY DROPDOWN UI */}
                <div className="relative z-20">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Pilih Kategori</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full bg-white dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-3.5 px-4 text-left text-sm font-bold text-gray-900 dark:text-white shadow-sm flex justify-between items-center outline-none focus:border-emerald-500 hover:border-emerald-500/50 transition-all"
                    >
                      {selectedCategory ? (
                        <span className="text-gray-900 dark:text-white">{selectedCategory}</span>
                      ) : (
                        <span className="text-gray-400 font-normal">-- Ketuk untuk memilih --</span>
                      )}
                      <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-emerald-500' : ''}`} />
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
                              <div className="px-5 py-4 text-xs font-bold text-gray-400 text-center">Belum ada kategori terdeteksi.</div>
                            ) : (
                              categories.map((cat, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => { setSelectedCategory(cat); setIsDropdownOpen(false); }}
                                  className={`w-full text-left px-5 py-3.5 text-sm font-bold transition-all ${
                                    selectedCategory === cat 
                                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-l-4 border-emerald-500' 
                                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-transparent'
                                  }`}
                                >
                                  {cat}
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
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Batas Maksimal (Rp)</label>
                  <input type="number" placeholder="Contoh: 500000" value={limitAmount} onChange={(e) => setLimitAmount(e.target.value)} required className="w-full bg-white dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-3.5 px-4 text-gray-900 dark:text-white outline-none focus:border-emerald-500 text-sm font-bold shadow-sm transition-all" />
                </div>
                
                <button type="submit" disabled={loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-50 relative z-10">
                  <Plus size={16} /> Tetapkan Pos Anggaran
                </button>
              </form>

              {/* DESAIN LIST ULTRA-MINIMALIS (SAMA PERSIS DENGAN AI MEMORY) */}
              <div className="flex flex-col border border-gray-100 dark:border-gray-800/80 rounded-[20px] overflow-hidden">
                <AnimatePresence>
                  {budgets.length === 0 ? (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8 text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.3em] bg-gray-50/50 dark:bg-gray-900/20">
                      Belum Ada Pos Anggaran
                    </motion.p>
                  ) : (
                    budgets.map((budget, index) => (
                      <motion.div key={budget.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                        className={`group flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40 ${index !== budgets.length - 1 ? 'border-b border-gray-100 dark:border-gray-800/60' : ''}`}
                      >
                        <div className="flex-1 w-full sm:pr-4">
                          <span className="font-bold text-sm text-gray-900 dark:text-white">{budget.category_name}</span>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">LIMIT</span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">Rp {Number(budget.limit_amount).toLocaleString('id-ID')}</span>
                          </div>
                        </div>

                        {/* INLINE ACTIONS: Bersih & Tanpa Popup */}
                        <div className="flex items-center gap-1 mt-3 sm:mt-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity self-end sm:self-center shrink-0">
                          {deleteConfirmId === budget.id ? (
                            <div className="flex items-center bg-red-50 dark:bg-red-500/10 rounded-lg overflow-hidden border border-red-100 dark:border-red-500/20">
                              <button onClick={() => handleDelete(budget.id)} className="px-3 py-1.5 text-[9px] font-black text-red-500 hover:bg-red-500 hover:text-white uppercase tracking-widest transition-colors">
                                Yakin?
                              </button>
                              <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors border-l border-red-100 dark:border-red-500/20">
                                <XIcon size={12} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirmId(budget.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}