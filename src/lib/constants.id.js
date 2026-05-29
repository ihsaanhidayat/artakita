// ============================================================
// ARTAKITA — BAHASA INDONESIA
// ============================================================

export const APP_NAME    = "ArtaKita";
export const APP_TAGLINE = "Artaku Artamu";
export const APP_VERSION = "2.0.0";
export const APP_AUTHOR  = "MIH";

export const NAV = {
  HOME:    "Beranda",
  STATS:   "Statistik",
  FINANCE: "Keuangan",
  MORE:    "Lainnya",
};

export const HOME = {
  TOTAL_BALANCE:  "Total Saldo",
  CIRCULATION:    "Sirkulasi Berjalan",
  INCOME:         "Pemasukan",
  EXPENSE:        "Pengeluaran",
  ACTIVITY_LOG:   "Log Aktivitas",
  SEARCH_HINT:    "Cari transaksi...",
  EMPTY:          "Belum ada transaksi",
  LOAD_MORE:      "Muat Lebih Banyak",
  LOADING:        "Memuat...",
  FILTER_TODAY:   "Hari Ini",
  FILTER_WEEK:    "7 Hari",
  FILTER_MONTH:   "Bulan Ini",
  FILTER_CUSTOM:  "Pilih Tanggal",
  ALL_CATEGORIES: "Semua",
  DATE_FROM:      "Dari Tanggal",
  DATE_TO:        "Sampai Tanggal",
  OFFLINE_MSG:    "Offline — transaksi akan disinkronkan saat online",
  SYNCING_MSG:    (n) => `Menyinkronkan ${n} transaksi...`,
  PENDING_MSG:    (n) => `${n} transaksi menunggu sinkronisasi`,
};

export const WALLET = {
  TITLE:       "Dompet",
  PERSONAL:    "Rekening Pribadi",
  SHARED_WITH: (u) => `Dibagikan ke @${u}`,
  SHARED_BY:   (u) => `Dibagikan oleh @${u}`,
  ACTIVE:      "Aktif",
  ADD_NEW:     "Tambah Rekening Baru",
  NAME_LABEL:  "Nama Rekening",
  NAME_HINT:   "Cth: BCA Pribadi",
  SAVE:        "Simpan",
  OPEN:        "Buka Rekening",
};

export const STATS = {
  TITLE:          "Statistik",
  TAB_EXPENSE:    "Pengeluaran",
  TAB_ALLOCATION: "Alokasi",
  TOTAL_EXPENSE:  "Total Pengeluaran",
  TOTAL_INCOME:   "Pemasukan",
  CATEGORY_DETAIL:"Rincian Kategori",
  ALLOCATION:     "Alokasi per Kategori",
  SET_LIMIT:      "Atur Batas",
  LIMIT_LABEL:    "Batas Anggaran",
  LIMIT_HINT:     "Cth: 500k, 1jt",
  DELETE_LIMIT:   "Hapus Batas",
  SAVE_LIMIT:     "Simpan Batas",
  USED_THIS_MONTH:"Terpakai bulan ini",
  CURRENT_LIMIT:  "Batas saat ini",
  REMAINING:      "Sisa",
  OVER_LIMIT:     "Melebihi Batas!",
  NOT_SET:        "Belum diatur",
  WARNING_OVER:   "Total alokasi melebihi saldo. Sesuaikan batas anggaran.",
  AFTER_ALLOC:    "Sisa saldo setelah alokasi",
  HEALTH_TITLE:   "Status Keuangan",
  NO_DATA:        "Belum ada data bulan ini",
  GRADE: {
    A: "Sangat Sehat! Surplus kas Anda aman.",
    B: "Bagus. Keuangan Anda cukup stabil bulan ini.",
    C: "Waspada. Kurangi pengeluaran yang tidak perlu.",
    D: "Bahaya! Pengeluaran nyaris melebihi pemasukan.",
    F: "Minus! Belum ada pemasukan yang tercatat.",
    "-": "Belum ada transaksi bulan ini.",
  },
};

export const FINANCE = {
  TITLE:          "Keuangan",
  DEBTS:          "Hutang & Piutang",
  RECURRING:      "Transaksi Rutin",
  ASSETS:         "Manajemen Aset",
  CATEGORIES:     "Kategori",
  SAVINGS:        "Celengan & Target",
  DEBTS_SUB:      "Catat & kelola hutang piutang",
  RECURRING_SUB:  "Jadwal transaksi berulang",
  ASSETS_SUB:     "Inventaris barang & properti",
  CATEGORIES_SUB: "Kelola kategori transaksi",
  SAVINGS_SUB:    "Tabungan & target impian",
};

