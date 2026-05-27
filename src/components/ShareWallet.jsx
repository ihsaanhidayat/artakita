"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ShareWallet({ walletId, onClose }) {
  const [users, setUsers] = useState([]);
  const [selectedUid, setSelectedUid] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Mengambil daftar user dari API saat modal dibuka
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Panggil alamat khusus yang baru saja kita buat
        const res = await fetch('/api/get-users'); 
        const data = await res.json();
        
        if (data.success) {
          setUsers(data.users);
        }
      } catch (err) {
        console.error("Gagal memuat daftar user", err);
      } finally {
        setIsFetching(false);
      }
    };
    fetchUsers();
  }, []);
  
  const handleShareWallet = async (e) => {
    e.preventDefault();
    if (!selectedUid) {
      alert("Pilih pengguna terlebih dahulu!");
      return;
    }
    setIsLoading(true);

    try {
      // ⚠️ GANTI 'wallet_members' DENGAN NAMA TABEL SHARE ANDA (JIKA BERBEDA)
      const { error } = await supabase
        .from('wallet_members') 
        .insert({
          wallet_id: walletId,
          user_id: selectedUid,
          role: 'member' // Atur role default
        });

      if (error) throw error;

      alert("Berhasil! Akses dompet telah dibagikan.");
      if (onClose) onClose(); // Tutup modal otomatis setelah berhasil
      
    } catch (err) {
      alert("Gagal membagikan dompet: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-widest">Bagikan Akses</h3>
        <p className="text-xs font-bold text-gray-500 mt-1">Kolaborasi pencatatan dompet</p>
      </div>

      {/* WARNING BOX MEWAH */}
      <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl flex items-start gap-3 mb-6">
        <div className="mt-0.5 text-orange-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div>
          <p className="text-[10px] font-black text-orange-600 dark:text-orange-500 uppercase tracking-widest mb-1">Peringatan Keamanan</p>
          <p className="text-xs font-bold text-gray-700 dark:text-gray-300 leading-relaxed">
            Pengguna yang Anda pilih akan memiliki hak akses penuh untuk <strong>melihat, menambah, dan mengedit</strong> transaksi di dalam dompet ini.
          </p>
        </div>
      </div>

      <form onSubmit={handleShareWallet} className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Pilih Rekan</label>
          
          {isFetching ? (
            <div className="w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-4 px-5 text-sm text-gray-400 font-bold animate-pulse">
              Memuat daftar kontak...
            </div>
          ) : (
            <div className="relative">
              <select 
                value={selectedUid} 
                onChange={(e) => setSelectedUid(e.target.value)} 
                required
                className="appearance-none w-full bg-gray-50 dark:bg-[#0a0f1c] border border-gray-200 dark:border-gray-800 rounded-2xl py-4 pl-5 pr-10 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 font-bold transition-all cursor-pointer"
              >
                <option value="" disabled>-- Pilih Pengguna Terdaftar --</option>
                {users.map(user => (
                  <option key={user.uid} value={user.uid} className="bg-white dark:bg-[#121827]">
                    @{user.username}
                  </option>
                ))}
              </select>
              {/* Ikon Dropdown Custom */}
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={isLoading || isFetching || !selectedUid}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-400 dark:disabled:bg-gray-800 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/30 mt-2"
        >
          {isLoading ? 'Memproses Akses...' : 'Bagikan Akses Sekarang'}
        </button>
      </form>
    </div>
  );
}