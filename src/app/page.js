"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, ArrowUpCircle, ArrowDownCircle, Coffee, ShoppingBag, Receipt, Layers, Trash2, Edit3, Home as HomeIcon, PieChart as PieChartIcon, CreditCard, Settings, Plus, X, Command } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { supabase } from "@/lib/supabaseClient";

// Hooks
import { useFinData } from "@/hooks/useFinData";
import { useWallets } from "@/hooks/useWallets"; 

// Komponen Eksternal
import QuickCommandBar from "@/components/QuickCommandBar";
import ManageCategories from "@/components/ManageCategories";
import ShareWallet from "@/components/ShareWallet";
import EditWalletModal from "@/components/EditWalletModal";
import BudgetProgress from "@/components/BudgetProgress";
import ManageBudgets from "@/components/ManageBudgets";
import BudgetAlert from "@/components/BudgetAlert";

// === FUNGSI HELPER GLOBAL ===
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

const CHART_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
const THEME_GRADIENTS = ["from-blue-500 to-indigo-600", "from-pink-500 to-rose-600", "from-emerald-400 to-teal-600", "from-amber-400 to-orange-500", "from-purple-500 to-fuchsia-600"];

// Bikin list 6 bulan terakhir untuk dropdown
const getRecentMonths = () => {
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

export default function Home() {
  // === 1. STATE GLOBAL ===
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [recentMonths] = useState(getRecentMonths());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // === 2. STATE DOMPET ===
  const { wallets, addWallet } = useWallets();
  const [activeWallet, setActiveWallet] = useState({ id: "dompet-1", name: "Dompet Utama" });

  // === 3. DATA FINANSIAL ===
  const { balance, transactions, addTransaction, deleteTransaction, updateTransaction } = useFinData(activeWallet.id);
  
  // === STATE UNTUK POP-UP HAPUS ===
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, trxId: null, amount: null });

  // Fungsi untuk memunculkan pop-up
  const handleDeleteClick = (id, amount) => {
    setDeleteConfirmModal({ isOpen: true, trxId: id, amount: amount });
  };

  // Fungsi untuk mengeksekusi penghapusan jika tombol "Ya" diklik
  const executeDelete = () => {
    if (deleteConfirmModal.trxId) {
      deleteTransaction(deleteConfirmModal.trxId, deleteConfirmModal.amount); // Memanggil fungsi hook asli
    }
    setDeleteConfirmModal({ isOpen: false, trxId: null, amount: null }); // Tutup pop-up
  };

  // === 4. STATE FILTER & MODAL (Disatukan agar tidak ganda) ===
  const [typeFilter, setTypeFilter] = useState('all'); 
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  
  // State Semua Modal
  const [isSmartInputOpen, setIsSmartInputOpen] = useState(false);
  const [smartCommand, setSmartCommand] = useState("");
  const [editTrxModal, setEditTrxModal] = useState({ isOpen: false, data: null });
  const [newWalletModal, setNewWalletModal] = useState({ isOpen: false, name: '' });
  const [isEditWalletOpen, setIsEditWalletOpen] = useState(false);
  const [walletToEdit, setWalletToEdit] = useState(null);
  const [isShareWalletOpen, setIsShareWalletOpen] = useState(false);
  const [walletToShare, setWalletToShare] = useState(null);
  const [allBudgets, setAllBudgets] = useState([]);

