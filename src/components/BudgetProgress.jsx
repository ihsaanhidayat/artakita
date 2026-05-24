import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, TrendingUp, CheckCircle2, ChevronDown } from 'lucide-react';

export default function BudgetProgress({ selectedMonth, transactions }) {
  const [budgets, setBudgets] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchBudgets();
  }, [selectedMonth]);

  const fetchBudgets = async () => {
    const { data, error } = await supabase.from('budgets').select('*').eq('month_year', selectedMonth);
    if (!error && data) setBudgets(data);
  };

  const expensesByCategory = transactions
    .filter(t => t.type === 'expense' || !t.type)
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
      return acc;
    }, {});

  // Jika belum ada anggaran diset untuk bulan ini, jangan tampilkan komponennya sama sekali
  if (budgets.length === 0) return null; 

  return (
    <div className="bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-xl border border-gray-100 dark:border-gray-800/60 mb-6 w-full">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex justify-between items-center outline-none">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Monitor Anggaran</h3>
          <span className="text-[9px] font-black bg-blue-500/10 text-blue-500 px-2 py-1 rounded-md tracking-widest">{selectedMonth}</span>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown size={20} className="text-gray-400 hover:text-blue-500 transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-6 space-y-5">
              {budgets.map((budget) => {
                const spent = expensesByCategory[budget.category_name] || 0;
                const limit = Number(budget.limit_amount);
                const percentage = Math.min((spent / limit) * 100, 100).toFixed(0);
                
                let statusColor = "bg-green-500";
                let textColor = "text-green-500";
                let StatusIcon = CheckCircle2;
                
                if (percentage >= 80) {
                  statusColor = "bg-red-500";
                  textColor = "text-red-500";
                  StatusIcon = AlertTriangle;
                } else if (percentage >= 50) {
                  statusColor = "bg-amber-500";
                  textColor = "text-amber-500";
                  StatusIcon = TrendingUp;
                }

                return (
                  <div key={budget.id} className="relative">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <StatusIcon size={14} className={textColor} />
                          <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{budget.category_name}</span>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">
                          Terpakai: Rp {spent.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-black ${textColor}`}>{percentage}%</span>
                        <div className="text-[9px] font-black text-gray-500 tracking-widest uppercase">
                          Limit: Rp {limit.toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800/80 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1, ease: "easeOut" }} className={`h-full ${statusColor} rounded-full`} />
                    </div>

                    {percentage >= 80 && (
                      <p className="text-[9px] font-black text-red-500 mt-1.5 tracking-widest uppercase animate-pulse">
                        ⚠️ Peringatan: Anggaran hampir habis!
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}