"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, X, TerminalSquare } from "lucide-react";

export default function QuickCommandBar({ onProcessTransaction }) {
  const [isActive, setIsActive] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  
  // Ref untuk menyimpan instance mikrofon agar bisa dihentikan kapan saja
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
  // ⚙️ CORE AI LOGIC: TEXT PARSER
  // ==========================================
  const parseNLP = (text) => {
    let amount = 0;
    let type = "expense"; 
    let category = "Sembarang";
    let shouldLearn = false; 

    if (text.toLowerCase().startsWith("in ") || text.toLowerCase().includes("masuk")) type = "income";
    if (text.toLowerCase().startsWith("out ") || text.toLowerCase().includes("keluar")) type = "expense";
    
    let cleanText = text.replace(/^(in|out|masuk|keluar)\s+/i, "");

    const posRegex = /pos\s+([a-zA-Z0-9]+)/i;
    const posMatch = cleanText.match(posRegex);
    
    if (posMatch) {
      category = posMatch[1].charAt(0).toUpperCase() + posMatch[1].slice(1).toLowerCase();
      cleanText = cleanText.replace(posMatch[0], "").trim();
      shouldLearn = true; 
    }

    const amountRegex = /(\d+[\d\.,]*)\s*(ribu|rb|juta|jt|k|m)?/i;
    const match = cleanText.match(amountRegex);

    if (match) {
      let rawNumber = parseFloat(match[1].replace(/[^\d]/g, ""));
      let multiplier = match[2] ? match[2].toLowerCase() : "";

      if (multiplier === "ribu" || multiplier === "rb" || multiplier === "k") rawNumber *= 1000;
      if (multiplier === "juta" || multiplier === "jt" || multiplier === "m") rawNumber *= 1000000;
      amount = rawNumber;
    }

    let cleanNote = cleanText.replace(amountRegex, "").trim();
    const note = cleanNote.charAt(0).toUpperCase() + cleanNote.slice(1);

    if (!posMatch) {
      const lowerText = cleanText.toLowerCase();
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
    // Jika sedang merekam, matikan mic-nya
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
    recognitionRef.current = recognition; // Simpan ke ref
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
      processDirectText(transcript); 
    };

    recognition.onerror = (event) => {
      // Abaikan error "aborted" (karena user membatalkan) dan "no-speech" (karena hening)
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
            onClick={() => setIsActive(false)}
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
              if (isListening && recognitionRef.current) recognitionRef.current.stop(); // Hentikan mic jika modal ditutup
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