useEffect(() => {
  const fetchAllBudgets = async () => {
    const { data } = await supabase.from('budgets').select('*').eq('month_year', selectedMonth);
    if (data) setAllBudgets(data);
  };
  fetchAllBudgets();
  }, [selectedMonth]);

  // === 5. EFEK & FUNGSI ===
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-pilih dompet pertama jika ada
  useEffect(() => {
    if (wallets.length > 0 && activeWallet.id === "dompet-1") {
      setActiveWallet({ id: wallets[0].id, name: wallets[0].name });
    }
  }, [wallets, activeWallet.id]);

  // Kalkulasi Transaksi Bulan Ini
  const transactionsThisMonth = transactions.filter(t => t.created_at?.startsWith(selectedMonth));
  const incomeThisMonth = transactionsThisMonth.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const expenseThisMonth = transactionsThisMonth.filter(t => t.type === 'expense' || !t.type).reduce((acc, curr) => acc + Number(curr.amount), 0);

  // Kalkulasi Filter & Kategori
  const existingCategories = [...new Set(transactionsThisMonth.map(t => t.category))];
  const dynamicCategories = ["Semua", ...existingCategories];

  const filteredTransactions = transactionsThisMonth.filter(t => {
    const matchType = typeFilter === 'all' ? true : (typeFilter === 'income' ? t.type === 'income' : (t.type === 'expense' || !t.type));
    const matchCat = categoryFilter === 'Semua' ? true : t.category === categoryFilter;
    return matchType && matchCat;
  });

  // Data untuk Grafik Pie
  const expenseData = transactionsThisMonth
    .filter(t => t.type === 'expense' || !t.type)
    .reduce((acc, curr) => {
      const existing = acc.find(item => item.name === curr.category);
      if (existing) existing.value += Number(curr.amount);
      else acc.push({ name: curr.category, value: Number(curr.amount) });
      return acc;
  }, []).sort((a, b) => b.value - a.value);

  // === ACTION HANDLERS ===
  const getIcon = (category) => {
    switch (category) {
      case 'Makan': return <Coffee size={18} />;
      case 'Belanja': return <ShoppingBag size={18} />;
      case 'Tagihan': return <Receipt size={18} />;
      default: return <Layers size={18} />;
    }
  };

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

  const handleSaveTrxEdit = async (e) => {
    e.preventDefault();
    const currentData = editTrxModal.data;
    
    // Pengaman 1: Pastikan data benar-benar ada sebelum diproses
    if (!currentData || !currentData.note || !currentData.amount || !currentData.category) return;
    
    await updateTransaction(currentData.id, currentData.note, currentData.category, currentData.amount);
    
    // Pengaman 2: Jangan pernah set data menjadi null. 
    // Biarkan isOpen menjadi false agar Framer Motion bisa menutupnya dengan mulus.
    setEditTrxModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleSmartSubmit = async (e) => {
    e.preventDefault();
    if (!smartCommand.trim()) return;

    const regex = /^(in|out)\s+(\d+(?:[.,]\d+)?[kKmM]?[jJ]?[tT]?)\s+(.+)$/i;
    const match = smartCommand.trim().match(regex);

    if (!match) {
      alert("Format tidak valid!\nGunakan format: [in/out] [angka] [catatan]\nContoh: out 50k beli pulsa");
      return;
    }

    const type = match[1].toLowerCase() === 'in' ? 'income' : 'expense';
    let rawAmount = match[2].toLowerCase();
    let amount = rawAmount.includes('k') ? parseFloat(rawAmount.replace('k', '')) * 1000 : 
                 (rawAmount.includes('jt') || rawAmount.includes('m') ? parseFloat(rawAmount.replace(/[jm]t?/g, '')) * 1000000 : parseFloat(rawAmount));

    const note = match[3].trim();
    let category = "Lainnya";

    const { data: categoryDictionary } = await supabase.from('categories').select('*');
    if (categoryDictionary) {
      for (const cat of categoryDictionary) {
        if (!cat.alias) continue;
        const keywords = cat.alias.split(',').map(k => k.trim().toLowerCase());
        if (keywords.some(keyword => note.toLowerCase().includes(keyword))) {
          category = cat.name;
          break;
        }
      }
    }

    await addTransaction(note, amount, category, type);
    setSmartCommand("");
    setIsSmartInputOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (!mounted) return null;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-[#0a0f1c]' : 'bg-gray-50'}`}>
      <main className="max-w-md mx-auto relative min-h-screen overflow-x-hidden bg-white dark:bg-black">
        
        {/* ======================================= */}
        {/* AREA TABS (DI RENDER SECARA CONDITIONAL)*/}
        {/* ======================================= */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: HOME DASHBOARD */}
          {activeTab === 'home' && (
  <motion.div 
    key="home" 
    initial={{ opacity: 0 }} 
    animate={{ opacity: 1 }} 
    exit={{ opacity: 0 }} 
    transition={{ duration: 0.15 }} 
    className="pt-8 px-4 h-[100dvh] w-full flex flex-col overflow-hidden" 
  >
    {/* SECTION: HEADER (FLEX-NONE = TIDAK AKAN BISA SCROLL) */}
    <div className="flex-none">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">ArtaKita.</h1>
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-[0.2em] uppercase mt-1">{activeWallet.name}</p>
        </div>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 transition-all active:scale-90">
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="bg-white dark:bg-[#121827] rounded-[32px] p-7 shadow-2xl shadow-blue-500/10 border border-gray-100 dark:border-gray-800/60 mb-6">
        <p className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.3em] mb-3">Total Saldo (Semua Waktu)</p>
        <div className="flex items-baseline gap-2 mb-8">
          <span className="text-2xl font-bold text-gray-300 dark:text-gray-700">Rp</span>
          <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{balance.toLocaleString('id-ID')}</span>
        </div>

        <BudgetAlert budgets={allBudgets} transactions={transactionsThisMonth} />
        
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

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-600 tracking-[0.3em] uppercase">Log Aktivitas</h2>
          <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
            {filteredTransactions.length} Item
          </span>
        </div>
        
        <div className="relative group">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="appearance-none bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-500/50 rounded-xl pl-3 pr-8 py-1.5 text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer transition-all shadow-sm">
            {recentMonths.map(m => <option key={m.value} value={m.value} className="bg-white dark:bg-[#121827] text-gray-900 dark:text-white font-bold">{m.label}</option>)}
          </select>
        </div>
      </div>
    </div>

    {/* SECTION: LIST (FLEX-1 = AREA YANG SCROLLING) */}
    {/* min-h-0 sangat krusial untuk mencegah container meluber */}
    <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-32 min-h-0">
      <AnimatePresence mode="popLayout">
        {filteredTransactions.map((trx) => (
          <motion.div key={trx.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center justify-between p-4 rounded-[24px] bg-white dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800/40 hover:border-blue-500/30 transition-all mb-3"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 shadow-inner">
                {getIcon(trx.category)}
              </div>
              <div>
                <p className="font-bold text-sm text-gray-800 dark:text-gray-100 tracking-tight">{trx.note}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{trx.category}</p>
                <p className={`text-[8px] mt-0.5 ${trx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>{formatDateTime(trx.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className={`font-black text-sm mr-1 ${trx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                {trx.type === 'income' ? '+' : '-'} {trx.amount.toLocaleString('id-ID')}
              </p>
              <div className="flex gap-1 opacity-40 hover:opacity-100 transition-opacity">
                <button onClick={() => setEditTrxModal({ isOpen: true, data: { ...trx } })} className="p-2 text-gray-400 hover:text-blue-500 rounded-xl transition-all"><Edit3 size={14} /></button>
                <button onClick={() => handleDeleteClick(trx.id, trx.amount)} className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition-all"><Trash2 size={14} /></button>
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
  </motion.div>
)}

          {/* TAB 2: ANALYTICS (STATS) */}
          {activeTab === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="pt-8 px-4 pb-32 min-h-screen w-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Analisis Pengeluaran</h2>
                <div className="relative group">
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="appearance-none bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-500/50 rounded-xl pl-3 pr-8 py-1.5 text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer transition-all shadow-sm">
                    {recentMonths.map(m => <option key={m.value} value={m.value} className="bg-white dark:bg-[#121827] text-gray-900 dark:text-white font-bold">{m.label}</option>)}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-blue-500 transition-colors"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></div>
                </div>
              </div>
              
              <BudgetProgress selectedMonth={selectedMonth} transactions={transactionsThisMonth} />

              {expenseData.length > 0 ? (
                <>
                  <div className="bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-xl border border-gray-100 dark:border-gray-800/60 mb-6 flex justify-center items-center h-72 w-full">
                    <PieChart width={300} height={250}>
                      <Pie data={expenseData} innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none" isAnimationActive={false}>
                        {expenseData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
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
          )}

          {/* TAB 3: WALLETS */}
          {activeTab === 'wallets' && (
            <motion.div key="wallets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="pt-8 px-4 pb-32 min-h-screen w-full flex flex-col">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">Pilih Dompet</h2>
              <div className="space-y-4">
                {wallets.length === 0 && <p className="text-center text-xs font-bold text-gray-500">Memuat Rekening...</p>}

                {wallets.map((wallet, idx) => (
                  <motion.div key={wallet.id} whileTap={{ scale: 0.95 }} onClick={() => { setActiveWallet({ id: wallet.id, name: wallet.name }); setActiveTab('home'); }}
                    className={`w-full text-left relative overflow-hidden rounded-[32px] p-6 transition-all border-2 cursor-pointer ${
                      activeWallet.id === wallet.id ? 'border-blue-500 shadow-xl shadow-blue-500/20' : 'border-transparent shadow-lg hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${THEME_GRADIENTS[idx % THEME_GRADIENTS.length]} opacity-90`}></div>
                    <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
                    <div className="absolute -left-8 -bottom-8 w-24 h-24 rounded-full bg-black/10 blur-xl"></div>
                    <div className="relative z-10 flex justify-between items-center">
                      <div>
                        <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Rekening Tersimpan</p>
                        <div className="flex items-center gap-3">
                          <h3 className="text-white text-2xl font-bold tracking-tight">{wallet.name}</h3>
                          <div className="flex gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); setWalletToEdit(wallet); setIsEditWalletOpen(true); }} className="p-1.5 bg-white/20 rounded-full hover:bg-white/40 transition-colors backdrop-blur-md" title="Edit Dompet">
                              <Edit3 size={12} className="text-white" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setWalletToShare(wallet); setIsShareWalletOpen(true); }} className="p-1.5 bg-white/20 rounded-full hover:bg-white/40 transition-colors backdrop-blur-md" title="Bagikan Dompet">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md bg-white/20 border border-white/30 text-white ${activeWallet.id === wallet.id ? 'opacity-100' : 'opacity-50'}`}>
                        {activeWallet.id === wallet.id ? <ArrowDownCircle size={20} /> : <CreditCard size={20} />}
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                <button onClick={() => setNewWalletModal({ isOpen: true, name: '' })} className="w-full mt-4 p-6 rounded-[32px] border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-500 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex flex-col items-center justify-center gap-2">
                  <span className="text-2xl font-light">+</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">Tambah Rekening Baru</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="pt-8 px-4 pb-32 min-h-screen w-full flex flex-col">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">Pengaturan</h2>
              <div className="mb-6"><ManageCategories /></div>
              <div className="mb-8"><ManageBudgets selectedMonth={selectedMonth} /></div>
              <button onClick={handleLogout} className="relative z-10 w-full p-6 rounded-[32px] bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs" >
              Keluar dari Akun
            </button>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ======================================= */}
        {/* AREA MODALS & BOTTOM NAV (DILUAR TABS)  */}
        {/* ======================================= */}
        {activeTab === 'home' && <QuickCommandBar onProcessTransaction={addTransaction} />}

        {/* MODAL: EDIT TRANSAKSI */}
        <AnimatePresence>
          {editTrxModal.isOpen && editTrxModal.data && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800/80">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Edit Transaksi</h3>
                  
                  {/* Pastikan tombol X juga tidak membuat data menjadi null */}
                  <button onClick={() => setEditTrxModal(prev => ({ ...prev, isOpen: false }))} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800/50 rounded-full transition-colors"><X size={16} /></button>
                </div>
                <form onSubmit={handleSaveTrxEdit} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nominal (Rp)</label>
                    <input type="number" required value={editTrxModal.data.amount} onChange={(e) => setEditTrxModal({ ...editTrxModal, data: { ...editTrxModal.data, amount: e.target.value } })} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Catatan</label>
                    <input type="text" required value={editTrxModal.data.note} onChange={(e) => setEditTrxModal({ ...editTrxModal, data: { ...editTrxModal.data, note: e.target.value } })} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Kategori</label>
                    <input list="category-list" type="text" required value={editTrxModal.data.category} onChange={(e) => setEditTrxModal({ ...editTrxModal, data: { ...editTrxModal.data, category: e.target.value } })} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold" />
                    <datalist id="category-list">{existingCategories.map(cat => <option key={cat} value={cat} />)}</datalist>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-500/30 mt-2">Simpan Perubahan</button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL: TAMBAH DOMPET BARU */}
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
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nama Rekening</label>
                    <input type="text" required autoFocus value={newWalletModal.name} onChange={(e) => setNewWalletModal({ ...newWalletModal, name: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold" placeholder="Contoh: BCA Pribadi" />
                  </div>
                  <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-green-500/30 mt-2">Buka Rekening</button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL: EDIT DOMPET & SHARE DOMPET */}
        <AnimatePresence>
          {isEditWalletOpen && <EditWalletModal wallet={walletToEdit} onClose={() => setIsEditWalletOpen(false)} onRefresh={() => window.location.reload()} />}
        </AnimatePresence>

        <AnimatePresence>
          {isShareWalletOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-md bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl relative overflow-hidden border border-gray-100 dark:border-gray-800">
                <button onClick={() => setIsShareWalletOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors"><X size={16}/></button>
                <ShareWallet walletId={walletToShare?.id} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOTTOM NAVIGATION BAR */}
<nav className="fixed bottom-0 left-0 right-0 z-[9999] bg-white/80 dark:bg-[#0a0f1c]/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 pb-safe">
  <div className="max-w-md mx-auto flex justify-between items-center px-6 py-4">
            {[
              { id: 'home', label: 'HOME', Icon: HomeIcon },
              { id: 'analytics', label: 'STATS', Icon: PieChartIcon },
              { id: 'wallets', label: 'WALLETS', Icon: CreditCard },
              { id: 'settings', label: 'SET', Icon: Settings }
            ].map((menu) => {
              const isActive = activeTab === menu.id;
              return (
                <motion.button key={menu.id} onClick={() => setActiveTab(menu.id)} whileTap={{ scale: 0.85 }} animate={{ scale: isActive ? 1.15 : 1, y: isActive ? -6 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="flex flex-col items-center gap-1.5 relative w-12" style={{ WebkitTapHighlightColor: 'transparent' }}>
                  {isActive && <motion.div layoutId="navGlow" className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-blue-500/20 blur-md rounded-full -z-10" />}
                  <menu.Icon size={22} className={`transition-colors duration-300 ${isActive ? "text-blue-500 fill-blue-500/20" : "text-gray-400 dark:text-gray-600 fill-transparent"}`} />
                  <span className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${isActive ? 'text-blue-500' : 'text-gray-400 dark:text-gray-600'}`}>{menu.label}</span>
                </motion.button>
              );
            })}
          </div>
        </nav>
        {/* MODAL KONFIRMASI HAPUS (CUSTOM UI) */}
      <AnimatePresence>
        {deleteConfirmModal.isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              transition={{ type: "spring", damping: 25, stiffness: 300 }} 
              className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800 text-center"
            >
              {/* Ikon Peringatan */}
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                <Trash2 size={32} />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Hapus Transaksi?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Data yang sudah dihapus tidak dapat dikembalikan lagi. Yakin ingin melanjutkan?
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmModal({ isOpen: false, trxId: null, amount: null })} 
                  className="flex-1 py-3.5 rounded-2xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={executeDelete} 
                  className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-red-500 hover:bg-red-600 transition-all shadow-lg shadow-red-500/30"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>    
      </main>
    </div>
  );
}