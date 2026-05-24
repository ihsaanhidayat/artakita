"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, ArrowUpCircle, ArrowDownCircle, Coffee, ShoppingBag, Receipt, Layers, Trash2, Edit3, Home as HomeIcon, PieChart as PieChartIcon, CreditCard, Settings } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import QuickCommandBar from "@/components/QuickCommandBar";
import { useFinData } from "@/hooks/useFinData";

export default function Home() {
  // --- 1. STATE MANAGEMENT ---
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [filter, setFilter] = useState("Semua");
  const [activeTab, setActiveTab] = useState("home");
  const [mounted, setMounted] = useState(false);
  
  // STATE BARU: Memori untuk Multi-Dompet
  const [activeWallet, setActiveWallet] = useState({ id: "dompet-1", name: "Dompet Utama" });

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- 2. DATA BINDING ---
  // Data sekarang ditarik berdasarkan ID Dompet yang sedang aktif!
  const { balance, transactions, addTransaction, deleteTransaction, updateTransaction } = useFinData("mock-user-1", activeWallet.id);

  const existingCategories = [...new Set(transactions.map(t => t.category))];
  const dynamicCategories = ["Semua", ...existingCategories];
  const totalExpense = transactions.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalIncome = 5000000; 

  const CHART_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  // --- 3. HELPER FUNCTIONS ---
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

  const filteredTransactions = filter === "Semua" ? transactions : transactions.filter(t => t.category === filter);

  // --- 4. KOMPONEN: DASHBOARD UTAMA (HOME) ---
  const HomeTab = () => (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="pt-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">ArtaKita.</h1>
          {/* NAMA DOMPET DINAMIS */}
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-[0.2em] uppercase mt-1">
            {activeWallet.name}
          </p>
        </div>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 transition-all active:scale-90">
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Balance Card */}
      <div className="bg-white dark:bg-[#121827] rounded-[32px] p-7 shadow-2xl shadow-blue-500/10 border border-gray-100 dark:border-gray-800/60 mb-8">
        <p className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.3em] mb-3">Total Saldo Tersedia</p>
        <div className="flex items-baseline gap-2 mb-8">
          <span className="text-2xl font-bold text-gray-300 dark:text-gray-700">Rp</span>
          <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
            {balance.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/50">
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500 mb-1">
              <ArrowDownCircle size={14} />
              <span className="text-[9px] font-black uppercase tracking-wider">In</span>
            </div>
            <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">Rp {totalIncome.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/50">
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-500 mb-1">
              <ArrowUpCircle size={14} />
              <span className="text-[9px] font-black uppercase tracking-wider">Out</span>
            </div>
            <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">Rp {totalExpense.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* Dynamic Filter */}
      <div className="flex gap-2.5 mb-8 overflow-x-auto pb-1 no-scrollbar cursor-grab">
        {dynamicCategories.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
              filter === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="mb-24">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-600 tracking-[0.3em] uppercase">Log Aktivitas</h2>
          <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">{filteredTransactions.length} Item</span>
        </div>
        <div className="space-y-4">
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
                    <p className="text-[10px] font-black text-blue-500/60 dark:text-blue-400/40 uppercase tracking-widest">{trx.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-black text-sm text-red-500 dark:text-red-400 mr-1">{trx.amount.toLocaleString('id-ID')}</p>
                  <div className="flex gap-1 opacity-40 hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(trx)} className="p-2 text-gray-400 hover:text-blue-500 rounded-xl transition-all"><Edit3 size={14} /></button>
                    <button onClick={() => deleteTransaction(trx.id, trx.amount)} className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition-all"><Trash2 size={14} /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredTransactions.length === 0 && (
            <div className="text-center py-20 bg-gray-50/50 dark:bg-gray-900/10 rounded-[32px] border border-dashed border-gray-200 dark:border-gray-800">
              <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.4em]">Data Nihil</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  // --- 5. KOMPONEN: ANALISIS (STATS) ---
  const AnalyticsTab = () => {
    const expenseData = transactions.reduce((acc, curr) => {
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">Analisis Pengeluaran</h2>
        
        {expenseData.length > 0 ? (
          <>
            <div className="bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-xl border border-gray-100 dark:border-gray-800/60 mb-6 flex justify-center items-center h-72 w-full">
              <PieChart width={300} height={250}>
                <Pie
                  data={expenseData}
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={false}
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`}
                  contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#fff' }}
                />
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
                  <span className="font-black text-sm text-gray-900 dark:text-white tracking-tight">
                    Rp {item.value.toLocaleString('id-ID')}
                  </span>
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

  // --- 6. KOMPONEN: MULTI DOMPET (WALLETS) ---
  const WalletTab = () => {
    const familyWallets = [
      { id: "dompet-1", name: "Dompet Utama", type: "Cash & Debit", theme: "from-blue-500 to-indigo-600" },
      { id: "dompet-2", name: "Rekening Istri", type: "BCA Tabungan", theme: "from-pink-500 to-rose-600" },
      { id: "dompet-3", name: "Tabungan Anak", type: "Pendidikan", theme: "from-emerald-400 to-teal-600" }
    ];

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pt-8 px-4 pb-28 w-full min-w-0">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">Pilih Dompet</h2>
        
        <div className="space-y-4">
          {familyWallets.map((wallet) => (
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
              <div className={`absolute inset-0 bg-gradient-to-br ${wallet.theme} opacity-90`}></div>
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
              <div className="absolute -left-8 -bottom-8 w-24 h-24 rounded-full bg-black/10 blur-xl"></div>

              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.3em] mb-1">{wallet.type}</p>
                  <h3 className="text-white text-2xl font-bold tracking-tight">{wallet.name}</h3>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md bg-white/20 border border-white/30 text-white ${activeWallet.id === wallet.id ? 'opacity-100' : 'opacity-50'}`}>
                  {activeWallet.id === wallet.id ? <ArrowDownCircle size={20} /> : <CreditCard size={20} />}
                </div>
              </div>
            </motion.button>
          ))}
          
          <button className="w-full mt-4 p-6 rounded-[32px] border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-500 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex flex-col items-center justify-center gap-2">
            <span className="text-2xl font-light">+</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Tambah Rekening Baru</span>
          </button>
        </div>
      </motion.div>
    );
  };

  // --- 7. RENDER UTAMA ---
  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-[#0a0f1c]' : 'bg-gray-50'}`}>
      <main className="max-w-md mx-auto relative min-h-screen">
        
        <AnimatePresence mode="wait">
          {activeTab === 'home' && <HomeTab key="home" />}
          {activeTab === 'analytics' && <AnalyticsTab key="analytics" />}
          {activeTab === 'wallets' && <WalletTab key="wallets" />}
        </AnimatePresence>

        {activeTab === 'home' && <QuickCommandBar onProcessTransaction={addTransaction} />}
        
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
                  onClick={() => menu.id === 'settings' ? alert("Segera Hadir!") : setActiveTab(menu.id)}
                  whileTap={{ scale: 0.85 }} 
                  animate={{ scale: isActive ? 1.15 : 1, y: isActive ? -6 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="flex flex-col items-center gap-1.5 relative w-12"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {isActive && (
                    <motion.div layoutId="navGlow" className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-blue-500/20 blur-md rounded-full -z-10" />
                  )}
                  <menu.Icon size={22} className={`transition-colors duration-300 ${isActive ? "text-blue-500 fill-blue-500/20" : "text-gray-400 dark:text-gray-600 fill-transparent"}`} />
                  <span className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${isActive ? 'text-blue-500' : 'text-gray-400 dark:text-gray-600'}`}>
                    {menu.label}
                  </span>
                </motion.button>
              );
            })}

          </div>
        </nav>
      </main>
    </div>
  );
}