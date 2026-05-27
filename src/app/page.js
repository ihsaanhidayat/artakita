"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, ArrowUpCircle, ArrowDownCircle, Coffee, ShoppingBag, Receipt, Layers, Trash2, Edit3, Home as HomeIcon, PieChart as PieChartIcon, CreditCard, Settings, Plus, X, Command, Download, Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// Hooks
import { useFinData } from "@/hooks/useFinData";
import { useWallets } from "@/hooks/useWallets";

// Komponen Eksternal
import QuickCommandBar from "@/components/QuickCommandBar";
import ManageCategories from "@/components/ManageCategories";
import ShareWallet from "@/components/ShareWallet";
import EditWalletModal from "@/components/EditWalletModal";
import BudgetProgress from "@/components/BudgetProgress";
import ManageBudgets from "@/components/ManageBudgets";
import BudgetAlert from "@/components/BudgetAlert";

// === FUNGSI HELPER GLOBAL ===
const formatDateTime = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const day = days[date.getDay()];
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${day}, ${d}-${m}-${y} ${hh}:${min}`;
};

// === FUNGSI HELPER GLOBAL ===
const parseFlexibleNumber = (val) => {
  if (!val) return 0;
  const str = String(val).toLowerCase();
  const match = str.match(/([\d\.,]+)\s*(k|rb|ribu|m|jt|juta)?/);
  if (!match) return parseFloat(str.replace(/[^\d]/g, '')) || 0;

  // Mengubah koma jadi titik (jika nulis 1,5jt -> 1.5)
  let numStr = match[1].replace(/\./g, '').replace(/,/g, '.');
  let num = parseFloat(numStr);
  let mult = match[2];

  if (['k', 'rb', 'ribu'].includes(mult)) num *= 1000;
  if (['m', 'jt', 'juta'].includes(mult)) num *= 1000000;

  return num;
};

const CHART_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
const THEME_GRADIENTS = ["from-blue-500 to-indigo-600", "from-pink-500 to-rose-600", "from-emerald-400 to-teal-600", "from-amber-400 to-orange-500", "from-purple-500 to-fuchsia-600"];

// Bikin list 6 bulan terakhir untuk dropdown
const getRecentMonths = () => {
  const m = [];
  const d = new Date();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  for (let i = -3; i <= 2; i++) {
    const temp = new Date(d.getFullYear(), d.getMonth() + i, 1);
    const val = `${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}`;
    const lbl = `${monthNames[temp.getMonth()]} ${temp.getFullYear()}`;
    m.push({ value: val, label: lbl });
  }
  return m;
};

export default function Home() {
  // === 1. STATE GLOBAL ===
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [recentMonths] = useState(getRecentMonths());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // === STATE AUTHENTICATION (LOGIN & PASSWORD) ===
  const [session, setSession] = useState(null);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [forcePasswordModal, setForcePasswordModal] = useState({ isOpen: false, newPassword: '' });

  // === STATE UNTUK OTAK AI KATEGORI ===
  const [userCategories, setUserCategories] = useState([]);
  const [aiKeywords, setAiKeywords] = useState([]);

  // Fungsi untuk mengambil data Kategori & Kata Kunci dari Database
  const fetchAiBrain = async () => {
    if (!session?.user?.id) return;

    // 1. Ambil Kategori milik user
    const { data: cats } = await supabase
      .from('user_categories')
      .select('*')
      .order('name', { ascending: true });
    if (cats) setUserCategories(cats);

    // 2. Ambil Kata Kunci yang sudah dipelajari AI
    const { data: keys } = await supabase
      .from('ai_keywords')
      .select('*');
    if (keys) setAiKeywords(keys);
  };

  // Jalankan fetch setiap kali user berhasil login / session berubah
  useEffect(() => {
    if (session) {
      fetchAiBrain();
    }
  }, [session]);

  // 1. TARUH FUNGSI INI DI ATAS (Sebelum useEffect)
  const checkProfileStatus = async (userId) => {
    try {
      const { data, error } = await supabase.from('profiles').select('must_change_password').eq('id', userId).single();
      if (error) throw error;
      if (data && data.must_change_password) {
        setForcePasswordModal({ isOpen: true, newPassword: '' });
      }
    } catch (err) {
      console.error("Gagal cek profil:", err.message);
    }
  };

  // 2. BARU PANGGIL DI DALAM useEffect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkProfileStatus(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkProfileStatus(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []); // <-- React mungkin meminta checkProfileStatus dimasukkan ke dalam kurung siku ini jika Anda pakai ESLint ketat



  // === 2. STATE DOMPET ===
  const { wallets, addWallet } = useWallets();
  // === 2. STATE DOMPET AKTIF ===
  const [activeWallet, setActiveWallet] = useState({ id: "dompet-1", name: "Dompet Utama" });

  // Membaca dompet terakhir saat aplikasi pertama kali dimuat
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedWallet = localStorage.getItem("arta_active_wallet");
      if (savedWallet) setActiveWallet(JSON.parse(savedWallet));
    }
  }, []);

  // Menyimpan dompet ke memori setiap kali user pindah dompet
  useEffect(() => {
    if (activeWallet.id !== "dompet-1") {
      localStorage.setItem("arta_active_wallet", JSON.stringify(activeWallet));
    }
  }, [activeWallet]);

  // === 3. DATA FINANSIAL ===
  const { balance, transactions, addTransaction, deleteTransaction, updateTransaction } = useFinData(activeWallet.id);

  // Tambahkan ini di deretan useState Anda
  const [appScale, setAppScale] = useState(() => {
    if (typeof window !== "undefined") {
      return parseFloat(localStorage.getItem("appScale")) || 1;
    }
    return 1;
  });


  // Efek untuk menyimpan perubahan skala
  useEffect(() => {
    localStorage.setItem("appScale", appScale);
  }, [appScale]);

  // STATE UNTUK MODAL TAMBAH USER
  const [addUserModal, setAddUserModal] = useState({ isOpen: false, username: '', password: '', isLoading: false });

  // FUNGSI EKSEKUSI KE BACKEND KITA
  const handleCreateNewUser = async (e) => {
    e.preventDefault();
    setAddUserModal(prev => ({ ...prev, isLoading: true }));

    try {
      const res = await fetch('/api/admin/add-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: addUserModal.username,
          password: addUserModal.password
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      // Gunakan toast notification mewah Anda
      showNotification(`Akses untuk ${addUserModal.username} berhasil dibuat!`, "success");
      setAddUserModal({ isOpen: false, username: '', password: '', isLoading: false });
    } catch (err) {
      showNotification("Gagal: " + err.message, "error");
      setAddUserModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // ==========================================
  // 📊 FITUR EXPORT LAPORAN KE CSV
  // ==========================================
  const exportToCSV = () => {
    // 1. Cek apakah ada data transaksi
    if (!transactions || transactions.length === 0) {
      alert("⚠️ ArtaKita: Tidak ada data transaksi untuk diekspor.");
      return;
    }

    // 2. Tentukan Header Kolom (Format Indonesia)
    const headers = ["Tanggal", "Waktu", "Catatan", "Kategori", "Jenis", "Nominal (Rp)"];

    // 3. Mapping data transaksi menjadi baris-baris CSV
    const rows = transactions.map(trx => {
      const dateObj = new Date(trx.created_at);
      const tanggal = dateObj.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const waktu = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      // Bungkus catatan dengan tanda kutip ganda untuk mencegah error jika catatan mengandung koma
      const catatanClean = `"${trx.note.replace(/"/g, '""')}"`;
      const jenis = trx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';

      return [tanggal, waktu, catatanClean, trx.category, jenis, trx.amount];
    });

    // 4. Gabungkan header dan baris menggunakan separator koma
    // Menggunakan '\uFEFF' (BOM) agar Excel otomatis mendeteksi format UTF-8 (mencegah karakter berantakan)
    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    // 5. Trigger download file otomatis di browser
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    // Format nama file: Laporan_ArtaKita_25-05-2026.csv
    const dateFile = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_ArtaKita_${dateFile}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // === 4. STATE FILTER & MODAL (Disatukan agar tidak ganda) ===
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // State Semua Modal
  const [isSmartInputOpen, setIsSmartInputOpen] = useState(false);
  const [smartCommand, setSmartCommand] = useState("");
  const [editTrxModal, setEditTrxModal] = useState({ isOpen: false, data: null });
  const [newWalletModal, setNewWalletModal] = useState({ isOpen: false, name: '' });
  const [isEditWalletOpen, setIsEditWalletOpen] = useState(false);
  const [walletToEdit, setWalletToEdit] = useState(null);
  const [isShareWalletOpen, setIsShareWalletOpen] = useState(false);
  const [walletToShare, setWalletToShare] = useState(null);
  const [allBudgets, setAllBudgets] = useState([]);
  const [quickTimeFilter, setQuickTimeFilter] = useState('month');
  const [goals, setGoals] = useState([]);
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [newGoalData, setNewGoalData] = useState({ name: '', target: '', current: '' });

  // === STATE BARU UNTUK FITUR CELENGAN CANGGIH ===
  const [goalDeleteModal, setGoalDeleteModal] = useState({ isOpen: false, goalId: null, goalName: '' });
  const [activeGoalInput, setActiveGoalInput] = useState(null); // Menyimpan ID celengan yang sedang mau diisi/dikurangi
  const [flexibleSavingsAmount, setFlexibleSavingsAmount] = useState(''); // Menyimpan teks input (misal: 10k, 1jt)

  // STATE UNTUK MODAL KONFIRMASI HAPUS
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    const fetchAllBudgets = async () => {
      const { data } = await supabase.from('budgets').select('*').eq('month_year', selectedMonth);
      if (data) setAllBudgets(data);
    };
    fetchAllBudgets();
  }, [selectedMonth]);

  // === 5. EFEK & FUNGSI ===
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-pilih dompet pertama jika belum ada yang tersimpan di Local Storage
  useEffect(() => {
    const savedWallet = localStorage.getItem("arta_active_wallet");
    if (!savedWallet && wallets.length > 0 && activeWallet.id === "dompet-1") {
      setActiveWallet({ id: wallets[0].id, name: wallets[0].name });
    }
  }, [wallets, activeWallet.id]);

  // Kalkulasi Transaksi Bulan Ini
  const transactionsThisMonth = transactions.filter(t => t.created_at?.startsWith(selectedMonth));
  const incomeThisMonth = transactionsThisMonth.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const expenseThisMonth = transactionsThisMonth.filter(t => t.type === 'expense' || !t.type).reduce((acc, curr) => acc + Number(curr.amount), 0);

  // 1. Filter Data Transaksi Utama Dulu
  const existingCategories = [...new Set(transactionsThisMonth.map(t => t.category))];
  const dynamicCategories = ["Semua", ...existingCategories];

  const filteredTransactions = transactionsThisMonth.filter(t => {
    const matchType = typeFilter === 'all' ? true : (typeFilter === 'income' ? t.type === 'income' : (t.type === 'expense' || !t.type));
    const matchCat = categoryFilter === 'Semua' ? true : t.category === categoryFilter;

    // Logika Pencarian
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = searchQuery === '' ||
      t.note.toLowerCase().includes(searchLower) ||
      t.category.toLowerCase().includes(searchLower);

    // Logika Quick Time (Waktu Cepat)
    let matchTime = true;
    if (quickTimeFilter !== 'month' && t.created_at) {
      const trxDate = new Date(t.created_at);
      const today = new Date();

      if (quickTimeFilter === 'today') {
        matchTime = trxDate.toDateString() === today.toDateString();
      } else if (quickTimeFilter === 'week') {
        const pastWeek = new Date(today);
        pastWeek.setDate(today.getDate() - 7);
        matchTime = trxDate >= pastWeek && trxDate <= today;
      }
    }
    return matchType && matchCat && matchSearch && matchTime;
  });

  // 2. [BARU] Kalkulasi In/Out Dinamis Mengikuti Hasil Filter di Atas
  const filteredIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const filteredExpense = filteredTransactions.filter(t => t.type === 'expense' || !t.type).reduce((acc, curr) => acc + Number(curr.amount), 0);

  // Fetch Target Impian
  useEffect(() => {
    const fetchGoals = async () => {
      const { data } = await supabase.from('savings_goals').select('*').order('created_at', { ascending: true });
      if (data) setGoals(data);
    };
    fetchGoals();
  }, [activeTab]); // Trigger ulang setiap kali membuka tab

  // Fungsi Tambah Target Baru
  // Fungsi Tambah Target Baru
  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!newGoalData.name.trim() || !newGoalData.target) return;

    // Terjemahkan teks (5jt/50k) menjadi angka beneran
    const parsedTarget = parseFlexibleNumber(newGoalData.target);
    const parsedCurrent = parseFlexibleNumber(newGoalData.current);

    const { data, error } = await supabase.from('savings_goals').insert([{
      name: newGoalData.name,
      target_amount: parsedTarget,
      current_amount: parsedCurrent
    }]).select();

    if (!error && data) {
      setGoals([...goals, data[0]]);
      setIsNewGoalOpen(false);
      setNewGoalData({ name: '', target: '', current: '' });
    }
  };

  // Fungsi Edit Saldo Celengan (Mendukung Tambah, Kurang, dan Reset)
  const handleModifySavings = async (id, currentAmt, mode) => {
    let nextAmt = 0;

    if (mode === 'reset') {
      nextAmt = 0;
    } else {
      // Gunakan helper parseFlexibleNumber yang sudah kita buat sebelumnya untuk mengubah '1jt'/'50k' jadi angka asli
      const parsedAmount = parseFlexibleNumber(flexibleSavingsAmount);
      if (parsedAmount <= 0) {
        alert("⚠️ Masukkan nominal yang valid (Contoh: 10k, 500k, 1jt)");
        return;
      }

      nextAmt = mode === 'add' ? Number(currentAmt) + parsedAmount : Number(currentAmt) - parsedAmount;
      if (nextAmt < 0) nextAmt = 0; // Jaga agar saldo tidak minus
    }

    const { error } = await supabase.from('savings_goals').update({ current_amount: nextAmt }).eq('id', id);
    if (!error) {
      setGoals(goals.map(g => g.id === id ? { ...g, current_amount: nextAmt } : g));
      setFlexibleSavingsAmount('');
      setActiveGoalInput(null);
    }
  };

  // Fungsi memicu pembukaan modal konfirmasi hapus
  const triggerDeleteGoal = (id, name) => {
    setGoalDeleteModal({ isOpen: true, goalId: id, goalName: name });
  }; // <--- INI PENUTUP YANG HILANG!

  // === STATE UNTUK NOTIFIKASI MEWAH ===
  const [appNotification, setAppNotification] = useState({ isOpen: false, message: '', type: 'error' });

  const showNotification = (message, type = 'error') => {
    setAppNotification({ isOpen: true, message, type });
    // Otomatis menutup notifikasi setelah 4 detik
    setTimeout(() => setAppNotification({ isOpen: false, message: '', type: 'error' }), 4000);
  };

  // Fungsi mengeksekusi penghapusan dari database setelah dikonfirmasi "Ya, Hapus"
  const executeDeleteGoal = async () => {
    if (goalDeleteModal.goalId) {
      const { error } = await supabase.from('savings_goals').delete().eq('id', goalDeleteModal.goalId);
      if (!error) {
        setGoals(goals.filter(g => g.id !== goalDeleteModal.goalId));
      }
    }
    setGoalDeleteModal({ isOpen: false, goalId: null, goalName: '' });
  };

  // Data untuk Grafik Pie
  const expenseData = transactionsThisMonth
    .filter(t => t.type === 'expense' || !t.type)
    .reduce((acc, curr) => {
      const existing = acc.find(item => item.name === curr.category);
      if (existing) existing.value += Number(curr.amount);
      else acc.push({ name: curr.category, value: Number(curr.amount) });
      return acc;
    }, []).sort((a, b) => b.value - a.value);

  // === ACTION HANDLERS ===

  // === ACTION HANDLERS ===
  const getIcon = (category) => {
    switch (category) {
      case 'Makan': return <Coffee size={18} />;
      case 'Belanja': return <ShoppingBag size={18} />;
      case 'Tagihan': return <Receipt size={18} />;
      default: return <Layers size={18} />;
    }
  };

  const handleCreateWallet = async (e) => {
    e.preventDefault();
    if (!newWalletModal.name.trim()) return;
    const result = await addWallet(newWalletModal.name);
    if (result) {
      setNewWalletModal({ isOpen: false, name: '' });
      setActiveWallet({ id: result.id, name: result.name });
      setActiveTab('home');
    }
  };

  // Tambahkan fungsi ini di dalam komponen Anda
  const autoClassifyCategory = async (note) => {
    if (!note || note.length < 3) return;

    // Ambil memori AI (bisa Anda ambil dari state kategori/keywords yang sudah ada)
    const { data: keywords } = await supabase.from('ai_keywords').select('keyword, category_id(name)');

    const noteLower = note.toLowerCase();
    const match = keywords.find(k => noteLower.includes(k.keyword.toLowerCase()));

    if (match) {
      // Otomatis update kategori di state modal tanpa mengganti fokus user
      setEditTrxModal(prev => ({
        ...prev,
        data: { ...prev.data, category: match.category_id.name }
      }));
    }
  };

  const handleSaveTrxEdit = async (e) => {
    e.preventDefault();
    const currentData = editTrxModal.data;

    // Pengaman 1: Pastikan data benar-benar ada sebelum diproses
    if (!currentData || !currentData.note || !currentData.amount || !currentData.category) return;

    await updateTransaction(currentData.id, currentData.note, currentData.category, currentData.amount);

    // Pengaman 2: Jangan pernah set data menjadi null. 
    // Biarkan isOpen menjadi false agar Framer Motion bisa menutupnya dengan mulus.
    setEditTrxModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleSmartSubmit = async (e) => {
    e.preventDefault();
    if (!smartCommand.trim()) return;

    const cleanText = smartCommand.toLowerCase().trim();

    // 1. Ekstrak Tipe (in/out)
    let type = 'expense';
    let textWithoutType = cleanText;
    if (cleanText.startsWith('in ')) {
      type = 'income';
      textWithoutType = cleanText.substring(3).trim();
    } else if (cleanText.startsWith('out ')) {
      type = 'expense';
      textWithoutType = cleanText.substring(4).trim();
    }

    // 2. EKSTRAK NOMINAL UANG (Ini solusi anti-null!)
    // Regex ini bertugas memisahkan angka (misal: 15k) dengan kata-kata setelahnya
    const regexNominal = /^(\d+(?:[.,]\d+)?(?:k|rb|ribu|m|jt|juta)?)\s+(.+)$/i;
    const matchNominal = textWithoutType.match(regexNominal);

    let amount = 0;
    let rawNote = textWithoutType;

    if (matchNominal) {
      // Jika ketemu angka, langsung ubah jadi angka murni pakai fungsi bawaan Anda
      amount = parseFlexibleNumber(matchNominal[1]);
      rawNote = matchNominal[2].trim();
    } else {
      // Jika user tidak memasukkan angka (misal hanya ketik "out beli pulsa")
      showNotification("Format salah! Gunakan: [in/out] [angka] [catatan]", "error");
      return; // Hentikan proses agar tidak error masuk ke database
    }

    // 3. LOGIKA AI PEMBELAJARAN (POS KATEGORI)
    let categoryName = "Lainnya";
    let finalNote = rawNote;

    if (rawNote.includes(' pos ')) {
      const parts = rawNote.split(' pos ');
      finalNote = parts[0].trim();
      const targetCategory = parts[1].trim();

      if (targetCategory && finalNote) {
        categoryName = targetCategory.charAt(0).toUpperCase() + targetCategory.slice(1);
        const coreKeyword = finalNote.replace(/(beli|bayar|untuk)\s*/g, '').trim();

        // AI Belajar di background
        setTimeout(async () => {
          try {
            let { data: catData } = await supabase.from('user_categories').select('id').eq('name', categoryName).single();
            if (!catData) {
              const { data: newCat } = await supabase.from('user_categories').insert([{ name: categoryName }]).select('id').single();
              catData = newCat;
            }
            if (catData) {
              await supabase.from('ai_keywords').insert([{ category_id: catData.id, keyword: coreKeyword }]);
              fetchAiBrain();
            }
          } catch (err) {
            console.log("AI: Kata kunci sudah dipelajari.");
          }
        }, 500);
      }
    } else {
      // AI Mengingat otomatis
      const coreWords = rawNote.replace(/(beli|bayar|untuk)\s*/g, '').trim().split(' ');
      const matchKey = aiKeywords.find(k => coreWords.includes(k.keyword));

      if (matchKey) {
        const matchCat = userCategories.find(c => c.id === matchKey.category_id);
        if (matchCat) categoryName = matchCat.name;
      }
    }

    // Rapikan huruf pertama catatan agar kapital
    finalNote = finalNote.charAt(0).toUpperCase() + finalNote.slice(1);

    // 4. SIMPAN KE DATABASE (DENGAN PERLINDUNGAN TOAST MEWAH)
    try {
      // ⚠️ TUGAS PENTING UNTUK ANDA: 
      // Cek file `src/hooks/useFinData.js` pada bagian fungsi addTransaction.
      // Pastikan urutan dalam kurung di bawah ini sama persis dengan yang ada di sana!
      // Format saat ini: (catatan, nominal, kategori, tipe)
      await addTransaction(finalNote, amount, categoryName, type);

      setSmartCommand("");
      setIsSmartInputOpen(false);
      showNotification("Transaksi berhasil dicatat! ✨", "success");

    } catch (error) {
      // Memanggil Toast Mewah, BUKAN alert jelek
      showNotification("Gagal: " + error.message, "error");
    }
  };

  // 3. Logika Login Pintar
    const handleLogin = async (e) => {
      e.preventDefault();
      setIsAuthLoading(true);
      setAuthError('');

      let rawInput = authUsername.trim().toLowerCase();
      let finalLoginEmail = rawInput;

      if (!rawInput.includes('@')) {
        finalLoginEmail = `${rawInput}@artakita.internal`;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: finalLoginEmail,
        password: authPassword,
      });

      if (error) {
        setAuthError('Username/Email atau password salah!');
        setIsAuthLoading(false);
      } else {
        window.location.reload(); 
      }
    };

    // 4. Logika Logout & Cuci Gudang
    const handleLogout = async () => {
      await supabase.auth.signOut();
      localStorage.removeItem("arta_active_wallet"); 
      window.location.reload(); 
    };

    // 4. Logika Paksa Ganti Password
    const handleForceChangePassword = async (e) => {
      e.preventDefault();
      if (forcePasswordModal.newPassword.length < 6) {
        alert("Password baru minimal 6 karakter!");
        return;
      }
      setIsAuthLoading(true);

      const { error: authError } = await supabase.auth.updateUser({ password: forcePasswordModal.newPassword });

      if (authError) {
        alert("Gagal update password: " + authError.message);
        setIsAuthLoading(false);
        return;
      }

      await supabase.from('profiles').update({ must_change_password: false }).eq('id', session.user.id);

      setForcePasswordModal({ isOpen: false, newPassword: '' });
      alert("Password berhasil diperbarui! Selamat datang.");
      setIsAuthLoading(false);
    };

    // =========================================================================
    // STRUCTURE RETURN UTAMA (Pembungkus Tema Global untuk Semua Layar)
    // =========================================================================
    return (
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-[#0a0f1c]' : 'bg-gray-50'}`}>

        {!session ? (
          /* LAYAR LOGIN (Otomatis Mendukung Mode Gelap & Terang secara Konsisten) */
          <main className="w-full max-w-lg mx-auto min-h-screen flex flex-col items-center justify-center p-6 bg-transparent">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-white dark:bg-[#121827] p-8 rounded-[32px] shadow-2xl border border-gray-100 dark:border-gray-800">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">ArtaKita.</h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Artaku Artamu</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Username / Email</label>
                  <input type="text" required value={authUsername} onChange={e => setAuthUsername(e.target.value)} placeholder="Masukkan username atau email" className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                  <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="••••••••" className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-all" />
                </div>

                {authError && <p className="text-xs font-bold text-red-500 text-center bg-red-500/10 py-2 rounded-xl">{authError}</p>}

                <button type="submit" disabled={isAuthLoading} className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50">
                  {isAuthLoading ? "Memproses..." : "Masuk"}
                </button>
              </form>
            </motion.div>
          </main>
        ) : (
          /* LAYAR APLIKASI UTAMA (Hanya Muncul Jika Sudah Berhasil Login) */
          <main className="w-full max-w-lg mx-auto relative min-h-screen overflow-x-hidden bg-white dark:bg-black">

            {/* CUSTOM LUXURY TOAST NOTIFICATION */}
            <AnimatePresence>
              {appNotification.isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  className="fixed top-6 left-0 right-0 z-[999999] flex justify-center px-4 pointer-events-none"
                >
                  <div className={`flex items-center gap-3 px-5 py-3.5 rounded-full shadow-2xl backdrop-blur-xl border ${appNotification.type === 'error'
                    ? 'bg-red-500/10 border-red-500/20 text-red-500 shadow-red-500/10'
                    : 'bg-green-500/10 border-green-500/20 text-green-500 shadow-green-500/10'
                    }`}>
                    {appNotification.type === 'error' ? <X size={18} /> : <Command size={18} />}
                    <span className="text-xs font-bold tracking-wide">{appNotification.message}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* MODAL FORCE CHANGE PASSWORD (Membajak Layar Dasbor Jika Menggunakan Password Default) */}
            <AnimatePresence>
              {forcePasswordModal.isOpen && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-red-500/30 text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>

                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 tracking-tight">Ganti Password Anda</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 font-bold leading-relaxed">
                      Demi keamanan, Anda wajib mengganti password default sebelum dapat mengakses sistem keuangan.
                    </p>

                    <form onSubmit={handleForceChangePassword} className="space-y-4">
                      <input type="password" required minLength="6" placeholder="Masukkan Password Baru" value={forcePasswordModal.newPassword} onChange={e => setForcePasswordModal({ ...forcePasswordModal, newPassword: e.target.value })} className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-sm font-bold text-center text-gray-900 dark:text-white outline-none focus:border-red-500 transition-all" />

                      <button type="submit" disabled={isAuthLoading} className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-red-500/30 transition-all">
                        {isAuthLoading ? "Menyimpan..." : "Simpan & Lanjutkan"}
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* MODAL: TAMBAH USER BARU (ADMIN ONLY) */}
            <AnimatePresence>
              {addUserModal.isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800/80 relative"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-widest">Tambah Pengguna</h3>
                      <button onClick={() => setAddUserModal({ isOpen: false, username: '', password: '', isLoading: false })} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800/50 rounded-full transition-colors">
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleCreateNewUser} className="space-y-4">
                      <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Username Baru</label>
                        <input
                          type="text"
                          required
                          autoFocus
                          value={addUserModal.username}
                          onChange={(e) => setAddUserModal({ ...addUserModal, username: e.target.value.replace(/\s+/g, '') })}
                          className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-4 px-5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold transition-all"
                          placeholder="Contoh: ayu, agus, dsb."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Password Sementara</label>
                        <input
                          type="text"
                          required
                          value={addUserModal.password}
                          onChange={(e) => setAddUserModal({ ...addUserModal, password: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-4 px-5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold transition-all"
                          placeholder="Minimal 6 karakter"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={addUserModal.isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/30 mt-4"
                      >
                        {addUserModal.isLoading ? 'Memproses...' : 'Daftarkan Akses'}
                      </button>
                    </form>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ======================================= */}
            {/* AREA TABS (DI RENDER SECARA CONDITIONAL)*/}
            {/* ======================================= */}
            <AnimatePresence mode="wait">

              {/* TAB 1: HOME DASHBOARD */}
              {activeTab === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="pt-8 px-3 h-[100dvh] w-full flex flex-col overflow-hidden"
                >
                  {/* SECTION: HEADER (TIPOGRAFI MEWAH & RESPONSIVE) */}
                  <div className="flex-none">
                    <div className="flex justify-between items-center mb-6 sm:mb-8">
                      <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">ArtaKita.</h1>
                        <p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 tracking-[0.2em] uppercase mt-1">{activeWallet.name}</p>
                      </div>
                      <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 transition-all active:scale-90 hover:shadow-md">
                        {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
                      </button>
                    </div>

                    {/* KARTU SALDO UTAMA */}
                    <div className="bg-white dark:bg-[#121827] rounded-[32px] sm:rounded-[40px] p-7 sm:p-10 shadow-2xl shadow-blue-500/10 border border-gray-100 dark:border-gray-800/60 mb-6 sm:mb-8 transition-all">
                      <p className="text-[10px] sm:text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-3 sm:mb-4">Total Saldo (Semua Waktu)</p>
                      <div className="flex items-baseline gap-2 sm:gap-3 mb-8 sm:mb-10">
                        <span className="text-3xl sm:text-4xl font-bold text-gray-300 dark:text-gray-700">Rp</span>
                        <span className="text-5xl sm:text-7xl font-black text-gray-900 dark:text-white tracking-tighter">{balance.toLocaleString('id-ID')}</span>
                      </div>

                      <BudgetAlert budgets={allBudgets} transactions={transactionsThisMonth} />

                      {/* KARTU SIRKULASI (DINAMIS MENGIKUTI FILTER) */}
                      <p className="text-[10px] sm:text-xs font-black text-blue-500/60 dark:text-blue-400/60 uppercase tracking-widest mb-3 sm:mb-4 border-t border-gray-100 dark:border-gray-800 pt-4 sm:pt-6">Sirkulasi Berjalan</p>
                      <div className="grid grid-cols-2 gap-4 sm:gap-6">
                        <button onClick={() => setTypeFilter(typeFilter === 'income' ? 'all' : 'income')} className={`p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border transition-all ${typeFilter === 'income' ? 'bg-green-500/10 border-green-500 shadow-lg shadow-green-500/20' : 'bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                          <div className="flex items-center gap-1.5 sm:gap-2 text-green-600 dark:text-green-500 mb-1.5 sm:mb-2"><ArrowDownCircle size={16} className="sm:w-5 sm:h-5" /><span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">Pemasukan</span></div>
                          <p className="font-bold text-gray-800 dark:text-gray-200 text-base sm:text-lg text-left">Rp {filteredIncome.toLocaleString('id-ID')}</p>
                        </button>
                        <button onClick={() => setTypeFilter(typeFilter === 'expense' ? 'all' : 'expense')} className={`p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border transition-all ${typeFilter === 'expense' ? 'bg-red-500/10 border-red-500 shadow-lg shadow-red-500/20' : 'bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                          <div className="flex items-center gap-1.5 sm:gap-2 text-red-600 dark:text-red-500 mb-1.5 sm:mb-2"><ArrowUpCircle size={16} className="sm:w-5 sm:h-5" /><span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">Pengeluaran</span></div>
                          <p className="font-bold text-gray-800 dark:text-gray-200 text-base sm:text-lg text-left">Rp {filteredExpense.toLocaleString('id-ID')}</p>
                        </button>
                      </div>
                    </div>

                    {/* SMART SEARCH BAR (STATIC) */}
                    <div className="relative mb-6">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search size={16} className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Cari transaksi"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#121827] border border-gray-200 dark:border-gray-800/60 rounded-[24px] py-3.5 pl-11 pr-10 text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-500 transition-all shadow-sm"
                      />
                      <AnimatePresence>
                        {searchQuery && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X size={16} />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* DYNAMIC CATEGORIES (DRAG SCROLL) */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar cursor-grab snap-x">
                      {dynamicCategories.map((cat) => (
                        <button key={cat} onClick={() => setCategoryFilter(cat)}
                          className={`snap-center shrink-0 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${categoryFilter === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-transparent text-gray-500 border border-gray-200 dark:border-gray-800'
                            }`}>
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* QUICK TIME FILTER (PILLS TOGGLE) */}
                    <div className="flex bg-gray-100 dark:bg-[#121827] p-1 rounded-[16px] mb-6 border border-gray-200 dark:border-gray-800/60 shadow-inner">
                      <button
                        onClick={() => setQuickTimeFilter('today')}
                        className={`flex-1 text-[9px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all duration-300 ${quickTimeFilter === 'today' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                      >
                        Hari Ini
                      </button>
                      <button
                        onClick={() => setQuickTimeFilter('week')}
                        className={`flex-1 text-[9px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all duration-300 ${quickTimeFilter === 'week' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                      >
                        7 Hari
                      </button>
                      <button
                        onClick={() => setQuickTimeFilter('month')}
                        className={`flex-1 text-[9px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all duration-300 ${quickTimeFilter === 'month' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                      >
                        Bulan Ini
                      </button>
                    </div>

                    {/* AREA JUDUL LOG AKTIVITAS */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-600 tracking-[0.3em] uppercase">Log Aktivitas</h2>
                        <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {filteredTransactions.length} Item
                        </span>
                      </div>

                      <div className="relative group">
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="appearance-none bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-500/50 rounded-xl pl-3 pr-8 py-1.5 text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer transition-all shadow-sm">
                          {recentMonths.map(m => <option key={m.value} value={m.value} className="bg-white dark:bg-[#121827] text-gray-900 dark:text-white font-bold">{m.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECTION: LIST (FLEX-1 = AREA YANG SCROLLING) */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-32 min-h-0">
                    <AnimatePresence mode="popLayout">
                      {filteredTransactions.map((trx) => (
                        <motion.div key={trx.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                          className="flex items-center justify-between p-4 rounded-[24px] bg-white dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800/40 hover:border-blue-500/30 transition-all mb-3"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 shadow-inner">
                              {getIcon(trx.category)}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-gray-800 dark:text-gray-100 tracking-tight">{trx.note}</p>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{trx.category}</p>
                              <p className={`text-[8px] mt-0.5 ${trx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>{formatDateTime(trx.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className={`font-black text-sm mr-1 ${trx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                              {trx.type === 'income' ? '+' : '-'} {trx.amount.toLocaleString('id-ID')}
                            </p>
                            <div className="flex gap-1 opacity-40 hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditTrxModal({ isOpen: true, data: { ...trx } })} className="p-2 text-gray-400 hover:text-blue-500 rounded-xl transition-all"><Edit3 size={14} /></button>
                              <button onClick={() => { setItemToDelete({ id: trx.id, amount: trx.amount }); setIsDeleteModalOpen(true); }} className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition-all"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {filteredTransactions.length === 0 && (
                      <div className="text-center py-20 bg-gray-50/50 dark:bg-gray-900/10 rounded-[32px] border border-dashed border-gray-200 dark:border-gray-800">
                        <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.4em]">Kosong</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 2: STATS & ANALYTICS (DENGAN FINANCIAL GRADE) */}
              {activeTab === 'analytics' && (
                <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="pt-8 px-3 pb-32 h-full overflow-y-auto min-h-0 no-scrollbar w-full flex flex-col">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">Analitik Pengeluaran</h2>

                  {(() => {
                    try {
                      // 1. PENGAMANAN & PEMISAHAN DATA
                      const safeTransactions = Array.isArray(filteredTransactions) ? filteredTransactions : [];
                      const expenses = safeTransactions.filter(trx => trx && trx.type === 'expense');
                      const incomes = safeTransactions.filter(trx => trx && trx.type === 'income');

                      // 2. KELOMPOKKAN PENGELUARAN
                      const dataRaw = expenses.reduce((acc, trx) => {
                        const amt = Number(trx.amount) || 0;
                        const cat = trx.category || 'Lainnya';
                        const existing = acc.find(item => item.name === cat);
                        if (existing) {
                          existing.value += amt;
                        } else {
                          acc.push({ name: cat, value: amt });
                        }
                        return acc;
                      }, []);

                      // 3. KALKULASI TOTAL
                      const statsData = dataRaw.sort((a, b) => b.value - a.value);
                      const totalExpense = statsData.reduce((sum, item) => sum + item.value, 0);
                      const totalIncome = incomes.reduce((sum, trx) => sum + (Number(trx.amount) || 0), 0);

                      // 4. LOGIKA AI RAPOR KEUANGAN (FINANCIAL GRADE)
                      let healthGrade = "A";
                      let healthMessage = "Sangat Sehat! Surplus kas Anda aman.";
                      let gradeColor = "text-green-500";
                      let gradeBg = "from-green-500/20 to-green-500/5 border-green-500/30";

                      if (totalIncome > 0) {
                        const expenseRatio = totalExpense / totalIncome;
                        if (expenseRatio >= 0.9) {
                          healthGrade = "D";
                          healthMessage = "Bahaya! Pengeluaran nyaris melebihi pemasukan.";
                          gradeColor = "text-red-500";
                          gradeBg = "from-red-500/20 to-red-500/5 border-red-500/30";
                        } else if (expenseRatio >= 0.7) {
                          healthGrade = "C";
                          healthMessage = "Waspada. Kurangi pengeluaran yang tidak perlu.";
                          gradeColor = "text-orange-500";
                          gradeBg = "from-orange-500/20 to-orange-500/5 border-orange-500/30";
                        } else if (expenseRatio >= 0.5) {
                          healthGrade = "B";
                          healthMessage = "Bagus. Keuangan Anda cukup stabil bulan ini.";
                          gradeColor = "text-blue-500";
                          gradeBg = "from-blue-500/20 to-blue-500/5 border-blue-500/30";
                        }
                      } else if (totalExpense > 0 && totalIncome === 0) {
                        healthGrade = "F";
                        healthMessage = "Minus! Belum ada pemasukan yang tercatat.";
                        gradeColor = "text-red-500";
                        gradeBg = "from-red-500/20 to-red-500/5 border-red-500/30";
                      } else {
                        healthGrade = "-";
                        healthMessage = "Belum ada transaksi bulan ini.";
                        gradeColor = "text-gray-400";
                        gradeBg = "from-gray-500/10 to-transparent border-gray-500/20";
                      }

                      const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6'];

                      return (
                        <div className="space-y-4 mb-8">

                          {/* KOTAK RAPOR KESEHATAN KEUANGAN */}
                          <div className={`bg-gradient-to-br ${gradeBg} rounded-[24px] p-5 border shadow-sm flex items-center justify-between mb-4 transition-colors`}>
                            <div>
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Status Keuangan</p>
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-snug pr-4">{healthMessage}</p>
                            </div>
                            <div className={`shrink-0 w-14 h-14 rounded-2xl bg-white dark:bg-[#121827] shadow-sm flex items-center justify-center text-2xl font-black ${gradeColor}`}>
                              {healthGrade}
                            </div>
                          </div>

                          {/* KOTAK TOTAL PENGELUARAN */}
                          <div className="bg-white dark:bg-[#121827] rounded-[32px] p-8 shadow-2xl shadow-red-500/10 border border-gray-100 dark:border-gray-800/60 mb-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
                            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 opacity-50"></div>
                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-2">Total Pengeluaran</p>
                            <p className="text-4xl font-black text-red-500 tracking-tighter">
                              <span className="text-2xl mr-1">Rp</span>
                              {totalExpense.toLocaleString('id-ID')}
                            </p>
                          </div>

                          <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.3em] mb-4 pl-2">Rincian Kategori</h3>

                          {statsData.length > 0 ? statsData.map((item, index) => {
                            const percentage = totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(1) : 0;
                            const barColor = COLORS[index % COLORS.length];

                            return (
                              <div key={item.name} className="bg-white dark:bg-gray-900/40 p-5 rounded-[24px] border border-gray-100 dark:border-gray-800/50 shadow-sm mb-3">
                                <div className="flex justify-between items-end mb-3">
                                  <div>
                                    <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{item.name}</p>
                                    <p className="text-[10px] font-black text-gray-400 mt-0.5 tracking-wider">{percentage}%</p>
                                  </div>
                                  <p className="font-black text-sm text-gray-900 dark:text-white">Rp {item.value.toLocaleString('id-ID')}</p>
                                </div>

                                <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: barColor }}
                                  />
                                </div>
                              </div>
                            );
                          }) : (
                            <div className="text-center py-16 bg-gray-50/50 dark:bg-gray-900/10 rounded-[32px] border border-dashed border-gray-200 dark:border-gray-800">
                              <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.4em]">Belum Ada Data</p>
                            </div>
                          )}
                        </div>
                      );
                    } catch (error) {
                      return (
                        <div className="bg-red-50 border border-red-200 p-6 rounded-[24px] mt-4">
                          <p className="text-red-600 font-bold mb-2">Terjadi Kesalahan Render:</p>
                          <p className="text-xs text-red-500 break-words">{error.toString()}</p>
                        </div>
                      );
                    }
                  })()}
                </motion.div>
              )}

              {/* TAB 3: WALLETS & SAVINGS GOALS */}
              {activeTab === 'wallets' && (
                <motion.div key="wallets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="pt-8 px-3 pb-32 h-full overflow-y-auto min-h-0 no-scrollbar w-full flex flex-col">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">Pilih Dompet</h2>

                  {/* DAFTAR REKENING */}
                  <div className="space-y-4 mb-10">
                    {wallets.length === 0 && <p className="text-center text-xs font-bold text-gray-500">Memuat Rekening...</p>}

                    {wallets.map((wallet, idx) => (
                      <motion.div key={wallet.id} whileTap={{ scale: 0.95 }} onClick={() => { setActiveWallet({ id: wallet.id, name: wallet.name }); setActiveTab('home'); }}
                        className={`w-full text-left relative overflow-hidden rounded-[32px] p-6 transition-all border-2 cursor-pointer ${activeWallet.id === wallet.id ? 'border-blue-500 shadow-xl shadow-blue-500/20' : 'border-transparent shadow-lg hover:border-gray-300 dark:hover:border-gray-700'
                          }`}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${THEME_GRADIENTS[idx % THEME_GRADIENTS.length]} opacity-90`}></div>
                        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
                        <div className="absolute -left-8 -bottom-8 w-24 h-24 rounded-full bg-black/10 blur-xl"></div>
                        <div className="relative z-10 flex justify-between items-center">
                          <div>
                            <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Rekening Tersimpan</p>
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="text-white text-2xl font-bold tracking-tight">{wallet.name}</h3>

                              {/* BADGE DOMPET AKTIF */}
                              {activeWallet.id === wallet.id && (
                                <span className="px-2.5 py-1 rounded-lg bg-white/20 border border-white/40 text-white text-[9px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                  Aktif
                                </span>
                              )}

                              <div className="flex gap-1.5 opacity-60 hover:opacity-100 transition-opacity ml-1">
                                <button onClick={(e) => { e.stopPropagation(); setWalletToEdit(wallet); setIsEditWalletOpen(true); }} className="p-1.5 bg-white/20 rounded-full hover:bg-white/40 transition-colors backdrop-blur-md">
                                  <Edit3 size={12} className="text-white" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setWalletToShare(wallet); setIsShareWalletOpen(true); }} className="p-1.5 bg-white/20 rounded-full hover:bg-white/40 transition-colors backdrop-blur-md">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md bg-white/20 border border-white/30 text-white ${activeWallet.id === wallet.id ? 'opacity-100' : 'opacity-50'}`}>
                            {activeWallet.id === wallet.id ? <ArrowDownCircle size={20} /> : <CreditCard size={20} />}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    <button onClick={() => setNewWalletModal({ isOpen: true, name: '' })} className="w-full p-5 rounded-[24px] border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400 hover:text-blue-500 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider">
                      <span>+</span> Tambah Rekening Baru
                    </button>
                  </div>

                  {/* FITUR: TARGET IMPIAN (SAVINGS GOALS) */}
                  <div className="border-t border-gray-100 dark:border-gray-800/80 pt-8 space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-600 tracking-[0.3em] uppercase">Target Impian (Celengan)</h2>
                      <button
                        onClick={() => setIsNewGoalOpen(!isNewGoalOpen)}
                        className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all active:scale-95"
                      >
                        {isNewGoalOpen ? "Batal" : "+ Target"}
                      </button>
                    </div>

                    {/* FORM INPUT TARGET BARU */}
                    <AnimatePresence>
                      {isNewGoalOpen && (
                        <motion.form
                          initial={{ opacity: 0, h: 0 }} animate={{ opacity: 1, h: "auto" }} exit={{ opacity: 0, h: 0 }}
                          onSubmit={handleAddGoal} className="bg-gray-50 dark:bg-gray-900/40 p-5 rounded-[24px] border border-gray-100 dark:border-gray-800/50 space-y-3 mb-6"
                        >
                          <input type="text" required placeholder="Nama impian (Cth: Laptop Baru, Dana Darurat)" value={newGoalData.name} onChange={e => setNewGoalData({ ...newGoalData, name: e.target.value })} className="w-full bg-white dark:bg-[#121827] border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-4 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500" />
                          <div className="grid grid-cols-2 gap-3">
                            <input type="text" required placeholder="Target (Cth: 5jt, 500k)" value={newGoalData.target} onChange={e => setNewGoalData({ ...newGoalData, target: e.target.value })} className="w-full bg-white dark:bg-[#121827] border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-4 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500" />
                            <input type="text" placeholder="Isi Awal (Opsional)" value={newGoalData.current} onChange={e => setNewGoalData({ ...newGoalData, current: e.target.value })} className="w-full bg-white dark:bg-[#121827] border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-4 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500" />
                          </div>
                          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md transition-all">Simpan Target</button>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    {/* ITERASI DAFTAR CELENGAN */}
                    {goals.map((goal) => {
                      const pct = Math.min(100, ((goal.current_amount / goal.target_amount) * 100)).toFixed(0);
                      const isInputOpen = activeGoalInput === goal.id;

                      return (
                        <div key={goal.id} className="bg-white dark:bg-[#121827] p-5 rounded-[24px] border border-gray-100 dark:border-gray-800/60 shadow-sm relative overflow-hidden mb-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-sm text-gray-900 dark:text-white tracking-tight">{goal.name}</p>
                              <p className="text-[10px] text-gray-400 font-normal mt-0.5">
                                Rp {goal.current_amount.toLocaleString('id-ID')} / <span className="font-bold text-gray-500 dark:text-gray-400">Rp {goal.target_amount.toLocaleString('id-ID')}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-black text-blue-500 mr-2">{pct}%</span>

                              {/* Tombol Hapus Target */}
                              <button
                                onClick={() => triggerDeleteGoal(goal.id, goal.name)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                title="Hapus Target"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* PROGRESS BAR */}
                          <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-3 mb-4">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                            />
                          </div>

                          {/* PANEL INPUT MODIFIKASI NOMINAL BEBAS */}
                          <div className="pt-2 border-t border-gray-50 dark:border-gray-800/40">
                            {!isInputOpen ? (
                              <div className="flex justify-between items-center">
                                <button
                                  onClick={() => setActiveGoalInput(goal.id)}
                                  className="text-[9px] font-black text-blue-500 bg-blue-500/10 border border-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500 hover:text-white transition-all uppercase tracking-wider"
                                >
                                  Mutasi Saldo
                                </button>
                                <button
                                  onClick={() => handleModifySavings(goal.id, goal.current_amount, 'reset')}
                                  className="text-[9px] font-black text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider"
                                >
                                  Reset Nominal
                                </button>
                              </div>
                            ) : (
                              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  placeholder="Isi angka (Cth: 10k, 50k, 1jt)"
                                  value={flexibleSavingsAmount}
                                  onChange={(e) => setFlexibleSavingsAmount(e.target.value)}
                                  className="flex-1 bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-xl py-2 px-3 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500"
                                />
                                <button
                                  onClick={() => handleModifySavings(goal.id, goal.current_amount, 'add')}
                                  className="px-3 py-2 bg-green-600 text-white font-black text-[9px] uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all"
                                >
                                  + Tabung
                                </button>
                                <button
                                  onClick={() => handleModifySavings(goal.id, goal.current_amount, 'subtract')}
                                  className="px-3 py-2 bg-red-600 text-white font-black text-[9px] uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all"
                                >
                                  - Pakai
                                </button>
                                <button
                                  onClick={() => { setActiveGoalInput(null); setFlexibleSavingsAmount(''); }}
                                  className="p-2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                                >
                                  Batal
                                </button>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {goals.length === 0 && !isNewGoalOpen && (
                      <div className="text-center py-10 bg-gray-50/50 dark:bg-gray-900/10 rounded-[24px] border border-dashed border-gray-200 dark:border-gray-800">
                        <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.4em]">Belum Ada Target</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 4: SETTINGS */}
              {activeTab === 'settings' && (
                <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="pt-8 px-4 pb-32 h-full overflow-y-auto min-h-0 no-scrollbar w-full flex flex-col">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">Pengaturan</h2>

                  <div className="mb-6"><ManageCategories /></div>
                  <div className="mb-8"><ManageBudgets selectedMonth={selectedMonth} /></div>

                  {/* TOMBOL EXPORT LAPORAN DI SINI */}
                  <div className="mb-8">
                    <button
                      onClick={exportToCSV}
                      className="w-full p-5 rounded-[24px] bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-between font-bold text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                          <Download size={18} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Unduh Laporan Keuangan</p>
                          <p className="text-[10px] text-gray-400 font-normal">Format .CSV (Excel / Spreadsheets)</p>
                        </div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                  </div>

                  {/* TOMBOL LOGOUT TETAP DI BAWAH */}
                  <div className="mt-auto">
                    <button onClick={handleLogout} className="relative z-10 w-full p-6 rounded-[32px] bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs" >
                      Keluar dari Akun
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* ======================================= */}
            {/* AREA MODALS & BOTTOM NAV (DILUAR TABS)  */}
            {/* ======================================= */}
            {activeTab === 'home' && <QuickCommandBar onProcessTransaction={addTransaction} />}

            {/* MODAL: EDIT TRANSAKSI */}
            <AnimatePresence>
              {editTrxModal.isOpen && editTrxModal.data && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                  <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800/80">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Edit Transaksi</h3>

                      {/* Pastikan tombol X juga tidak membuat data menjadi null */}
                      <button onClick={() => setEditTrxModal(prev => ({ ...prev, isOpen: false }))} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800/50 rounded-full transition-colors"><X size={16} /></button>
                    </div>
                    <form onSubmit={handleSaveTrxEdit} className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nominal (Rp)</label>
                        <input type="number" required value={editTrxModal.data.amount} onChange={(e) => setEditTrxModal({ ...editTrxModal, data: { ...editTrxModal.data, amount: e.target.value } })} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Catatan</label>
                        <input
                          type="text"
                          required
                          value={editTrxModal.data.note}
                          onChange={(e) => {
                            const val = e.target.value;
                            // 1. Update nilai catatannya
                            setEditTrxModal({ ...editTrxModal, data: { ...editTrxModal.data, note: val } });

                            // 2. Panggil AI untuk cek kategori (tanpa mengganggu ketikan user)
                            autoClassifyCategory(val);
                          }}
                          className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Kategori</label>
                        <input list="category-list" type="text" required value={editTrxModal.data.category} onChange={(e) => setEditTrxModal({ ...editTrxModal, data: { ...editTrxModal.data, category: e.target.value } })} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl py-3 px-4 text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold" />
                        <datalist id="category-list">{existingCategories.map(cat => <option key={cat} value={cat} />)}</datalist>
                      </div>
                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-500/30 mt-2">Simpan Perubahan</button>
                    </form>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* MODAL: TAMBAH DOMPET BARU */}
            {/* MODAL: TAMBAH DOMPET BARU */}
            <AnimatePresence>
              {newWalletModal.isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800/80 relative"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-widest">Buat Rekening Baru</h3>
                      <button onClick={() => setNewWalletModal({ isOpen: false, name: '' })} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800/50 rounded-full transition-colors">
                        <X size={18} />
                      </button>
                    </div>

                    <form onSubmit={handleCreateWallet} className="space-y-5">
                      <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Nama Rekening</label>
                        <input
                          type="text"
                          required
                          autoFocus
                          value={newWalletModal.name}
                          onChange={(e) => setNewWalletModal({ ...newWalletModal, name: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-4 px-5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold transition-all"
                          placeholder="Contoh: BCA Pribadi"
                        />
                      </div>
                      <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-black text-sm uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-green-500/30 mt-2">
                        Buka Rekening
                      </button>
                    </form>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* MODAL: EDIT DOMPET & SHARE DOMPET */}
            <AnimatePresence>
              {isEditWalletOpen && <EditWalletModal wallet={walletToEdit} onClose={() => setIsEditWalletOpen(false)} onRefresh={() => window.location.reload()} />}
            </AnimatePresence>

            <AnimatePresence>
              {isShareWalletOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                  <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-md bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl relative overflow-hidden border border-gray-100 dark:border-gray-800">
                    <button onClick={() => setIsShareWalletOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors"><X size={16} /></button>
                    <ShareWallet walletId={walletToShare?.id} />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* BOTTOM NAVIGATION BAR */}
            <nav className="fixed bottom-0 left-0 right-0 z-[9999] bg-white/80 dark:bg-[#0a0f1c]/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 pb-safe">
              <div className="w-full max-w-lg mx-auto flex justify-between items-center px-4 py-4">
                {[
                  { id: 'home', label: 'HOME', Icon: HomeIcon },
                  { id: 'analytics', label: 'STATS', Icon: PieChartIcon },
                  { id: 'wallets', label: 'WALLETS', Icon: CreditCard },
                  { id: 'settings', label: 'SET', Icon: Settings }
                ].map((menu) => {
                  const isActive = activeTab === menu.id;
                  return (
                    <motion.button key={menu.id} onClick={() => setActiveTab(menu.id)} whileTap={{ scale: 0.85 }} animate={{ scale: isActive ? 1.15 : 1, y: isActive ? -6 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="flex flex-col items-center gap-1.5 relative w-12" style={{ WebkitTapHighlightColor: 'transparent' }}>
                      {isActive && <motion.div layoutId="navGlow" className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-blue-500/20 blur-md rounded-full -z-10" />}
                      <menu.Icon size={22} className={`transition-colors duration-300 ${isActive ? "text-blue-500 fill-blue-500/20" : "text-gray-400 dark:text-gray-600 fill-transparent"}`} />
                      <span className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${isActive ? 'text-blue-500' : 'text-gray-400 dark:text-gray-600'}`}>{menu.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </nav>

            {/* MODAL MASTER: KONFIRMASI HAPUS (DANGER ZONE) */}
            <AnimatePresence>
              {isDeleteModalOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-red-100 dark:border-red-900/30 relative text-center"
                  >
                    {/* Ikon Peringatan Mewah */}
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trash2 className="text-red-500" size={28} />
                    </div>

                    <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-widest mb-2">Hapus Data?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 px-2">
                      Tindakan ini permanen dan tidak dapat dibatalkan. Apakah Anda yakin?
                    </p>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsDeleteModalOpen(false)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition-all"
                      >
                        Batal
                      </button>
                      <button
                        onClick={
                          <button
                            onClick={() => {
                              if (itemToDelete) {
                                deleteTransaction(itemToDelete.id, itemToDelete.amount);
                                setIsDeleteModalOpen(false);
                                setItemToDelete(null);
                              }
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-red-500/30"
                          >
                            Hapus
                          </button>
                        } // Ganti dengan fungsi hapus Anda
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-red-500/30"
                      >
                        Hapus
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* MODAL KONFIRMASI HAPUS TARGET IMPIAN (CELENGAN) */}
            <AnimatePresence>
              {goalDeleteModal.isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="w-full max-w-sm bg-white dark:bg-[#121827] rounded-[32px] p-6 shadow-2xl border border-gray-100 dark:border-gray-800 text-center"
                  >
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                      <Trash2 size={32} />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Hapus Impian Anda?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                      Target <span className="font-bold text-gray-900 dark:text-white">"{goalDeleteModal.goalName}"</span> beserta seluruh progres tabungannya akan dihapus permanen. Lanjutkan?
                    </p>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setGoalDeleteModal({ isOpen: false, goalId: null, goalName: '' })}
                        className="flex-1 py-3.5 rounded-2xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                      >
                        Batal
                      </button>
                      <button
                        onClick={executeDeleteGoal}
                        className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/30 transition-all"
                      >
                        Hapus Impian
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Konten navigasi bawah atau elemen dashboard terakhir Anda */}

          </main>
        )}
      </div>
    );
  }