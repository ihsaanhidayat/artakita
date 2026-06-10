import type { MonthOption } from "@/types";

export const formatDateTime = (isoString: string | null | undefined): string => {
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

export const parseFlexibleNumber = (val: string | number | null | undefined): number => {
  if (!val) return 0;
  const str = String(val).toLowerCase().trim();
  const match = str.match(/([\d.,]+)\s*(k|rb|ribu|m|jt|juta)?/);
  if (!match) return parseFloat(str.replace(/[^\d]/g, "")) || 0;
  let numStr = match[1].replace(/\./g, "").replace(/,/g, ".");
  let num    = parseFloat(numStr);
  const mult = match[2];
  if (mult && ["k", "rb", "ribu"].includes(mult)) num *= 1000;
  if (mult && ["m", "jt", "juta"].includes(mult)) num *= 1000000;
  return isNaN(num) ? 0 : num;
};

export const fmtShort = (n: number | string | null | undefined): string => {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}jt`;
  if (num >= 1_000)     return `${(num / 1_000).toFixed(0)}k`;
  return `${num}`;
};

export const fmt = (n: number | string | null | undefined): string =>
  Number(n || 0).toLocaleString("id-ID");

export const timeAgo = (isoString: string | null | undefined, emptyLabel = "Belum pernah"): string => {
  if (!isoString) return emptyLabel;
  const diff  = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "Baru saja";
  if (mins  < 60) return `${mins} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days  < 30) return `${days} hari lalu`;
  return new Date(isoString).toLocaleDateString("id-ID");
};

export const getRecentMonths = (): MonthOption[] => {
  const months: MonthOption[] = [];
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

export const CHART_COLORS: string[] = [
  "#3b82f6","#ef4444","#10b981","#f59e0b","#8b5cf6","#ec4899","#14b8a6"
];

export const THEME_GRADIENTS: string[] = [
  "linear-gradient(135deg, var(--a1), var(--a2))",
  "linear-gradient(135deg, var(--a2), var(--a3))",
  "linear-gradient(135deg, var(--a3), var(--a1))",
  "linear-gradient(135deg, var(--a1), var(--a3))",
  "linear-gradient(135deg, var(--a2), var(--a1))",
];
