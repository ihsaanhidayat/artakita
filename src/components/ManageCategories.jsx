import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { Trash2, Plus, BookOpen, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // State untuk mengatur buka/tutup

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true });
    if (!error && data) setCategories(data);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const { error } = await supabase.from('categories').insert([{ name: name, alias: alias }]);
    setLoading(false);

    if (!error) {
      setName('');
      setAlias('');
      fetchCategories(); 
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) fetchCategories(); 
  };

  return (
    <div className="bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-xl border border-gray-100 dark:border-gray-800/60 w-full">
      {/* HEADER YANG BISA DIKLIK */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)} 
        className="w-full flex justify-between items-center outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl"><BookOpen size={18} /></div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest text-left">Bank Data AI</h3>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown size={20} className="text-gray-400 hover:text-blue-500 transition-colors" />
        </motion.div>
      </button>

      {/* KONTEN YANG BISA DILIPAT */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: "auto", opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            className="overflow-hidden"
          >
            <div className="pt-6">
              <form onSubmit={handleAddCategory} className="flex flex-col gap-3 mb-6 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Kategori Induk</label>
                  <input type="text" placeholder="Contoh: Makan" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-3 text-gray-900 dark:text-white outline-none focus:border-blue-500 text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Kosakata (Pisahkan koma)</label>
                  <input type="text" placeholder="Contoh: kopi, bakso, mcd" value={alias} onChange={(e) => setAlias(e.target.value)} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-3 text-gray-900 dark:text-white outline-none focus:border-blue-500 text-sm" />
                </div>
                <button type="submit" disabled={loading} className="w-full mt-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
                  <Plus size={16} /> Latih AI Sekarang
                </button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                <AnimatePresence>
                  {categories.length === 0 && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6 text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.3em] border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">Belum ada bank data</motion.p>
                  )}
                  {categories.map((cat) => (
                    <motion.div key={cat.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700 transition-all"
                    >
                      <div>
                        <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{cat.name}</span>
                        {cat.alias && <p className="text-[10px] text-blue-500 mt-1 italic opacity-80 leading-relaxed max-w-[200px] break-words">{cat.alias}</p>}
                      </div>
                      <button onClick={() => handleDelete(cat.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={16} /></button>
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