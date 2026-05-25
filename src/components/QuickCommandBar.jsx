"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, X, TerminalSquare } from "lucide-react";

export default function QuickCommandBar({ onProcessTransaction }) {
  const [isActive, setIsActive] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  
  const recognitionRef = useRef(null); 

  // ==========================================
  // 🧠 BANK DATA AI (STATE & LOCAL STORAGE)
  // ==========================================
  const [aiDictionary, setAiDictionary] = useState({
    "Makan": ["kopi", "makan", "minum", "roti", "soto", "warteg", "nasi", "cafe", "gojek", "grabfood"],
    "Belanja": ["belanja", "beli", "baju", "sepatu", "indomaret", "alfamart", "supermarket"],
    "Tagihan": ["listrik", "air", "internet", "wifi", "bpjs", "kuota", "pulsa"],
    "Pendidikan": ["kursus", "kelas", "buku", "ebook", "webinar", "tutorial", "aset edukasi"],
    "Marketing": ["iklan", "ads", "meta", "domain", "hosting", "scalev", "kampanye", "campaign"]
  });

  useEffect(() => {
    const savedDict = localStorage.getItem('artaKita_ai_dict');
    if (savedDict) {
      setAiDictionary(JSON.parse(savedDict));
    }
  }, []);

  const learnNewKeyword = (category, phrase) => {
    const keyword = phrase.toLowerCase().replace(/^(beli|bayar|buat|untuk)\s+/i, "").trim();
    if (!keyword) return;

    setAiDictionary(prev => {
      const newDict = { ...prev };
      if (!newDict[category]) newDict[category] = [];
      
      if (!newDict[category].includes(keyword)) {
        newDict[category] = [...newDict[category], keyword];
        localStorage.setItem('artaKita_ai_dict', JSON.stringify(newDict));
        console.log(`🧠 AI Belajar Kosakata Baru: '${keyword}' -> '${category}'`);
      }
      return newDict;
    });
  };

  // ==========================================
  // ⚙️ CORE AI LOGIC: TEXT PARSER V3 (SUPER SMART)
  // ==========================================
  const parseNLP = (text) => {
    let amount = 0;
    let type = "expense"; 
    let category = "Lainnya";
    let shouldLearn = false; 

    // Cek apakah ini uang masuk
    if (/^(in\s|masuk\s)/i.test(text)) type = "income";
    
    // Bersihkan command awal (in/out)
    let cleanText = text.replace(/^(in|out|masuk|keluar)\s+/i, "");

    // 1. PISAHKAN KATEGORI DENGAN "POS" UTUH
    const posSplit = cleanText.toLowerCase().split(/\s+pos\s+/);
    if (posSplit.length > 1) {
      const rawCategory = posSplit.pop(); 
      category = rawCategory.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      cleanText = posSplit.join(' pos ');
      shouldLearn = true; 
    }

    // 2. EKSTRAK NOMINAL AI: Cari angka yang paling besar!
    // Membaca: 100 ribu, 500 rb, 1.5 jt, 50k
    const amountRegex = /(?:rp\s*)?([\d\.,]+)\s*(ribu|rb|juta|jt|k|m)?(?:\b|\s|$)/gi;
    const matches = [...cleanText.matchAll(amountRegex)];

    if (matches.length > 0) {
      let maxVal = 0;
      let bestMatch = null;

      for (const match of matches) {
        let numStr = match[1].replace(/\./g, "").replace(/,/g, ".");
        let val = parseFloat(numStr);
        let mult = match[2] ? match[2].toLowerCase() : "";

        if (["ribu", "rb", "k"].includes(mult)) val *= 1000;
        if (["juta", "jt", "m"].includes(mult)) val *= 1000000;

        // Pilih angka paling besar sebagai nominal (mengabaikan angka quantity seperti "2 kopi")
        if (val > maxVal) {
          maxVal = val;
          bestMatch = match;
        }
      }

      if (bestMatch) {
        amount = maxVal;
        // Hapus persis teks nominal tersebut dari catatan
        cleanText = cleanText.replace(bestMatch[0], "").trim();
      }
    }

    // 3. RAPIKAN CATATAN
    let note = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
    note = note.replace(/\s+/g, ' ').trim(); 

    // 4. FALLBACK DICTIONARY JIKA TIDAK PAKAI "POS"
    if (!shouldLearn) {
      const lowerText = note.toLowerCase();
      for (const [cat, keywords] of Object.entries(aiDictionary)) {
        if (keywords.some(kw => lowerText.includes(kw))) {
          category = cat;
          break;
        }
      }
    }

    return { amount, category, note, type, shouldLearn };
  };

  // ==========================================
  // ⚡ EKSEKUTOR UTAMA
  // ==========================================
  const processDirectText = (text) => {
    if (!text.trim() || text === "Mendengarkan...") return;

    const { amount, category, note, type, shouldLearn } = parseNLP(text);

    if (amount === 0) {
      alert("⚠️ ArtaKita: Maaf, saya tidak mendeteksi jumlah nominal transaksinya.");
      return;
    }

    if (shouldLearn) {
      learnNewKeyword(category, note);
    }

    onProcessTransaction(note, amount, category, type);
    
    setInputText("");
    setIsActive(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    processDirectText(inputText); 
  };

  // ==========================================
  // 🎙️ FITUR SUARA (SPEECH RECOGNITION)
  // ==========================================
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setInputText("");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Maaf, browser Anda belum mendukung fitur perintah suara.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition; 
    recognition.lang = 'id-ID';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInputText("Mendengarkan...");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      
      // REVISI DI SINI: Teks hasil suara dimasukkan ke kolom input saja,
      // memberikan kesempatan user untuk membaca, mengedit, atau langsung klik enter/kirim.
      setInputText(transcript); 
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') {
        setIsListening(false);
        setInputText("");
        return;
      }
      
      console.error("Error suara:", event.error);
      setIsListening(false);
      setInputText("");
      if (event.error === 'not-allowed') {
        alert("Mohon izinkan akses mikrofon di pengaturan browser Anda.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <>
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => {
              if (isListening && recognitionRef.current) recognitionRef.current.stop();
              setIsActive(false);
              setIsListening(false);
            }}
          />
        )}
      </AnimatePresence>

      <motion.form 
        layout 
        onSubmit={handleSubmit}
        transition={{ type: "spring", stiffness: 300, damping: 26 }} 
        className={`fixed z-50 flex items-center bg-blue-600 text-white shadow-2xl shadow-blue-600/40 overflow-hidden ${
          isActive ? 'bottom-28 left-6 right-6 h-16 rounded-2xl px-2' : 'bottom-28 right-6 w-14 h-14 rounded-full cursor-pointer justify-center'
        }`} 
      >
        {!isActive ? (
          <button type="button" onClick={() => setIsActive(true)} className="w-full h-full flex items-center justify-center">
             <TerminalSquare size={24} className="text-white" />
          </button>
        ) : (
          <>
            <button type="button" onClick={(e) => { 
              e.stopPropagation(); 
              if (isListening && recognitionRef.current) recognitionRef.current.stop(); 
              setIsActive(false); 
              setIsListening(false);
            }} className="p-3 text-white/70 hover:text-white transition-colors">
              <X size={20} />
            </button>
            
            <input 
              autoFocus
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Cth: out 50k Kopi atau pakai suara..." 
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/50 text-sm px-2"
            />
            
            <button 
              type="button" 
              onClick={toggleListening} 
              className={`p-3 transition-all ${isListening ? 'text-red-300 animate-pulse scale-110' : 'text-white/70 hover:text-white'}`}
              title="Perintah Suara"
            >
              <Mic size={20} />
            </button>

            <button type="submit" className="p-3 text-white/70 hover:text-white hover:scale-110 transition-all active:scale-95">
              <Send size={20} />
            </button>
          </>
        )}
      </motion.form>
    </>
  );
}