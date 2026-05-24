"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, ArrowUpCircle, ArrowDownCircle, Coffee, ShoppingBag, Receipt, Layers, Trash2, Edit3, Home as HomeIcon, PieChart as PieChartIcon, CreditCard, Settings, Plus, X, Command } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import QuickCommandBar from "@/components/QuickCommandBar";
import { useFinData } from "@/hooks/useFinData";
import { useWallets } from "@/hooks/useWallets"; // TAMBAHAN: Hook untuk tarik data dompet
import { supabase } from "@/lib/supabaseClient";

const formatDateTime = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const day = days[date.getDay()];
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${day}, ${d}-${m}-${y} ${hh}:${min}`;
};

export default function Home() {
  // --- 1. STATE MANAGEMENT ---
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [filter, setFilter] = useState("Semua");
  const [activeTab, setActiveTab] = useState("home");
  const [mounted, setMounted] = useState(false);
  const [activeWallet, setActiveWallet] = useState({ id: "dompet-1", name: "Dompet Utama" });

  // TAMBAHAN: State dan hook untuk sistem multi-wallet
  const { wallets, addWallet } = useWallets();
  const [newWalletModal, setNewWalletModal] = useState({ isOpen: false, name: '' });

  // TAMBAHAN: Auto-set dompet pertama saat data selesai ditarik dari database
  useEffect(() => {
    if (wallets.length > 0 && activeWallet.id === "dompet-1") {
      setActiveWallet({ id: wallets[0].id, name: wallets[0].name });
    }
  }, [wallets, activeWallet.id]);

  // TAMBAHAN: Fungsi eksekusi tambah dompet
  const handleCreateWallet = async (e) => {
    e.preventDefault();
    if (!newWalletModal.name.trim()) return;
    const result = await addWallet(newWalletModal.name);
    if (result) {
      setNewWalletModal({ isOpen: false, name: '' });
      setActiveWallet({ id: result.id, name: result.name });
      setActiveTab('home'); 
    }
  };

  const getMonths = () => {
    const m = [];
    const d = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    for (let i = -3; i <= 2; i++) {
      const temp = new Date(d.getFullYear(), d.getMonth() + i, 1);
      const val = `${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}`;
      const lbl = `${monthNames[temp.getMonth()]} ${temp.getFullYear()}`;
      m.push({ value: val, label: lbl });
    }
    return m;
  };
  const [recentMonths] = useState(getMonths());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // STATE BARU UNTUK SMART COMMAND
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [smartCommand, setSmartCommand] = useState("");

  // --- 2. DATA BINDING ---
  const { balance, transactions, addTransaction, deleteTransaction, updateTransaction } = useFinData(activeWallet.id);

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- 3. LOGIKA FILTER BULAN ---
  const transactionsThisMonth = transactions.filter(t => {
    if (!t.created_at) return true; 
    return t.created_at.startsWith(selectedMonth);
  });

  const incomeThisMonth = transactionsThisMonth.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const expenseThisMonth = transactionsThisMonth.filter(t => t.type === 'expense' || !t.type).reduce((acc, curr) => acc + Number(curr.amount), 0);

  const existingCategories = [...new Set(transactions.map(t => t.category))];
  const dynamicCategories = ["Semua", "Pemasukan", "Pengeluaran", ...existingCategories]; 
  const CHART_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  // --- 4. HELPER & SMART PARSER ---
  const getIcon = (category) => {
    switch (category) {
      case 'Makan': return <Coffee size={18} />;
      case 'Belanja': return <ShoppingBag size={18} />;
      case 'Tagihan': return <Receipt size={18} />;
      default: return <Layers size={18} />;
    }
  };

  const handleEdit = (trx) => {
    const newNote = prompt("Ubah Catatan:", trx.note);
    const newCategory = prompt("Ubah Kategori:", trx.category);
    if (newNote && newCategory) updateTransaction(trx.id, newNote, newCategory);
  };

  // MESIN PINTAR PEMBACA PERINTAH SATU BARIS
  const handleSmartSubmit = async (e) => {
    e.preventDefault();
    if (!smartCommand.trim()) return;

    // Regex pembaca pola: (in|out) (angka[bisa k/jt]) (keterangan)
    const regex = /^(in|out)\s+(\d+(?:[.,]\d+)?[kKmM]?[jJ]?[tT]?)\s+(.+)$/i;
    const match = smartCommand.trim().match(regex);

    if (!match) {
      alert("Format tidak valid!\nGunakan format: [in/out] [angka] [catatan]\nContoh: out 50k beli pulsa");
      return;
    }

    const type = match[1].toLowerCase() === 'in' ? 'income' : 'expense';
    let rawAmount = match[2].toLowerCase();
    let amount = 0;

    // Parser huruf ke angka (k = ribu, jt/m = juta)
    if (rawAmount.includes('k')) {
      amount = parseFloat(rawAmount.replace('k', '')) * 1000;
    } else if (rawAmount.includes('jt') || rawAmount.includes('m')) {
      amount = parseFloat(rawAmount.replace(/[jm]t?/g, '')) * 1000000;
    } else {
      amount = parseFloat(rawAmount);
    }

    const note = match[3].trim();
    
    // Auto-Kategori Pintar (Keyword Matching)
    let category = "Lainnya";
    const noteLower = note.toLowerCase();
    if (/(makan|minum|kopi|bakso|rokok|jajan|kfc|mcd)/.test(noteLower)) category = "Makan";
    else if (/(belanja|supermarket|indomaret|alfamart|sayur|pasar|baju)/.test(noteLower)) category = "Belanja";
    else if (/(listrik|air|tagihan|pulsa|kuota|wifi|internet|cicilan)/.test(noteLower)) category = "Tagihan";

    // Kirim ke database
    await addTransaction(note, amount, category, type);
    
    // Reset & Tutup Modal
    setSmartCommand("");
    setIsModalOpen(false);
  };

  // 2. Update Logika Filter
  const filteredTransactions = transactionsThisMonth.filter(t => {
    if (filter === "Semua") return true;
    if (filter === "Pemasukan") return t.type === 'income';
    if (filter === "Pengeluaran") return t.type === 'expense' || !t.type;
    return t.category === filter;
  });

  // --- 5. KOMPONEN: DASHBOARD UTAMA (HOME) ---
  const HomeTab = () => {
    // 1. STATE UNTUK FILTER GANDA & MODAL EDIT
    const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'income', 'expense'
    const [categoryFilter, setCategoryFilter] = useState('Semua');
    const [editModal, setEditModal] = useState({ isOpen: false, data: null });

    // 2. HELPER TANGGAL
    const formatDateTime = (isoString) => {
      if (!isoString) return "";
      const date = new Date(isoString);
      const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      const day = days[date.getDay()];
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = String(date.getFullYear()).slice(-2);
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${day}, ${d}-${m}-${y} ${hh}:${min}`;
    };

    // 3. LOGIKA FILTER GANDA (Tipe & Kategori)
    const existingCategories = [...new Set(transactionsThisMonth.map(t => t.category))];
    const dynamicCategories = ["Semua", ...existingCategories];

    const filteredTransactions = transactionsThisMonth.filter(t => {
      const matchType = typeFilter === 'all' ? true : (typeFilter === 'income' ? t.type === 'income' : (t.type === 'expense' || !t.type));
      const matchCat = categoryFilter === 'Semua' ? true : t.category === categoryFilter;
      return matchType && matchCat;
    });

    // 4. FUNGSI SIMPAN EDIT
    const handleSaveEdit = async (e) => {
      e.preventDefault();
      if (!editModal.data.note || !editModal.data.amount || !editModal.data.category) return;
      
      await updateTransaction(editModal.data.id, editModal.data.note, editModal.data.category, editModal.data.amount);
      setEditModal({ isOpen: false, data: null });
    };

    return (
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="pt-8 px-4 h-[100dvh] flex flex-col">
        
        {/* ======================================= */}
        {/* AREA FREEZE (TETAP STATIS DI ATAS)      */}
        {/* ======================================= */}
        <div className="flex-none">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">ArtaKita.</h1>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-[0.2em] uppercase mt-1">{activeWallet.name}</p>
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 transition-all active:scale-90">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          {/* Balance Card dengan Filter IN/OUT */}
          <div className="bg-white dark:bg-[#121827] rounded-[32px] p-7 shadow-2xl shadow-blue-500/10 border border-gray-100 dark:border-gray-800/60 mb-6">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.3em] mb-3">Total Saldo (Semua Waktu)</p>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-2xl font-bold text-gray-300 dark:text-gray-700">Rp</span>
              <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{balance.toLocaleString('id-ID')}</span>
            </div>
            
            <p className="text-[9px] font-black text-blue-500/60 dark:text-blue-400/60 uppercase tracking-widest mb-2 border-t border-gray-100 dark:border-gray-800 pt-3">Sirkulasi Bulan Ini</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setTypeFilter(typeFilter === 'income' ? 'all' : 'income')} className={`p-4 rounded-2xl border transition-all ${typeFilter === 'income' ? 'bg-green-500/10 border-green-500 shadow-lg shadow-green-500/20' : 'bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800/50'}`}>
                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500 mb-1"><ArrowDownCircle size={14} /><span className="text-[9px] font-black uppercase tracking-wider">In</span></div>
                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">Rp {incomeThisMonth.toLocaleString('id-ID')}</p>
              </button>
              <button onClick={() => setTypeFilter(typeFilter === 'expense' ? 'all' : 'expense')} className={`p-4 rounded-2xl border transition-all ${typeFilter === 'expense' ? 'bg-red-500/10 border-red-500 shadow-lg shadow-red-500/20' : 'bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800/50'}`}>
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-500 mb-1"><ArrowUpCircle size={14} /><span className="text-[9px] font-black uppercase tracking-wider">Out</span></div>
                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">Rp {expenseThisMonth.toLocaleString('id-ID')}</p>
              </button>
            </div>
          </div>

          {/* Filter Kategori Dinamis (Dikembalikan & Diperkecil) */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar cursor-grab snap-x">
            {dynamicCategories.map((cat) => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={`snap-center shrink-0 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  categoryFilter === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-transparent text-gray-500 border border-gray-200 dark:border-gray-800'
                }`}>
                {cat}
              </button>
            ))}
          </div>

          {/* Log Aktivitas Header - Premium Redesign */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-600 tracking-[0.3em] uppercase">Log Aktivitas</h2>
              {/* Badge Item Dinamis */}
              <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                {filteredTransactions.length} Item
              </span>
            </div>
            
            {/* Dropdown Bulan Custom (Glassmorphism) */}
            <div className="relative group">
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-500/50 rounded-xl pl-3 pr-8 py-1.5 text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer transition-all shadow-sm"
              >
                {recentMonths.map(m => (
                  <option key={m.value} value={m.value} className="bg-white dark:bg-[#121827] text-gray-900 dark:text-white font-bold">
                    {m.label}
                  </option>
                ))}
              </select>
              {/* Custom Chevron Icon untuk menyembunyikan panah bawaan browser */}
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-blue-500 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>
          </div>

        {/* ======================================= */}
        {/* AREA SCROLL (HANYA ITEM LOG AKTIVITAS)  */}
        {/* ======================================= */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-32 space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredTransactions.map((trx) => (
              <motion.div key={trx.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between p-4 rounded-[24px] bg-white dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800/40 hover:border-blue-500/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 shadow-inner">
                    {getIcon(trx.category)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-800 dark:text-gray-100 tracking-tight">{trx.note}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{trx.category}</p>
                    <p className={`text-[8px] mt-0.5 ${trx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                      {formatDateTime(trx.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className={`font-black text-sm mr-1 ${trx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                    {trx.type === 'income' ? '+' : '-'} {trx.amount.toLocaleString('id-ID')}
                  </p>
                  <div className="flex gap-1 opacity-40 hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditModal({ isOpen: true, data: { ...trx } })} className="p-2 text-gray-400 hover:text-blue-500 rounded-xl transition-all"><Edit3 size={14} /></button>
                    <button onClick={() => deleteTransaction(trx.id, trx.amount)} className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition-all"><Trash2 size={14} /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredTransactions.length === 0 && (
            <div className="text-center py-20 bg-gray-50/50 dark:bg-gray-900/10 rounded-[32px] border border-dashed border-gray-200 dark:border-gray-800">
              <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.4em]">Kosong</p>
            </div>
          )}
        </div>

        {/* ======================================= */}
        {/* MODAL EDIT PREMIUM (GLASSMORPHISM)      */}
        {/* ======================================= */}
        <AnimatePresence>
          {editModal.isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            >
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800/80"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Edit Transaksi</h3>
                  <button onClick={() => setEditModal({ isOpen: false, data: null })} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800/50 rounded-full transition-colors">
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nominal (Rp)</label>
                    <input type="number" required value={editModal.data.amount} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, amount: e.target.value } })}
                      className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Catatan</label>
                    <input type="text" required value={editModal.data.note} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, note: e.target.value } })}
                      className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Kategori (Pilih atau Ketik Baru)</label>
                    <input list="category-list" type="text" required value={editModal.data.category} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, category: e.target.value } })}
                      className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold" 
                      placeholder="Ketik kategori baru..." />
                    
                    <datalist id="category-list">
                      {existingCategories.map(cat => <option key={cat} value={cat} />)}
                    </datalist>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-500/30 mt-2">
                    Simpan Perubahan
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
      </motion.div>
    );
  };

  // --- 6. KOMPONEN: ANALISIS (STATS) ---
  const AnalyticsTab = () => {
    const expenseData = transactionsThisMonth
      .filter(t => t.type === 'expense' || !t.type)
      .reduce((acc, curr) => {
        const existing = acc.find(item => item.name === curr.category);
        if (existing) {
          existing.value += Number(curr.amount);
        } else {
          acc.push({ name: curr.category, value: Number(curr.amount) });
        }
        return acc;
    }, []).sort((a, b) => b.value - a.value);

    if (!mounted) return <div className="pt-8 px-4 h-screen flex justify-center items-center text-xs text-gray-500 font-bold uppercase tracking-widest">Memuat Mesin Analitik...</div>;

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pt-8 px-4 pb-28 w-full min-w-0">
        
        {/* Header dengan Dropdown Bulan Premium yang disinkronkan */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Analisis Pengeluaran</h2>
          
          <div className="relative group">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-500/50 rounded-xl pl-3 pr-8 py-1.5 text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer transition-all shadow-sm"
            >
              {recentMonths.map(m => (
                <option key={m.value} value={m.value} className="bg-white dark:bg-[#121827] text-gray-900 dark:text-white font-bold">
                  {m.label}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-blue-500 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </div>
        
        {expenseData.length > 0 ? (
          <>
            <div className="bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-xl border border-gray-100 dark:border-gray-800/60 mb-6 flex justify-center items-center h-72 w-full">
              <PieChart width={300} height={250}>
                <Pie data={expenseData} innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none" isAnimationActive={false}>
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`} contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontSize: '12px', fontWeight: 'bold' }} itemStyle={{ color: '#fff' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
              </PieChart>
            </div>
            <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-600 tracking-[0.3em] uppercase mb-4">Rincian Detail</h3>
            <div className="space-y-3">
              {expenseData.map((item, index) => (
                <div key={item.name} className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div>
                    <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{item.name}</span>
                  </div>
                  <span className="font-black text-sm text-gray-900 dark:text-white tracking-tight">Rp {item.value.toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20 bg-gray-50/50 dark:bg-gray-900/10 rounded-[32px] border border-dashed border-gray-200 dark:border-gray-800 mt-10">
            <PieChartIcon className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-30" />
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.4em]">Belum Ada Data</p>
          </div>
        )}
      </motion.div>
    );
  };

  // --- 7. KOMPONEN: MULTI DOMPET (WALLETS) ---
  // --- 7. KOMPONEN: MULTI DOMPET (WALLETS) ---
  const WalletTab = () => {
    const themeGradients = [
      "from-blue-500 to-indigo-600",
      "from-pink-500 to-rose-600",
      "from-emerald-400 to-teal-600",
      "from-amber-400 to-orange-500",
      "from-purple-500 to-fuchsia-600"
    ];

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pt-8 px-4 pb-28 w-full min-w-0">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">Pilih Dompet</h2>
        <div className="space-y-4">
          
          {wallets.length === 0 && <p className="text-center text-xs font-bold text-gray-500">Memuat Rekening...</p>}

          {wallets.map((wallet, idx) => (
            <motion.button
              key={wallet.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setActiveWallet({ id: wallet.id, name: wallet.name });
                setActiveTab('home');
              }}
              className={`w-full text-left relative overflow-hidden rounded-[32px] p-6 transition-all border-2 ${
                activeWallet.id === wallet.id 
                  ? 'border-blue-500 shadow-xl shadow-blue-500/20' 
                  : 'border-transparent shadow-lg hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${themeGradients[idx % themeGradients.length]} opacity-90`}></div>
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
              <div className="absolute -left-8 -bottom-8 w-24 h-24 rounded-full bg-black/10 blur-xl"></div>
              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Rekening Tersimpan</p>
                  <h3 className="text-white text-2xl font-bold tracking-tight">{wallet.name}</h3>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md bg-white/20 border border-white/30 text-white ${activeWallet.id === wallet.id ? 'opacity-100' : 'opacity-50'}`}>
                  {activeWallet.id === wallet.id ? <ArrowDownCircle size={20} /> : <CreditCard size={20} />}
                </div>
              </div>
            </motion.button>
          ))}
          
          <button onClick={() => setNewWalletModal({ isOpen: true, name: '' })} className="w-full mt-4 p-6 rounded-[32px] border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-500 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex flex-col items-center justify-center gap-2">
            <span className="text-2xl font-light">+</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Tambah Rekening Baru</span>
          </button>
        </div>

        {/* MODAL HARUS BERADA DI DALAM <motion.div> UTAMA WALLETTAB DI ATAS */}
        <AnimatePresence>
          {newWalletModal.isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4 pb-0 sm:pb-4">
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Buat Rekening Baru</h3>
                  <button onClick={() => setNewWalletModal({ isOpen: false, name: '' })} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800/50 rounded-full transition-colors"><X size={16} /></button>
                </div>
                <form onSubmit={handleCreateWallet} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nama Rekening / Dompet</label>
                    <input type="text" required autoFocus value={newWalletModal.name} onChange={(e) => setNewWalletModal({ ...newWalletModal, name: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold" placeholder="Contoh: BCA Pribadi" />
                  </div>
                  <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-green-500/30 mt-2">Buka Rekening</button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div> 
    );
  };

  // --- 8. KOMPONEN: SETTINGS ---
  const SettingsTab = () => {
    const handleLogout = async () => {
      await supabase.auth.signOut();
      window.location.href = '/login';
    };

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-8 px-4 pb-28 w-full min-w-0">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">Pengaturan</h2>
        <button 
          onClick={handleLogout}
          className="w-full p-6 rounded-[32px] bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs"
        >
          Keluar dari Akun
        </button>
      </motion.div>
    );
  };

  // --- 8. RENDER UTAMA ---
  if (!mounted) return null;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-[#0a0f1c]' : 'bg-gray-50'}`}>
      <main className="max-w-md mx-auto relative min-h-screen overflow-x-hidden">
        
        <AnimatePresence mode="wait">
          {activeTab === 'home' && <HomeTab key="home" />}
          {activeTab === 'analytics' && <AnalyticsTab key="analytics" />}
          {activeTab === 'wallets' && <WalletTab key="wallets" />}
          {activeTab === 'settings' && <SettingsTab key="settings" />}
        </AnimatePresence>

        {/* AI Quick Command (Jika ada fungsi mic) */}
        {activeTab === 'home' && <QuickCommandBar onProcessTransaction={addTransaction} />}

        {/* MODAL PINTAR SATU INPUT */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pb-0 sm:pb-4"
            >
              <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-md bg-white dark:bg-[#121827] rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800"
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <Command className="text-blue-500" size={20} />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Smart Input</h3>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 rounded-full">
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSmartSubmit}>
                  <input 
                    type="text" 
                    autoFocus
                    required 
                    value={smartCommand} 
                    onChange={(e) => setSmartCommand(e.target.value)} 
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl py-4 px-5 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold text-base" 
                    placeholder="Contoh: out 50k Kopi Starbucks" 
                  />
                  
                  <div className="mt-4 flex gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">out 25k makan siang</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">in 2jt gaji</span>
                  </div>

                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-500/30 mt-6">
                    Proses Cepat
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TAMBAHAN: MODAL TAMBAH WALLET BARU */}
        <AnimatePresence>
          {newWalletModal.isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4 pb-0 sm:pb-4">
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Buat Rekening Baru</h3>
                  <button onClick={() => setNewWalletModal({ isOpen: false, name: '' })} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800/50 rounded-full transition-colors"><X size={16} /></button>
                </div>
                <form onSubmit={handleCreateWallet} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nama Rekening / Dompet</label>
                    <input type="text" required autoFocus value={newWalletModal.name} onChange={(e) => setNewWalletModal({ ...newWalletModal, name: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold" placeholder="Contoh: BCA Pribadi" />
                  </div>
                  <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-green-500/30 mt-2">Buka Rekening</button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* BOTTOM NAVIGATION BAR */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0a0f1c]/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 pb-safe">
          <div className="max-w-md mx-auto flex justify-between items-center px-6 py-4">
            {[
              { id: 'home', label: 'HOME', Icon: HomeIcon },
              { id: 'analytics', label: 'STATS', Icon: PieChartIcon },
              { id: 'wallets', label: 'WALLETS', Icon: CreditCard },
              { id: 'settings', label: 'SET', Icon: Settings }
            ].map((menu) => {
              const isActive = activeTab === menu.id;
              return (
                <motion.button 
                  key={menu.id} 
                  onClick={() => setActiveTab(menu.id)} // Langsung aktifkan tab
                  whileTap={{ scale: 0.85 }} 
                  animate={{ scale: isActive ? 1.15 : 1, y: isActive ? -6 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }} 
                  className="flex flex-col items-center gap-1.5 relative w-12" 
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {isActive && <motion.div layoutId="navGlow" className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-blue-500/20 blur-md rounded-full -z-10" />}
                  <menu.Icon size={22} className={`transition-colors duration-300 ${isActive ? "text-blue-500 fill-blue-500/20" : "text-gray-400 dark:text-gray-600 fill-transparent"}`} />
                  <span className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${isActive ? 'text-blue-500' : 'text-gray-400 dark:text-gray-600'}`}>{menu.label}</span>
                </motion.button>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}