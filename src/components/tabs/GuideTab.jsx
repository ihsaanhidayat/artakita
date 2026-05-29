"use client";
import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, ChevronDown, ChevronRight,
  Home, BarChart3, Landmark, MoreHorizontal,
  Wallet, ArrowUpRight, RefreshCw, Package,
  PiggyBank, Tag, Download, Users, Info,
  Zap, Shield, Wifi, WifiOff, Globe,
  Moon, Sun, Plus, Edit3, Trash2,
  CheckCircle2, AlertTriangle, Star
} from "lucide-react";

// ── Section data ──────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: "mulai",
    icon: Star,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    title: "Memulai ArtaKita",
    items: [
      {
        q: "Apa itu ArtaKita?",
        a: "ArtaKita adalah aplikasi manajemen keuangan pribadi & bersama. Kamu bisa mencatat transaksi harian, melacak hutang piutang, mengelola aset, mengatur target tabungan, dan menganalisis pola pengeluaran — semua dalam satu aplikasi."
      },
      {
        q: "Cara login pertama kali",
        a: "Minta username dan password sementara dari admin. Saat pertama login, kamu akan diminta mengganti password. Gunakan format username saja (tanpa @email) atau email lengkap."
      },
      {
        q: "Mengenal 4 tab utama",
        a: "• Beranda — Saldo & daftar transaksi harian\n• Statistik — Grafik pengeluaran & alokasi anggaran\n• Keuangan — Hutang, transaksi rutin, aset, celengan & kategori\n• Lainnya — Ekspor laporan, panduan, pengaturan & keluar"
      },
    ]
  },
  {
    id: "beranda",
    icon: Home,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    title: "Tab Beranda",
    items: [
      {
        q: "Melihat saldo & transaksi",
        a: "Halaman utama menampilkan total saldo dompet aktif (semua waktu), pemasukan & pengeluaran bulan ini, dan daftar transaksi terbaru."
      },
      {
        q: "Cara mencatat transaksi cepat",
        a: "Gunakan Quick Command Bar di bagian bawah. Ketik format:\n• Pengeluaran: 50k makan siang\n• Pemasukan: in 5jt gaji\n• Dengan kategori: 50k makan pos Makanan\n\nFormat nominal yang didukung: 50k, 500rb, 1jt, 1.5jt, 500ribu"
      },
      {
        q: "Filter dan pencarian transaksi",
        a: "• Ketik di kotak pencarian untuk cari berdasarkan nama/kategori\n• Tap pill kategori untuk filter kategori tertentu\n• Gunakan tombol Hari Ini / 7 Hari / Bulan Ini untuk filter waktu cepat\n• Tap 'Pilih Tanggal' untuk filter rentang tanggal custom\n• Dropdown kanan untuk pilih bulan"
      },
      {
        q: "Ganti dompet aktif",
        a: "Tap icon dompet (💼) di pojok kanan atas. Modal dompet akan muncul di tengah layar. Tap nama dompet untuk mengaktifkannya."
      },
      {
        q: "Mode gelap & terang",
        a: "Tap icon 🌙/☀️ di pojok kanan atas header untuk toggle antara mode gelap dan terang."
      },
      {
        q: "Edit atau hapus transaksi",
        a: "Tap icon ✏️ pada transaksi untuk edit nominal, catatan, atau kategori. Tap icon 🗑️ untuk hapus. Tap icon 👁️ untuk lihat foto nota (jika ada)."
      },
      {
        q: "Muat lebih banyak transaksi",
        a: "Tap tombol 'Muat Lebih Banyak' di bawah daftar transaksi untuk menampilkan transaksi lebih lama."
      },
    ]
  },
  {
    id: "statistik",
    icon: BarChart3,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    title: "Tab Statistik",
    items: [
      {
        q: "Tab Pengeluaran",
        a: "Menampilkan status kesehatan keuangan (grade A-F), total pengeluaran vs pemasukan, dan rincian pengeluaran per kategori dalam bentuk progress bar. Tap header 'Rincian Kategori' untuk collapse/expand."
      },
      {
        q: "Grade kesehatan keuangan",
        a: "• A — Pengeluaran < 50% pemasukan (sangat sehat)\n• B — Pengeluaran 50-70% pemasukan (bagus)\n• C — Pengeluaran 70-90% pemasukan (waspada)\n• D — Pengeluaran > 90% pemasukan (bahaya)\n• F — Tidak ada pemasukan (defisit)"
      },
      {
        q: "Tab Alokasi Anggaran",
        a: "Menampilkan semua kategori pengeluaran bulan ini beserta batas anggaran yang sudah diatur. Progress bar berubah warna: hijau (aman), kuning (>50%), merah (>80% atau melebihi)."
      },
      {
        q: "Cara mengatur batas anggaran",
        a: "Tap icon ✏️ pada kategori manapun → isi nominal batas → tap 'Simpan Batas'. Batas berlaku untuk bulan yang sedang dipilih. Tap 'Hapus Batas' untuk menghapus limit."
      },
      {
        q: "Peringatan alokasi melebihi saldo",
        a: "Jika total semua alokasi anggaran melebihi saldo dompet, akan muncul peringatan merah di bagian atas tab Alokasi. Sesuaikan batas anggaran agar tidak defisit."
      },
    ]
  },
  {
    id: "keuangan",
    icon: Landmark,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "Tab Keuangan",
    items: [
      {
        q: "Cara navigasi di Keuangan",
        a: "Tab Keuangan menampilkan 5 menu: Hutang & Piutang, Transaksi Rutin, Manajemen Aset, Celengan & Target, dan Kategori. Tap salah satu untuk masuk. Tap 'Keuangan' di breadcrumb atas atau tap tab Keuangan di navbar untuk kembali ke daftar menu."
      },
      {
        q: "Mencatat hutang baru",
        a: "Masuk ke Hutang & Piutang → tap tombol + → pilih tipe Hutang atau Piutang → isi nama, nominal, dan opsional tanggal jatuh tempo → tap Simpan."
      },
      {
        q: "Membayar hutang",
        a: "Tap card hutang untuk expand → tap 'Bayar Hutang' → isi nominal pembayaran → tap OK. Transaksi pembayaran otomatis tercatat di dompet. Saat lunas, hutang pindah ke tab Lunas."
      },
      {
        q: "Tab Lunas di Hutang",
        a: "Menampilkan riwayat hutang/piutang yang sudah selesai. Tap card untuk expand dan melihat detail riwayat pembayaran. Tap 'Hapus Riwayat' untuk menghapus dari daftar."
      },
      {
        q: "Mengurutkan daftar hutang",
        a: "Tap icon ↕️ di pojok kanan atas daftar → pilih urutan: Nominal Terbesar, Persentase Terbayar, atau Jatuh Tempo Terdekat."
      },
      {
        q: "Transaksi Rutin",
        a: "Untuk transaksi yang terjadi berulang (gaji, cicilan, langganan). Tap + untuk tambah jadwal baru, pilih frekuensi Harian/Mingguan/Bulanan. Tap 'Jalankan' untuk mencatat transaksi sekarang dan auto-update jadwal berikutnya."
      },
      {
        q: "Manajemen Aset",
        a: "Catat inventaris barang dengan foto, nama toko, tanggal beli, harga, kondisi, dan catatan. Foto aset bisa dilihat fullscreen dengan zoom. Tap icon 👁️ pada card aset."
      },
      {
        q: "Celengan & Target",
        a: "Buat target tabungan dengan nama dan nominal target. Tap 'Mutasi Saldo' untuk tambah atau kurangi tabungan. Progress bar menunjukkan persentase pencapaian."
      },
      {
        q: "Kelola Kategori",
        a: "Tambah, edit, atau hapus kategori transaksi kustom. Kategori yang sudah dipakai di transaksi tidak bisa dihapus."
      },
    ]
  },
  {
    id: "lainnya",
    icon: MoreHorizontal,
    color: "text-gray-500",
    bg: "bg-gray-500/10",
    title: "Tab Lainnya",
    items: [
      {
        q: "Ekspor Laporan",
        a: "Tap 'Ekspor Laporan' → file Excel (.xlsx) otomatis diunduh dengan 5 sheet: Transaksi, Hutang Piutang, Aset, Transaksi Rutin, dan Target Impian. Data diambil dari dompet aktif saat ini."
      },
      {
        q: "Ganti bahasa tampilan",
        a: "Di tab Lainnya, tap toggle [ ID ][ EN ] untuk ganti bahasa antara Indonesia dan Inggris. Perubahan langsung berlaku."
      },
      {
        q: "Manajemen Pengguna (Admin)",
        a: "Hanya terlihat untuk akun admin. Menampilkan daftar semua pengguna aktif. Fitur: tambah user baru, reset password, nonaktifkan/aktifkan akun, hapus akun."
      },
      {
        q: "Tentang Aplikasi",
        a: "Menampilkan versi aplikasi, deskripsi fitur, dan informasi pengembang."
      },
      {
        q: "Keluar dari Akun",
        a: "Tap 'Keluar dari Akun' → tap 'Ya, Keluar' untuk konfirmasi. Sesi berakhir dan kembali ke halaman login."
      },
    ]
  },
  {
    id: "dompet",
    icon: Wallet,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    title: "Manajemen Dompet",
    items: [
      {
        q: "Membuat dompet baru",
        a: "Tap icon 💼 di header Beranda → tap 'Tambah Rekening Baru' → isi nama → tap 'Buka Rekening'. Dompet baru otomatis menjadi aktif."
      },
      {
        q: "Berbagi dompet dengan pengguna lain",
        a: "Tap icon 💼 → tap icon share pada dompet yang ingin dibagikan → pilih pengguna dari daftar → tap 'Bagikan Akses Sekarang'. Pengguna yang dipilih akan bisa melihat dan mencatat transaksi di dompet tersebut."
      },
      {
        q: "Mengubah nama dompet",
        a: "Tap icon 💼 → tap icon ✏️ pada dompet → ketik nama baru → tap ✓ atau tekan Enter."
      },
      {
        q: "Dompet yang dibagikan",
        a: "• Pemilik: header menampilkan 'Dibagikan ke @username'\n• Penerima: header menampilkan 'Dibagikan oleh @username'\nKeduanya bisa mencatat transaksi di dompet bersama."
      },
    ]
  },
  {
    id: "offline",
    icon: WifiOff,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    title: "Mode Offline",
    items: [
      {
        q: "Apakah bisa digunakan tanpa internet?",
        a: "Ya. Saat offline, transaksi yang dicatat akan masuk ke antrian lokal. Strip notifikasi kuning akan muncul di balance card. Saat koneksi kembali, semua transaksi otomatis disinkronkan ke server."
      },
      {
        q: "Status sinkronisasi",
        a: "• Strip kuning: offline, transaksi menunggu\n• Strip biru berkedip: sedang menyinkronkan\n• Strip hilang: semua tersinkronkan\n\nTransaksi pending ditandai dengan badge 'Menunggu' di daftar transaksi."
      },
      {
        q: "Data apa yang tersedia offline?",
        a: "100 transaksi terakhir tersimpan sebagai cache lokal dan bisa dilihat saat offline. Data lain (hutang, aset, dll) memerlukan koneksi internet."
      },
    ]
  },
  {
    id: "tips",
    icon: Zap,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    title: "Tips & Trik",
    items: [
      {
        q: "Cara paling cepat catat transaksi",
        a: "Pakai Quick Command Bar:\n• '50k makan siang' → langsung tercatat sebagai pengeluaran Makan\n• 'in 5jt gaji' → pemasukan Gaji\n• '200k belanja pos Kebutuhan' → membuat kategori Kebutuhan otomatis\n\nAI akan belajar dari pola input kamu dan auto-klasifikasi kategori."
      },
      {
        q: "Format nominal yang didukung",
        a: "50k = Rp 50.000\n500rb = Rp 500.000\n1jt = Rp 1.000.000\n1.5jt = Rp 1.500.000\n500ribu = Rp 500.000\nAngka biasa juga bisa: 50000"
      },
      {
        q: "Foto nota transaksi",
        a: "Saat edit transaksi (tap ✏️), kamu bisa attach foto nota/struk. Foto otomatis dikompres ke max 2MB. Tap icon 👁️ di card transaksi untuk lihat foto fullscreen dengan zoom."
      },
      {
        q: "Mengatur batas anggaran bulanan",
        a: "Masuk ke tab Statistik → tap Alokasi → tap ✏️ pada kategori → atur batas. Sangat berguna untuk kontrol pengeluaran — progress bar akan merah saat mendekati batas."
      },
      {
        q: "Backup data",
        a: "Data tersimpan di Supabase (cloud). Untuk backup manual, gunakan fitur Ekspor Laporan di tab Lainnya → download file Excel."
      },
    ]
  },
];