export const DEBT = {
  TITLE:        "Hutang & Piutang",
  TAB_DEBT:     "Hutang",
  TAB_RECEIVE:  "Piutang",
  TAB_PAID:     "Lunas",
  TOTAL_DEBT:   "Total Hutang",
  TOTAL_REC:    "Total Piutang",
  SORT:         "Urutkan",
  SORT_NOMINAL: "Nominal Terbesar",
  SORT_PERCENT: "Persentase Terbayar",
  SORT_DUEDATE: "Jatuh Tempo Terdekat",
  ADD_NEW:      "Catat Baru",
  PERSON_NAME:  "Nama",
  PERSON_HINT:  "Cth: Budi, Siti",
  NOMINAL:      "Nominal",
  NOMINAL_HINT: "Cth: 500k, 1jt",
  DUE_DATE:     "Jatuh Tempo",
  PAY_DEBT:     "Bayar Hutang",
  RECEIVE:      "Terima Piutang",
  CANCEL:       "Batal",
  EDIT:         "Ubah",
  DELETE:       "Hapus",
  SAVE:         "Simpan",
  PAID_BADGE:   "Lunas",
  PAID_PERCENT: "Terbayar",
  REMAINING:    "Sisa",
  PAYMENT_HISTORY: "Riwayat Pembayaran",
  EMPTY_DEBT:   "Belum ada catatan hutang",
  EMPTY_REC:    "Belum ada catatan piutang",
  EMPTY_PAID:   "Belum ada yang lunas",
  SAVE_DEBT:    "Simpan Hutang",
  SAVE_REC:     "Simpan Piutang",
  WALLET_BALANCE: "Saldo dompet",
  EXCEED_DEBT:  (v) => `Melebihi sisa hutang: Rp ${v}`,
  EXCEED_BAL:   (v) => `Saldo tidak cukup! Saldo: Rp ${v}`,
  EXCEED_ZERO:  "Nominal harus lebih dari 0",
};

export const ASSET = {
  TITLE:        "Manajemen Aset",
  TOTAL_ASSETS: "Total Aset",
  TOTAL_VALUE:  "Estimasi Nilai",
  ITEMS:        "barang tercatat",
  ADD_NEW:      "Tambah Aset",
  EDIT:         "Ubah Aset",
  NAME_LABEL:   "Nama Barang",
  NAME_HINT:    "Cth: Laptop Dell XPS",
  STORE_LABEL:  "Nama Toko",
  STORE_HINT:   "Tokopedia, iBox...",
  DATE_LABEL:   "Tanggal Pembelian",
  PRICE_LABEL:  "Harga Beli",
  PRICE_HINT:   "Cth: 5jt, 500k",
  CONDITION:    "Kondisi",
  NOTES_LABEL:  "Catatan",
  NOTES_HINT:   "Serial number, garansi...",
  PHOTO:        "Foto Aset",
  CAMERA:       "Kamera / Galeri",
  SAVE:         "Simpan Aset",
  UPDATE:       "Perbarui Aset",
  EMPTY:        "Belum ada aset tercatat",
  CONDITIONS: {
    baru:          "Baru",
    baik:          "Baik",
    perlu_servis:  "Perlu Servis",
    rusak:         "Rusak",
  },
};

export const RECURRING = {
  TITLE:        "Transaksi Rutin",
  TOTAL:        "Total",
  ACTIVE:       "Aktif",
  DUE:          "Jatuh Tempo",
  ADD_NEW:      "Tambah Jadwal",
  EDIT:         "Ubah Jadwal",
  NOTE_LABEL:   "Catatan",
  NOTE_HINT:    "Cth: Gaji, Cicilan, Netflix",
  AMOUNT:       "Nominal",
  CATEGORY:     "Kategori",
  FREQ:         "Frekuensi",
  NEXT_DATE:    "Jadwal Berikutnya",
  RUN_NOW:      "Jalankan",
  ACTIVATE:     "Aktifkan",
  DEACTIVATE:   "Nonaktifkan",
  INACTIVE:     "Nonaktif",
  SAVE:         "Simpan Jadwal",
  UPDATE:       "Perbarui Jadwal",
  EMPTY:        "Belum ada transaksi rutin",
  DUE_ALERT:    (n) => `${n} transaksi rutin jatuh tempo`,
  FREQ_DAILY:   "Harian",
  FREQ_WEEKLY:  "Mingguan",
  FREQ_MONTHLY: "Bulanan",
  EVERY_DAY:    "Setiap hari",
  EVERY_WEEK:   "Setiap 7 hari",
  EVERY_MONTH:  "Setiap bulan",
};

