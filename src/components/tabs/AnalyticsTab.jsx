"use client";
import { motion } from "framer-motion";
import { CHART_COLORS } from "@/lib/utils";

/**
 * AnalyticsTab — Ringkasan keuangan & breakdown kategori per bulan
 */
export default function AnalyticsTab({ filteredTransactions }) {
  try {
    const safe    = Array.isArray(filteredTransactions) ? filteredTransactions : [];
    const expenses = safe.filter((t) => t?.type === "expense" || !t?.type);
    const incomes  = safe.filter((t) => t?.type === "income");

    const statsData = expenses
      .reduce((acc, trx) => {
        const amt = Number(trx.amount) || 0;
        const cat = trx.category || "Lainnya";
        const ex  = acc.find((i) => i.name === cat);
        if (ex) ex.value += amt;
        else acc.push({ name: cat, value: amt });
        return acc;
      }, [])
      .sort((a, b) => b.value - a.value);

    const totalExpense = statsData.reduce((s, i) => s + i.value, 0);
    const totalIncome  = incomes.reduce((s, t) => s + (Number(t.amount) || 0), 0);

    // Health grade
    let healthGrade = "A", healthMessage = "Sangat Sehat! Surplus kas Anda aman.";
    let gradeColor  = "text-green-500";
    let gradeBg     = "from-green-500/20 to-green-500/5 border-green-500/30";

    if (totalIncome > 0) {
      const ratio = totalExpense / totalIncome;
      if (ratio >= 0.9) {
        healthGrade = "D"; healthMessage = "Bahaya! Pengeluaran nyaris melebihi pemasukan.";
        gradeColor  = "text-red-500"; gradeBg = "from-red-500/20 to-red-500/5 border-red-500/30";
      } else if (ratio >= 0.7) {
        healthGrade = "C"; healthMessage = "Waspada. Kurangi pengeluaran yang tidak perlu.";
        gradeColor  = "text-orange-500"; gradeBg = "from-orange-500/20 to-orange-500/5 border-orange-500/30";
      } else if (ratio >= 0.5) {
        healthGrade = "B"; healthMessage = "Bagus. Keuangan Anda cukup stabil bulan ini.";
        gradeColor  = "text-blue-500"; gradeBg = "from-blue-500/20 to-blue-500/5 border-blue-500/30";
      }
    } else if (totalExpense > 0) {
      healthGrade = "F"; healthMessage = "Minus! Belum ada pemasukan yang tercatat.";
      gradeColor  = "text-red-500"; gradeBg = "from-red-500/20 to-red-500/5 border-red-500/30";
    } else {
      healthGrade = "-"; healthMessage = "Belum ada transaksi bulan ini.";
      gradeColor  = "text-gray-400"; gradeBg = "from-gray-500/10 to-transparent border-gray-500/20";
    }

    return (
      <motion.div
        key="analytics"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="pt-8 px-3 pb-32 h-[100dvh] overflow-y-auto no-scrollbar w-full flex flex-col"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight flex-none">
          Analitik Pengeluaran
        </h2>

        <div className="space-y-4 mb-8">
          {/* Health Grade */}
          <div className={`bg-gradient-to-br ${gradeBg} rounded-[24px] p-5 border shadow-sm flex items-center justify-between transition-colors`}>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Status Keuangan</p>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-snug pr-4">{healthMessage}</p>
            </div>
            <div className={`shrink-0 w-14 h-14 rounded-2xl bg-white dark:bg-[#121827] shadow-sm flex items-center justify-center text-2xl font-black ${gradeColor}`}>
              {healthGrade}
            </div>
          </div>

          {/* Total Expense */}
          <div className="bg-white dark:bg-[#121827] rounded-[32px] p-8 shadow-2xl shadow-red-500/10 border border-gray-100 dark:border-gray-800/60 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 opacity-50" />
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-2">
              Total Pengeluaran
            </p>
            <p className="text-4xl font-black text-red-500 tracking-tighter">
              <span className="text-2xl mr-1">Rp</span>
              {totalExpense.toLocaleString("id-ID")}
            </p>
          </div>

          <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.3em] pl-2">
            Rincian Kategori
          </h3>

          {statsData.length > 0 ? (
            statsData.map((item, index) => {
              const pct      = totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(1) : 0;
              const barColor = CHART_COLORS[index % CHART_COLORS.length];
              return (
                <div key={item.name} className="bg-white dark:bg-gray-900/40 p-5 rounded-[24px] border border-gray-100 dark:border-gray-800/50 shadow-sm mb-3">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{item.name}</p>
                      <p className="text-[10px] font-black text-gray-400 mt-0.5 tracking-wider">{pct}%</p>
                    </div>
                    <p className="font-black text-sm text-gray-900 dark:text-white">
                      Rp {item.value.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: barColor }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 bg-gray-50/50 dark:bg-gray-900/10 rounded-[32px] border border-dashed border-gray-200 dark:border-gray-800">
              <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.4em]">Belum Ada Data</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  } catch (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-[24px] mt-8 mx-3">
        <p className="text-red-600 font-bold mb-2">Terjadi Kesalahan Render:</p>
        <p className="text-xs text-red-500 break-words">{error.toString()}</p>
      </div>
    );
  }
}
