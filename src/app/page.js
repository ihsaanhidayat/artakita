"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, ArrowUpCircle, ArrowDownCircle, Coffee, ShoppingBag, Receipt, Layers, Trash2, Edit3, Home as HomeIcon, PieChart, CreditCard, Settings } from "lucide-react";
import QuickCommandBar from "@/components/QuickCommandBar";
import { useFinData } from "@/hooks/useFinData";

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [filter, setFilter] = useState("Semua");
  const [activeTab, setActiveTab] = useState("home"); // STATE BARU: Penentu Kamar Aktif
  
  const { balance, transactions, addTransaction, deleteTransaction, updateTransaction } = useFinData("mock-user-1", "mock-wallet-1");

  const existingCategories = [...new Set(transactions.map(t => t.category))];
  const dynamicCategories = ["Semua", ...existingCategories];
  const totalExpense = transactions.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalIncome = 5000000; 

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

  // --- KOMPONEN KAMAR 1: DASHBOARD UTAMA (Kode Lama Kita) ---
  const HomeTab = () => (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="pt-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">ArtaKita.</h1>
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-[0.2em] uppercase mt-1">Sistem Ledger AI</p>
        </div>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300">
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

      {/* Dynamic Filter List */}
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

      {/* Transactions List */}
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

  // --- KOMPONEN KAMAR LAINNYA (Placeholder untuk Fase Selanjutnya) ---
  const AnalyticsTab = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-12 px-4 text-center h-screen">
      <PieChart className="w-16 h-16 mx-auto mb-4 text-blue-500 opacity-50" />
      <h2 className="text-lg font-bold text-gray-800 dark:text-white">Ruang Analitik</h2>
      <p className="text-sm text-gray-500 mt-2">Segera Hadir: Grafik Donat Pengeluaran Keluarga</p>
    </motion.div>
  );

  const WalletTab = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-12 px-4 text-center h-screen">
      <CreditCard className="w-16 h-16 mx-auto mb-4 text-green-500 opacity-50" />
      <h2 className="text-lg font-bold text-gray-800 dark:text-white">Multi-Dompet</h2>
      <p className="text-sm text-gray-500 mt-2">Segera Hadir: Sinkronisasi Rekening Suami & Istri</p>
    </motion.div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-[#0a0f1c]' : 'bg-gray-50'}`}>
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Kontainer Utama yang Membungkus View */}
      <main className="max-w-md mx-auto relative min-h-screen">
        
        <AnimatePresence mode="wait">
          {activeTab === 'home' && <HomeTab key="home" />}
          {activeTab === 'analytics' && <AnalyticsTab key="analytics" />}
          {activeTab === 'wallets' && <WalletTab key="wallets" />}
        </AnimatePresence>

        {/* NLP Input Bar HANYA muncul di Tab Home */}
        {activeTab === 'home' && <QuickCommandBar onProcessTransaction={addTransaction} />}
        
        {/* ========================================================= */}
        {/* MAGIC BARU: BOTTOM NAVIGATION (Gaya Aplikasi Mobile Asli) */}
        {/* ========================================================= */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0a0f1c]/80 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 pb-safe">
          <div className="max-w-md mx-auto flex justify-between items-center px-6 py-4">
            
            <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'}`}>
              <HomeIcon size={22} className={activeTab === 'home' ? "fill-blue-100 dark:fill-blue-900/30" : ""} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Home</span>
            </button>

            <button onClick={() => setActiveTab('analytics')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'analytics' ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'}`}>
              <PieChart size={22} className={activeTab === 'analytics' ? "fill-blue-100 dark:fill-blue-900/30" : ""} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Stats</span>
            </button>

            <button onClick={() => setActiveTab('wallets')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'wallets' ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'}`}>
              <CreditCard size={22} className={activeTab === 'wallets' ? "fill-blue-100 dark:fill-blue-900/30" : ""} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Wallets</span>
            </button>

            <button onClick={() => alert("Menu Pengaturan akan segera hadir!")} className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-all">
              <Settings size={22} />
              <span className="text-[9px] font-bold uppercase tracking-widest">Set</span>
            </button>

          </div>
        </nav>

      </main>
    </div>
  );
}