import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { Trash2, Plus, Target, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ManageBudgets({ selectedMonth }) {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    const { data: catData } = await supabase.from('categories').select('name').order('name');
    if (catData) setCategories(catData);

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
      fetchData(); 
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (!error) fetchData(); 
  };

  return (
    <div className="bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-xl border border-gray-100 dark:border-gray-800/60 w-full">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex justify-between items-center outline-none">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl"><Target size={18} /></div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Alokasi Anggaran</h3>
            <span className="text-[9px] font-black text-gray-400 tracking-widest uppercase mt-0.5">{selectedMonth}</span>
          </div>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown size={20} className="text-gray-400 hover:text-emerald-500 transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-6">
              <form onSubmit={handleAddBudget} className="flex flex-col gap-3 mb-6 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Pos Kategori</label>
                  <select required value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-3 text-gray-900 dark:text-white outline-none focus:border-emerald-500 text-sm font-bold">
                    <option value="" disabled>-- Pilih Pos Anggaran --</option>
                    {categories.map((cat, idx) => (
                      <option key={idx} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Batas Maksimal (Rp)</label>
                  <input type="number" placeholder="Contoh: 500000" value={limitAmount} onChange={(e) => setLimitAmount(e.target.value)} required className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-3 text-gray-900 dark:text-white outline-none focus:border-emerald-500 text-sm font-bold" />
                </div>
                <button type="submit" disabled={loading} className="w-full mt-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2">
                  <Plus size={16} /> Tetapkan Pos
                </button>
              </form>

              <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                <AnimatePresence>
                  {budgets.length === 0 && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6 text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.3em] border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">Belum ada pos di bulan ini</motion.p>
                  )}
                  {budgets.map((budget) => (
                    <motion.div key={budget.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800/50">
                      <div>
                        <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{budget.category_name}</span>
                        <p className="text-[10px] text-gray-500 font-black tracking-widest mt-0.5">LIMIT: RP {Number(budget.limit_amount).toLocaleString('id-ID')}</p>
                      </div>
                      <button onClick={() => handleDelete(budget.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={16} /></button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}