export const MORE = {
  TITLE:         "Lainnya",
  EXPORT:        "Ekspor Laporan",
  EXPORT_SUB:    "Unduh data ke file Excel",
  USER_MGMT:     "Manajemen Pengguna",
  USER_MGMT_SUB: "Kelola akun pengguna (Admin)",
  ABOUT:         "Tentang Aplikasi",
  ABOUT_SUB:     `Versi ${APP_VERSION}`,
  LANGUAGE:      "Bahasa",
  LANGUAGE_SUB:  "Ganti bahasa tampilan",
  LOGOUT:        "Keluar dari Akun",
  LOGOUT_YES:    "Ya, Keluar",
  BY_AUTHOR:     `dibuat dengan ♥ oleh ${APP_AUTHOR}`,
};

export const ABOUT = {
  TITLE:   "Tentang ArtaKita",
  VERSION: `Versi ${APP_VERSION}`,
  DESC:    "Aplikasi manajemen keuangan pribadi & bersama yang cerdas, cepat, dan aman.",
  FEATURES:"Fitur Utama",
  FEATURE_LIST: [
    "Pencatatan transaksi cerdas",
    "Manajemen hutang & piutang",
    "Pelacakan aset",
    "Transaksi rutin otomatis",
    "Statistik & alokasi anggaran",
    "Berbagi dompet bersama",
    "Mode offline dengan sinkronisasi",
  ],
  TECH:    "Dibangun dengan Next.js, Supabase & ♥",
  BY:      `by ${APP_AUTHOR}`,
};

export const FORM = {
  SAVE:       "Simpan",
  CANCEL:     "Batal",
  EDIT:       "Ubah",
  DELETE:     "Hapus",
  ADD:        "Tambah",
  CLOSE:      "Tutup",
  PROCESSING: "Memproses...",
  SAVING:     "Menyimpan...",
  UPLOADING:  "Mengupload...",
  LOADING:    "Memuat...",
};

export const LOGIN = {
  TITLE:          APP_NAME,
  TAGLINE:        APP_TAGLINE,
  USERNAME_LABEL: "Username / Email",
  USERNAME_HINT:  "Masukkan username atau email",
  PASSWORD_LABEL: "Kata Sandi",
  PASSWORD_HINT:  "••••••••",
  SUBMIT:         "Masuk",
  LOADING:        "Memproses...",
  WRONG_PASS:     (r) => `Kata sandi salah! (Sisa percobaan: ${r})`,
  LOCKED:         "Akses dibekukan. Tunggu 30 detik.",
  FORCE_TITLE:    "Ganti Kata Sandi",
  FORCE_DESC:     "Demi keamanan, ganti kata sandi default sebelum melanjutkan.",
  NEW_PASS_HINT:  "Masukkan Kata Sandi Baru",
  FORCE_SUBMIT:   "Simpan & Lanjutkan",
};

export const TOAST = {
  TRX_ADDED:    "Transaksi berhasil dicatat! ✨",
  TRX_UPDATED:  "Transaksi berhasil diperbarui!",
  TRX_DELETED:  "Transaksi dihapus.",
  EXPORT_OK:    "Laporan berhasil diunduh!",
  OFFLINE:      "Tidak ada koneksi internet",
  SYNCED:       (n) => `${n} transaksi berhasil disinkronkan!`,
  ERROR:        "Terjadi kesalahan. Coba lagi.",
  FORMAT_ERROR: "Format salah! Cth: 50k makan siang",
};

export const CONFIRM = {
  DELETE_TRX:  "Hapus transaksi ini secara permanen?",
  CANT_UNDO:   "Tindakan ini tidak dapat dibatalkan.",
  DELETE_BTN:  "Hapus",
  CANCEL_BTN:  "Batal",
};

export const CMD = {
  HINT:          "Cth: 50k makan siang  |  in 5jt gaji",
  INCOME_PREFIX: "in",
};

export const LANG = {
  TITLE:      "Bahasa",
  ID:         "Indonesia",
  EN:         "English",
  CHANGE_MSG: "Bahasa berhasil diubah!",
};
