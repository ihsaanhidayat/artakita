"use client";
import { useState, useEffect } from "react";
import { useFinData } from "@/hooks/useFinData";
import QuickCommandBar from "@/components/QuickCommandBar";
import { Moon, Sun, ArrowUpCircle, ArrowDownCircle, Coffee, ShoppingBag, Receipt, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Semua"); // <-- State Filter Baru
  const { balance, transactions, addTransaction } = useFinData("mock-user-1", "mock-wallet-1");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark, mounted]);

  const getIcon = (category) => {
    const cat = category.toLowerCase();
    if (cat.includes('jajan') || cat.includes('makan')) return <Coffee size={18} />;
    if (cat.includes('belanja') || cat.includes('kebutuhan')) return <ShoppingBag size={18} />;
    return <Receipt size={18} />;
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex justify-center items-center">
        <p className="text-sm text-gray-400 animate-pulse">Memuat ArtaKita...</p>
      </div>
    );
  }

  const safeBalance = balance || 0;

  // 1. Dapatkan daftar kategori unik secara dinamis dari data transaksi yang ada
  const availableCategories = ["Semua", ...new Set(transactions.map(trx => trx.category))];

  // 2. Filter data transaksi berdasarkan kategori yang sedang dipilih pengguna
  const filteredTransactions = selectedCategory === "Semua" 
    ? transactions 
    : transactions.filter(trx => trx.category === selectedCategory);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'dark bg-gray-950 text-white' : 'bg-gray-100 text-gray-900'} flex justify-center items-center p-0 md:p-4`}>
      <main className="w-full max-w-md bg-white dark:bg-gray-900 min-h-screen md:min-h-[855px] md:rounded-3xl relative shadow-2xl flex flex-col p-6 pb-24 overflow-y-auto border border-gray-100 dark:border-gray-800/50 transition-colors duration-300">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">ArtaKita.</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Keuangan Rumah Tangga</p>
          </div>
          <button onClick={() => setIsDark(!isDark)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center transition-colors hover:bg-gray-200 dark:hover:bg-gray-700">
            {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-gray-600" />}
          </button>
        </header>

        {/* Balance Card */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-1">Total Saldo</p>
          <h2 className="text-5xl font-bold tracking-tighter flex items-center text-gray-900 dark:text-white">
            <span className="text-2xl mr-1 font-semibold text-gray-300 dark:text-gray-600">Rp</span>
            {safeBalance.toLocaleString('id-ID')}
          </h2>
          
          <div className="flex gap-4 mt-6">
            <div className="flex-1 bg-green-50/60 dark:bg-green-900/10 p-4 rounded-2xl border border-green-100/50 dark:border-green-800/20">
              <p className="text-xs flex items-center text-green-600 dark:text-green-400 mb-1 font-medium"><ArrowDownCircle size={14} className="mr-1"/> Pemasukan</p>
              <p className="font-bold text-green-700 dark:text-green-400 text-lg">Rp 8.500.000</p>
            </div>
            <div className="flex-1 bg-red-50/60 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100/50 dark:border-red-800/20">
              <p className="text-xs flex items-center text-red-600 dark:text-red-400 mb-1 font-medium"><ArrowUpCircle size={14} className="mr-1"/> Pengeluaran</p>
              <p className="font-bold text-red-700 dark:text-red-400 text-lg">Rp {(5000000 - safeBalance + 3500000).toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>

        {/* KOMPONEN BARU: Dynamic Category Filter Pills */}
        <div className="mb-6 overflow-x-auto -mx-6 px-6 scrollbar-none flex gap-2 py-1">
          {availableCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-semibold px-4 py-2 rounded-full border whitespace-nowrap transition-all duration-200 ${
                  isSelected
                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20 scale-105"
                    : "bg-gray-50/80 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {cat === "Semua" && <Layers size={12} className="inline mr-1 -mt-0.5" />}
                {cat}
              </button>
            );
          })}
        </div>

        {/* Transactions List */}
        <div className="flex-1">
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
            {selectedCategory === "Semua" ? "Transaksi Terakhir" : `Kategori: ${selectedCategory}`}
          </h3>
          
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredTransactions.map((trx) => (
                <motion.div 
                  key={trx.id} 
                  layout // Menangani transisi perpindahan posisi card secara otomatis
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100/70 dark:border-gray-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      {getIcon(trx.category)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{trx.note}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{trx.category}</p>
                    </div>
                  </div>
                  <p className="font-bold text-sm text-red-600 dark:text-red-400">- Rp {trx.amount.toLocaleString('id-ID')}</p>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* State jika hasil filter kosong */}
            {filteredTransactions.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada transaksi di kategori ini.</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* The Magic FAB */}
        <QuickCommandBar onProcessTransaction={addTransaction} />
      </main>
    </div>
  );
}