// ── Accordion Item ────────────────────────────────────────────────────────────
const AccordionItem = memo(function AccordionItem({ item, index }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 dark:border-gray-800/50 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start justify-between py-3.5 text-left gap-3"
      >
        <p className={`text-sm font-bold transition-colors ${isOpen ? "text-blue-500" : "text-gray-800 dark:text-gray-200"}`}>
          {item.q}
        </p>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 mt-0.5"
        >
          <ChevronDown size={16} className="text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400 pb-4 leading-relaxed whitespace-pre-line">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ── Section ───────────────────────────────────────────────────────────────────
const Section = memo(function Section({ section }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#121827] rounded-[24px] border border-gray-100 dark:border-gray-800/60 shadow-sm overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-5 text-left"
      >
        <div className={`w-10 h-10 rounded-2xl ${section.bg} flex items-center justify-center shrink-0`}>
          <section.icon size={18} className={section.color} />
        </div>
        <div className="flex-1">
          <p className="font-black text-sm text-gray-900 dark:text-white">{section.title}</p>
          <p className="text-[9px] text-gray-400 mt-0.5">{section.items.length} topik</p>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-gray-400 shrink-0"
        >
          <ChevronDown size={18} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-2 border-t border-gray-100 dark:border-gray-800/50">
              {section.items.map((item, i) => (
                <AccordionItem key={i} item={item} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// ── Main ──────────────────────────────────────────────────────────────────────
const GuideTab = memo(function GuideTab({ onBack }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="fixed inset-0 z-[90] bg-white dark:bg-black overflow-y-auto no-scrollbar"
    >
      <div className="w-full max-w-lg mx-auto pt-8 px-3 pb-32">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-blue-500 hover:text-blue-400 transition-colors"
          >
            <span className="text-[10px] font-black uppercase tracking-widest">Lainnya</span>
          </button>
          <span className="text-gray-300 dark:text-gray-700 text-[10px]">›</span>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Panduan</span>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[28px] p-6 mb-6 relative overflow-hidden shadow-xl shadow-blue-500/20">
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10 blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={20} className="text-white" />
              <p className="text-white/80 text-[10px] font-black uppercase tracking-widest">Panduan Pengguna</p>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight mb-1">ArtaKita.</h2>
            <p className="text-white/70 text-xs font-bold">Panduan lengkap penggunaan semua fitur</p>
          </div>
        </div>

        {/* Quick start banner */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-[20px] p-4 mb-5 flex items-start gap-3">
          <Zap size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Mulai Cepat</p>
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 leading-relaxed">
              Ketik <span className="font-black text-amber-500">50k makan siang</span> di kolom bawah untuk catat pengeluaran, atau <span className="font-black text-blue-500">in 5jt gaji</span> untuk pemasukan.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {SECTIONS.map(section => (
            <Section key={section.id} section={section} />
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-1">
          <p className="text-[10px] text-gray-300 dark:text-gray-700 font-bold">
            ArtaKita v2.0.0
          </p>
          <p className="text-[9px] text-gray-300 dark:text-gray-700">
            dibuat dengan ♥ oleh MIH
          </p>
        </div>
      </div>
    </motion.div>
  );
});

export default GuideTab;
