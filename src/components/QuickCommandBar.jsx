"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Send } from 'lucide-react';

export default function QuickCommandBar({ onProcessTransaction }) {
    const [isActive, setIsActive] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [parsedPreview, setParsedPreview] = useState(null);

    // Mesin Parser NLP Utama ArtaKita
    const handleInput = (e) => {
        const text = e.target.value;
        setInputValue(text);

        if (text.length > 0) {
            let amount = 0; 
            let note = text; 
            let category = 'Umum';

            // 1. Deteksi Angka Nominal (Mendukung akhiran 'k' dan 'm')
            const amountMatch = text.match(/(\d+)(k|m)?/i);
            if (amountMatch) {
                let base = parseInt(amountMatch[1]);
                if (amountMatch[2]?.toLowerCase() === 'k') base *= 1000;
                if (amountMatch[2]?.toLowerCase() === 'm') base *= 1000000;
                amount = base;
                note = note.replace(amountMatch[0], '').trim();
            }

            // 2. Deteksi Kategori Menggunakan Tag Pagar (#)
            const catMatch = note.match(/#(\w+)/);
            if (catMatch) { 
                category = catMatch[1]; 
                note = note.replace(catMatch[0], '').trim(); 
            }

            // Atur huruf kapital di awal kategori agar rapi
            category = category.charAt(0).toUpperCase() + category.slice(1);

            setParsedPreview({ 
                amount, 
                note: note || 'Pengeluaran', 
                category 
            });
        } else {
            setParsedPreview(null);
        }
    };

    const submitData = (e) => {
        if (e) e.stopPropagation();
        
        // Jika input kosong atau nominal 0, cukup tutup bar tanpa memproses
        if (!parsedPreview || parsedPreview.amount === 0) {
            setIsActive(false);
            return;
        }

        // Kirim data ke fungsi utama di page.js
        onProcessTransaction(parsedPreview);

        // Reset semua state input ke kondisi awal
        setInputValue(""); 
        setParsedPreview(null); 
        setIsActive(false);
    };

    return (
        <>
            {/* Latar Belakang Blur saat Input Aktif */}
            <AnimatePresence>
                {isActive && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm z-40" 
                        onClick={() => setIsActive(false)} 
                    />
                )}
            </AnimatePresence>

            {/* Kotak Melayang (FAB) Dinamis */}
            <motion.div 
                layout 
                transition={{ type: "spring", stiffness: 300, damping: 26 }} 
                className={`fixed z-50 flex items-center bg-blue-600 text-white shadow-xl shadow-blue-600/30 overflow-hidden ${
                    isActive ? 'bottom-6 left-6 right-6 h-16 rounded-2xl' : 'bottom-6 right-6 w-14 h-14 rounded-full cursor-pointer'
                }`} 
                onClick={() => !isActive && setIsActive(true)}
            >
                {isActive ? (
                    <div className="flex-1 flex items-center px-4 w-full h-full relative" onClick={(e) => e.stopPropagation()}>
                        <input 
                            autoFocus 
                            type="text" 
                            value={inputValue} 
                            onChange={handleInput} 
                            onKeyDown={(e) => e.key === 'Enter' && submitData()} 
                            placeholder="Contoh: 50k makan siang #jajan" 
                            className="w-full bg-transparent outline-none text-white placeholder-blue-300 pr-10 text-base" 
                        />
                        <button onClick={submitData} className="absolute right-4 bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
                            <Send size={16} />
                        </button>
                        
                        {/* Balon Pratinjau Teks (Live Preview) */}
                        {parsedPreview && parsedPreview.amount > 0 && (
                            <motion.div 
                                initial={{ y: 10, opacity: 0 }} 
                                animate={{ y: 0, opacity: 1 }} 
                                className="absolute -top-12 left-0 bg-gray-900 text-white text-xs px-3 py-2 rounded-xl shadow-lg border border-gray-800 whitespace-nowrap"
                            >
                                Mencatat: <span className="font-bold text-red-400">Rp {parsedPreview.amount.toLocaleString('id-ID')}</span> untuk <span className="font-medium">{parsedPreview.note}</span>
                            </motion.div>
                        )}
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Plus size={24} />
                    </div>
                )}
            </motion.div>
        </>
    );
}