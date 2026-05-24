"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, X, TerminalSquare } from "lucide-react";

export default function QuickCommandBar({ onProcessTransaction }) {
  const [isActive, setIsActive] = useState(false);
  const [inputText, setInputText] = useState("");

  // ==========================================
  // 🧠 CORE AI LOGIC: TEXT PARSER
  // ==========================================
  const parseNLP = (text) => {
    let amount = 0;
    
    // 1. Deteksi Tipe (in/out) - TAMBAHAN BARU
    let type = "expense"; // Default
    if (text.toLowerCase().startsWith("in ")) type = "income";
    if (text.toLowerCase().startsWith("out ")) type = "expense";
    
    // Hapus tag 'in ' atau 'out ' untuk proses selanjutnya
    const cleanText = text.replace(/^(in|out)\s+/i, "");

    // 2. Regex untuk Nominal
    const amountRegex = /(\d+[\d\.,]*)\s*(ribu|rb|juta|jt|k|m)?/i;
    const match = cleanText.match(amountRegex);

    if (match) {
      let rawNumber = parseFloat(match[1].replace(/[^\d]/g, ""));
      let multiplier = match[2] ? match[2].toLowerCase() : "";

      if (multiplier === "ribu" || multiplier === "rb" || multiplier === "k") rawNumber *= 1000;
      if (multiplier === "juta" || multiplier === "jt" || multiplier === "m") rawNumber *= 1000000;
      amount = rawNumber;
    }

    // 3. LOGIKA PEMBERSIH JUDUL
    let cleanNote = cleanText.replace(amountRegex, "").trim();
    const note = cleanNote.charAt(0).toUpperCase() + cleanNote.slice(1);

    // 4. Kategorisasi
    const lowerText = cleanText.toLowerCase();
    let category = "Sembarang";

    const categoryDictionary = {
      "Makan": ["kopi", "makan", "minum", "roti", "soto", "warteg", "nasi", "cafe", "gojek", "grabfood"],
      "Belanja": ["belanja", "beli", "baju", "sepatu", "indomaret", "alfamart", "supermarket"],
      "Tagihan": ["listrik", "air", "internet", "wifi", "bpjs", "kuota", "pulsa"],
      "Pendidikan": ["kursus", "kelas", "buku", "ebook", "webinar", "tutorial", "aset edukasi"],
      "Marketing": ["iklan", "ads", "meta", "domain", "hosting", "scalev", "kampanye", "campaign"]
    };

    for (const [cat, keywords] of Object.entries(categoryDictionary)) {
      if (keywords.some(kw => lowerText.includes(kw))) {
        category = cat;
        break;
      }
    }

    return { amount, category, note, type }; // Mengembalikan type baru
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Masukkan kalimat ke dalam "Otak AI"
    const { amount, category, note, type } = parseNLP(inputText);

    if (amount === 0) {
      alert("⚠️ ArtaKita: Maaf, saya tidak mendeteksi jumlah nominal transaksinya.");
      return;
    }

    // Eksekusi transaksi ke database dengan tipe yang terdeteksi
    onProcessTransaction(note, amount, category, type);
    
    setInputText("");
    setIsActive(false);
  };

  return (
    <>
      {/* Latar Belakang Gelap saat Aktif */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setIsActive(false)}
          />
        )}
      </AnimatePresence>

      {/* Kotak Melayang (FAB) / Command Bar */}
      <motion.form 
        layout 
        onSubmit={handleSubmit}
        transition={{ type: "spring", stiffness: 300, damping: 26 }} 
        className={`fixed z-50 flex items-center bg-blue-600 text-white shadow-2xl shadow-blue-600/40 overflow-hidden ${
          isActive ? 'bottom-28 left-6 right-6 h-16 rounded-2xl px-2' : 'bottom-28 right-6 w-14 h-14 rounded-full cursor-pointer justify-center'
        }`} 
        onClick={() => !isActive && setIsActive(true)}
      >
        {!isActive ? (
          <TerminalSquare size={24} className="text-white" />
        ) : (
          <>
            <button type="button" onClick={(e) => { e.stopPropagation(); setIsActive(false); }} className="p-3 text-white/70 hover:text-white transition-colors">
              <X size={20} />
            </button>
            <input 
              autoFocus
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Cth: in 5jt Gaji atau out 25k Kopi" 
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/50 text-sm px-2"
            />
            <button type="submit" className="p-3 text-white/70 hover:text-white hover:scale-110 transition-all active:scale-95">
              <Send size={20} />
            </button>
          </>
        )}
      </motion.form>
    </>
  );
}