import React from 'react';
import { AlertTriangle, TrendingUp, Smile } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BudgetAlert({ budgets, transactions }) {
  const expensesByCategory = transactions
    .filter(t => t.type === 'expense' || !t.type)
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
      return acc;
    }, {});

  // Cari kategori yang paling boros (di atas 80%)
  const criticalBudget = budgets.find(b => {
    const spent = expensesByCategory[b.category_name] || 0;
    return (spent / Number(b.limit_amount)) >= 0.8;
  });

  if (!criticalBudget) return null;

  const spent = expensesByCategory[criticalBudget.category_name] || 0;
  const limit = Number(criticalBudget.limit_amount);
  const remaining = limit - spent;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-red-500/10 border border-red-500/20 p-4 rounded-[24px] mb-6 flex items-start gap-3"
    >
      <AlertTriangle className="text-red-500 mt-0.5 shrink-0" size={20} />
      <div>
        <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest">Teguran AI</h4>
        <p className="text-xs text-red-400 font-medium leading-relaxed">
          Anggaran <span className="font-bold">{criticalBudget.category_name}</span> Anda sudah terpakai 80% lebih. Sisa Rp {remaining.toLocaleString('id-ID')}. Atur kembali pengeluaranmu ya!
        </p>
      </div>
    </motion.div>
  );
}