import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import {
  Plus, Trash2, ChevronDown, ArrowDownLeft, ArrowUpRight,
  CheckCircle2, Wallet, TrendingDown, TrendingUp, X
} from "lucide-react";

// ── Helper ───────────────────────────────────────────────────────────────────
const parseFlexibleNumber = (val) => {
  if (!val) return 0;
  const str = String(val).toLowerCase().trim();
  const isNegative = str.includes("-");
  const match = str.match(/([\d\.,]+)\s*(k|rb|ribu|m|jt|juta)?/);
  if (!match) return 0;
  let numStr = match[1].replace(/\./g, "").replace(/,/g, ".");
  let num = parseFloat(numStr);
  const mult = match[2];
  if (["k", "rb", "ribu"].includes(mult)) num *= 1000;
  if (["m", "jt", "juta"].includes(mult)) num *= 1000000;
  return isNegative ? -num : num;
};

const fmt = (n) => Number(n || 0).toLocaleString("id-ID");

// ── Mini Bar Chart ────────────────────────────────────────────────────────────
const DebtChart = ({ debts, balance }) => {
  const totalDebt       = debts.filter(d => d.type === "debt").reduce((a, c) => a + Number(c.amount), 0);
  const totalReceivable = debts.filter(d => d.type === "receivable").reduce((a, c) => a + Number(c.amount), 0);
  const totalInitDebt   = debts.filter(d => d.type === "debt").reduce((a, c) => a + Number(c.initial_amount), 0);
  const totalInitRec    = debts.filter(d => d.type === "receivable").reduce((a, c) => a + Number(c.initial_amount), 0);

  const paidDebt = totalInitDebt - totalDebt;
  const paidRec  = totalInitRec  - totalReceivable;

  const maxVal = Math.max(totalInitDebt, totalInitRec, balance, 1);

  const bars = [
    { label: "Saldo",    value: balance,        color: "bg-blue-500",    glow: "shadow-blue-500/30" },
    { label: "Hutang",   value: totalDebt,       color: "bg-red-500",     glow: "shadow-red-500/30" },
    { label: "Piutang",  value: totalReceivable, color: "bg-emerald-500", glow: "shadow-emerald-500/30" },
  ];

  return (
    <div className="bg-white dark:bg-[#121827] border border-gray-100 dark:border-gray-800/60 rounded-[28px] p-5 mb-4 shadow-sm">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">
        Ringkasan Visual
      </p>

      {/* Bar Chart */}
      <div className="flex items-end gap-3 h-28 mb-3">
        {bars.map((bar, i) => {
          const pct = Math.max((bar.value / maxVal) * 100, 2);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[9px] font-black text-gray-500 dark:text-gray-400">
                {bar.value >= 1000000
                  ? `${(bar.value / 1000000).toFixed(1)}jt`
                  : bar.value >= 1000
                  ? `${(bar.value / 1000).toFixed(0)}k`
                  : `${bar.value}`}
              </span>
              <div className="w-full flex items-end" style={{ height: "80px" }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.1 }}
                  className={`w-full rounded-xl ${bar.color} shadow-lg ${bar.glow} relative overflow-hidden`}
                >
                  {/* Shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/20" />
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 justify-center">
        {bars.map((bar, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${bar.color}`} />
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{bar.label}</span>
          </div>
        ))}
      </div>

      {/* Progress pelunasan */}
      {(totalInitDebt > 0 || totalInitRec > 0) && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/60 space-y-2.5">
          {totalInitDebt > 0 && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pelunasan Hutang</span>
                <span className="text-[9px] font-black text-red-400">
                  {totalInitDebt > 0 ? ((paidDebt / totalInitDebt) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${totalInitDebt > 0 ? (paidDebt / totalInitDebt) * 100 : 0}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-red-500 rounded-full"
                />
              </div>
            </div>
          )}
          {totalInitRec > 0 && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Penerimaan Piutang</span>
                <span className="text-[9px] font-black text-emerald-400">
                  {totalInitRec > 0 ? ((paidRec / totalInitRec) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${totalInitRec > 0 ? (paidRec / totalInitRec) * 100 : 0}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function DebtsPage({ activeWallet, balance }) {
  const [debts, setDebts]               = useState([]);
  const [isFormOpen, setIsFormOpen]     = useState(false);
  const [activePayment, setActivePayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentError, setPaymentError]   = useState("");
  const [isPayLoading, setIsPayLoading]   = useState(false);
  const [formData, setFormData]           = useState({ person: "", amount: "", type: "debt" });
  const [isAddLoading, setIsAddLoading]   = useState(false);
  const [filterType, setFilterType]       = useState("all"); // all | debt | receivable
  const [toast, setToast]                 = useState({ show: false, message: "", type: "error" });

  const showToast = (message, type = "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "error" }), 3500);
  };

  // State modal konfirmasi hapus
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null });

  // ── Fetch — filter by wallet_id ───────────────────────────────────────────
  const fetchDebts = async () => {
    if (!activeWallet?.id) return;
    const { data } = await supabase
      .from("debts")
      .select("*")
      .eq("wallet_id", activeWallet.id)
      .order("created_at", { ascending: false });
    if (data) setDebts(data);
  };

  useEffect(() => {
    fetchDebts();
  }, [activeWallet?.id]);

  // ── Add ───────────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!activeWallet?.id) { showToast("Pilih dompet terlebih dahulu."); return; }
    if (!formData.person.trim() || !formData.amount) return;
    // Math.abs — paksa selalu positif, tidak bisa negatif
    const parsed = Math.abs(parseFlexibleNumber(formData.amount));
    if (parsed <= 0) { showToast("Nominal harus lebih dari 0."); return; }

    setIsAddLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("debts").insert([{
      person_name:    formData.person,
      amount:         parsed,
      initial_amount: parsed,
      type:           formData.type,
      wallet_id:      activeWallet.id,
      user_id:        user.id,           // ← wajib untuk RLS policy
    }]);
    setIsAddLoading(false);

    if (!error) {
      setIsFormOpen(false);
      setFormData({ person: "", amount: "", type: "debt" });
      fetchDebts();
    } else {
      showToast("Gagal menyimpan: " + error.message, "error");
    }
  };

  // ── Payment ───────────────────────────────────────────────────────────────
  const handlePayment = async (debt) => {
    const amount = parseFlexibleNumber(paymentAmount);
    setPaymentError("");

    if (amount <= 0) {
      setPaymentError("Nominal harus lebih dari 0.");
      return;
    }
    if (amount > Math.abs(Number(debt.amount))) {
      setPaymentError(`Melebihi sisa ${debt.type === "debt" ? "hutang" : "piutang"}: Rp ${fmt(Math.abs(debt.amount))}`);
      return;
    }
    // Khusus hutang: validasi saldo dompet mencukupi
    if (debt.type === "debt" && amount > balance) {
      setPaymentError(`Saldo dompet tidak cukup! Saldo: Rp ${fmt(balance)}`);
      return;
    }

    setIsPayLoading(true);
    const rpcName = debt.type === "debt"
      ? "process_debt_payment"
      : "process_receivable_payment";

    const { error } = await supabase.rpc(rpcName, {
      debt_id_input:  debt.id,
      payment_amount: amount,
    });
    setIsPayLoading(false);

    if (!error) {
      setActivePayment(null);
      setPaymentAmount("");
      setPaymentError("");
      fetchDebts();
    } else {
      setPaymentError("Gagal: " + error.message);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = (id) => {
    setDeleteModal({ show: true, id });
  };

  const confirmDelete = async () => {
    if (deleteModal.id) {
      await supabase.from("debts").delete().eq("id", deleteModal.id);
      fetchDebts();
    }
    setDeleteModal({ show: false, id: null });
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredDebts = filterType === "all"
    ? debts
    : debts.filter(d => d.type === filterType);

  const totalDebt       = debts.filter(d => d.type === "debt").reduce((a, c) => a + Number(c.amount), 0);
  const totalReceivable = debts.filter(d => d.type === "receivable").reduce((a, c) => a + Number(c.amount), 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pt-8 px-3 pb-32 h-[100dvh] overflow-y-auto no-scrollbar w-full flex flex-col">

      {/* ── Header ── */}
      <div className="flex-none mb-6">
        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
          Hutang & Piutang
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <Wallet size={11} className="text-blue-400" />
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">
            {activeWallet?.name}
          </p>
        </div>
      </div>

      {/* ── Summary Pills ── */}
      <div className="grid grid-cols-2 gap-3 mb-4 flex-none">
        <div className="bg-white dark:bg-[#121827] border border-gray-100 dark:border-gray-800/60 rounded-[20px] p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-red-500 mb-1.5">
            <TrendingDown size={13} />
            <span className="text-[9px] font-black uppercase tracking-widest">Total Hutang</span>
          </div>
          <p className="font-black text-base text-gray-900 dark:text-white leading-tight">
            Rp {fmt(totalDebt)}
          </p>
          <p className="text-[9px] text-gray-400 mt-0.5">
            {debts.filter(d => d.type === "debt").length} catatan
          </p>
        </div>
        <div className="bg-white dark:bg-[#121827] border border-gray-100 dark:border-gray-800/60 rounded-[20px] p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-emerald-500 mb-1.5">
            <TrendingUp size={13} />
            <span className="text-[9px] font-black uppercase tracking-widest">Total Piutang</span>
          </div>
          <p className="font-black text-base text-gray-900 dark:text-white leading-tight">
            Rp {fmt(totalReceivable)}
          </p>
          <p className="text-[9px] text-gray-400 mt-0.5">
            {debts.filter(d => d.type === "receivable").length} catatan
          </p>
        </div>
      </div>

      {/* ── Chart ── */}
      {debts.length > 0 && (
        <DebtChart debts={debts} balance={balance} />
      )}

      {/* ── Filter Tabs ── */}
      <div className="flex bg-gray-100 dark:bg-[#121827] p-1 rounded-[16px] mb-4 border border-gray-200 dark:border-gray-800/60 shadow-inner flex-none">
        {[
          { key: "all",        label: "Semua" },
          { key: "debt",       label: "Hutang" },
          { key: "receivable", label: "Piutang" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterType(key)}
            className={`flex-1 text-[9px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all duration-300 ${
              filterType === key
                ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Debt List ── */}
      <div className="space-y-3 flex-1">
        {filteredDebts.length === 0 && (
          <div className="text-center py-16 bg-gray-50/50 dark:bg-gray-900/10 rounded-[28px] border border-dashed border-gray-200 dark:border-gray-800">
            <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.4em]">
              Belum Ada Catatan
            </p>
          </div>
        )}

        {filteredDebts.map((d, index) => {
          const rawAmount  = Math.abs(Number(d.amount));
          const rawInitial = Math.abs(Number(d.initial_amount));
          const paid       = Math.max(0, rawInitial - rawAmount);
          const progress   = rawInitial > 0 ? Math.min((paid / rawInitial) * 100, 100) : 0;
          const isDebt     = d.type === "debt";
          const isLunas    = progress >= 100 && rawAmount <= 0;
          const isActive = activePayment === d.id;

          return (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="bg-white dark:bg-[#121827] border border-gray-100 dark:border-gray-800/60 rounded-[24px] p-5 shadow-sm relative overflow-hidden"
            >
              {/* Accent strip kiri */}
              <div className={`absolute left-0 top-5 bottom-5 w-[3px] rounded-full ${
                isLunas ? "bg-emerald-500" : isDebt ? "bg-red-500" : "bg-blue-500"
              }`} />

              <div className="pl-4">
                {/* Row atas */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-sm text-gray-900 dark:text-white tracking-tight">
                        {d.person_name}
                      </p>
                      {isLunas && (
                        <span className="flex items-center gap-1 text-[8px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                          <CheckCircle2 size={9} /> Lunas
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {isDebt
                        ? <ArrowUpRight size={10} className="text-red-400" />
                        : <ArrowDownLeft size={10} className="text-blue-400" />
                      }
                      <span className={`text-[9px] font-black uppercase tracking-widest ${
                        isDebt ? "text-red-400" : "text-blue-400"
                      }`}>
                        {isDebt ? "Hutang" : "Piutang"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-black text-sm text-gray-900 dark:text-white">
                      Rp {fmt(d.amount)}
                    </p>
                    <p className="text-[9px] text-gray-400 mt-0.5">
                      dari Rp {fmt(d.initial_amount)}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-1.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      isLunas ? "bg-emerald-500"
                        : progress < 30 ? "bg-red-500"
                        : progress < 70 ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                  />
                </div>

                <div className="flex justify-between items-center mb-4">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Terbayar {progress.toFixed(0)}%
                  </span>
                  <span className="text-[9px] text-gray-400">
                    Rp {fmt(paid)} / Rp {fmt(d.initial_amount)}
                  </span>
                </div>

                {/* Action buttons */}
                {!isLunas && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="p-2.5 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setActivePayment(isActive ? null : d.id);
                        setPaymentAmount("");
                        setPaymentError("");
                      }}
                      className={`flex-1 font-black text-[10px] uppercase tracking-widest rounded-xl py-2.5 transition-all active:scale-95 ${
                        isActive
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-500"
                          : isDebt
                          ? "bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 shadow-sm"
                          : "bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white border border-blue-500/20 shadow-sm"
                      }`}
                    >
                      {isActive ? "Batal" : isDebt ? "Bayar Hutang" : "Terima Piutang"}
                    </button>
                  </div>
                )}

                {/* Tombol hapus jika lunas */}
                {isLunas && (
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="w-full py-2 text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors text-center rounded-xl hover:bg-red-500/5"
                  >
                    Hapus Catatan
                  </button>
                )}

                {/* Payment Panel */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/60">
                        {/* Info saldo dompet (untuk hutang) */}
                        {isDebt && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <Wallet size={11} className="text-gray-400" />
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                              Saldo dompet: Rp {fmt(balance)}
                            </span>
                          </div>
                        )}

                        {/* Info sisa hutang */}
                        <div className="flex items-center gap-1.5 mb-3">
                          {isDebt
                            ? <TrendingDown size={11} className="text-red-400" />
                            : <TrendingUp size={11} className="text-emerald-400" />
                          }
                          <span className={`text-[9px] font-black uppercase tracking-widest ${
                            isDebt ? "text-red-400" : "text-emerald-400"
                          }`}>
                            Sisa {isDebt ? "hutang" : "piutang"}: Rp {fmt(Math.abs(d.amount))}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Nominal (Cth: 50k, 1jt)"
                            value={paymentAmount}
                            onChange={(e) => {
                              setPaymentAmount(e.target.value);
                              setPaymentError("");
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handlePayment(d); }}}
                            className="flex-1 bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-sm font-bold p-3 rounded-xl outline-none focus:border-blue-500 transition-all placeholder-gray-400"
                          />
                          <button
                            onClick={() => handlePayment(d)}
                            disabled={isPayLoading}
                            className={`px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 ${
                              isDebt
                                ? "bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/20"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                            }`}
                          >
                            {isPayLoading ? "..." : "OK"}
                          </button>
                        </div>

                        {/* Error message */}
                        <AnimatePresence>
                          {paymentError && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="text-[10px] font-bold text-red-500 mt-2 bg-red-500/10 px-3 py-1.5 rounded-lg"
                            >
                              {paymentError}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── FAB Tambah ── */}
      <AnimatePresence>
        {!isFormOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsFormOpen(true)}
            className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full shadow-2xl shadow-blue-600/40 flex items-center justify-center text-white z-40 transition-colors"
          >
            <Plus size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Bottom Sheet Form ── */}
      <AnimatePresence>
        {isFormOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setIsFormOpen(false)}
            />

            <motion.form
              initial={{ y: 400, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onSubmit={handleAdd}
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white dark:bg-[#0a0f1c] border-t border-gray-100 dark:border-gray-800 p-6 rounded-t-[32px] shadow-2xl z-50"
            >
              {/* Handle bar */}
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5" />

              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                    Catatan Baru
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Wallet size={10} className="text-blue-400" />
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                      {activeWallet?.name}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tipe toggle */}
              <div className="flex bg-gray-100 dark:bg-gray-800/60 p-1 rounded-2xl mb-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "debt" })}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    formData.type === "debt"
                      ? "bg-white dark:bg-red-500/20 text-red-500 shadow-sm border border-red-500/20"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  <TrendingDown size={13} /> Hutang
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "receivable" })}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    formData.type === "receivable"
                      ? "bg-white dark:bg-emerald-500/20 text-emerald-500 shadow-sm border border-emerald-500/20"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  <TrendingUp size={13} /> Piutang
                </button>
              </div>

              {/* Nama */}
              <div className="mb-3">
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                  Nama Orang
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Cth: Budi, Ani, dsb."
                  value={formData.person}
                  onChange={(e) => setFormData({ ...formData, person: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold text-sm p-4 rounded-2xl outline-none focus:border-blue-500 transition-all placeholder-gray-400"
                />
              </div>

              {/* Nominal */}
              <div className="mb-5">
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                  Nominal
                </label>
                <input
                  type="text"
                  required
                  placeholder="50k, 1jt, 100rb.."
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold text-sm p-4 rounded-2xl outline-none focus:border-blue-500 transition-all placeholder-gray-400"
                />
              </div>

              <button
                type="submit"
                disabled={isAddLoading}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                  formData.type === "debt"
                    ? "bg-red-500 hover:bg-red-400 text-white shadow-red-500/30"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/30"
                }`}
              >
                {isAddLoading ? "Menyimpan..." : `Catat ${formData.type === "debt" ? "Hutang" : "Piutang"}`}
              </button>
            </motion.form>
          </>
        )}
      </AnimatePresence>
      {/* ── Toast Notification ── */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-0 right-0 z-[999999] flex justify-center px-4 pointer-events-none"
          >
            <div className={`flex items-center gap-3 px-5 py-3.5 rounded-full shadow-2xl backdrop-blur-xl border ${
              toast.type === "error"
                ? "bg-red-500/10 border-red-500/20 text-red-500"
                : "bg-green-500/10 border-green-500/20 text-green-500"
            }`}>
              <X size={15} />
              <span className="text-xs font-bold tracking-wide">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal Konfirmasi Hapus ── */}
      <AnimatePresence>
        {deleteModal.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-red-100 dark:border-red-900/30 text-center"
            >
              <div className="w-14 h-14 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-red-500" size={24} />
              </div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-2">
                Hapus Catatan?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                Tindakan ini permanen dan tidak dapat dibatalkan.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal({ show: false, id: null })}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-red-500/30"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
