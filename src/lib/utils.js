// ============================================================
// ARTAKITA — SHARED UTILITY FUNCTIONS
// Semua helper dipusatkan di sini, tidak ada duplikat di file lain
// ============================================================

/**
 * Format ISO date string ke format Indonesia
 * Contoh: "Sen, 01-01-25 09:30"
 */
export const formatDateTime = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const day  = days[date.getDay()];
  const d    = String(date.getDate()).padStart(2, "0");
  const m    = String(date.getMonth() + 1).padStart(2, "0");
  const y    = String(date.getFullYear()).slice(-2);
  const hh   = String(date.getHours()).padStart(2, "0");
  const min  = String(date.getMinutes()).padStart(2, "0");
  return `${day}, ${d}-${m}-${y} ${hh}:${min}`;
};

/**
 * Parse input nominal fleksibel
 * Mendukung: 10k, 50rb, 1jt, 500ribu, 1.5jt, 1,5jt
 * Selalu kembalikan nilai POSITIF (Math.abs di luar jika perlu)
 */
export const parseFlexibleNumber = (val) => {
  if (!val) return 0;
  const str = String(val).toLowerCase().trim();
  const match = str.match(/([\d\.,]+)\s*(k|rb|ribu|m|jt|juta)?/);
  if (!match) return parseFloat(str.replace(/[^\d]/g, "")) || 0;
  let numStr = match[1].replace(/\./g, "").replace(/,/g, ".");
  let num    = parseFloat(numStr);
  const mult = match[2];
  if (["k", "rb", "ribu"].includes(mult)) num *= 1000;
  if (["m", "jt", "juta"].includes(mult)) num *= 1000000;
  return isNaN(num) ? 0 : num;
};

/**
 * Format angka ke Rupiah singkat untuk tampilan chart
 * Contoh: 1500000 → "1.5jt", 50000 → "50k"
 */
export const fmtShort = (n) => {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}jt`;
  if (num >= 1_000)     return `${(num / 1_000).toFixed(0)}k`;
  return `${num}`;
};

/**
 * Format angka ke Rupiah penuh (id-ID)
 * Contoh: 1500000 → "1.500.000"
 */
export const fmt = (n) => Number(n || 0).toLocaleString("id-ID");

/**
 * Generate daftar 6 bulan terdekat untuk dropdown filter
 * 3 bulan ke belakang, bulan ini, 2 bulan ke depan
 */
export const getRecentMonths = () => {
  const months     = [];
  const now        = new Date();
  const monthNames = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
  for (let i = -3; i <= 2; i++) {
    const temp = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      value: `${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, "0")}`,
      label: `${monthNames[temp.getMonth()]} ${temp.getFullYear()}`,
    });
  }
  return months;
};

// Konstanta warna chart
export const CHART_COLORS = [
  "#3b82f6","#ef4444","#10b981","#f59e0b","#8b5cf6","#ec4899","#14b8a6"
];

// Konstanta gradient kartu dompet
export const THEME_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-pink-500 to-rose-600",
  "from-emerald-400 to-teal-600",
  "from-amber-400 to-orange-500",
  "from-purple-500 to-fuchsia-600",
];
