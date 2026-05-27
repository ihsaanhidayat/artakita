"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, X, TerminalSquare } from "lucide-react";
import { supabase } from "@/lib/supabaseClient"; // Pastikan import ini ada

export default function QuickCommandBar({ onProcessTransaction }) {
  const [isActive, setIsActive] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [category, setCategory] = useState("");
  
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
  const parseNLP = async (text) => {
    const cleanText = text.toLowerCase().trim();
    
    // 1. Deteksi Nominal Uang (Contoh: 5k -> 5000, 50k -> 50000, atau angka murni)
    let amount = 0;
    const kMatch = cleanText.match(/(\d+)\s*k/);
    if (kMatch) {
      amount = parseInt(kMatch[1]) * 1000;
    } else {
      const numMatch = cleanText.match(/\d+/);
      if (numMatch) amount = parseInt(numMatch[0]);
    }

    // Ekstrak kata kunci mentah (menghapus nominal uang dari teks)
    let phraseWithoutAmount = cleanText.replace(/[\d+]\s*k|[\d+]/g, '').trim();

    let categoryName = "Lain-lain"; // Default jika tidak ketemu
    
    // 2. DETEKSI COMANND "POS" (Proses Pembelajaran AI)
    if (phraseWithoutAmount.includes('pos ')) {
      const parts = phraseWithoutAmount.split('pos ');
      const itemText = parts[0].replace(/(beli|bayar|untuk)\s*/g, '').trim(); // Contoh: "kopi"
      const targetCategory = parts[1].trim(); // Contoh: "jajan"

      if (targetCategory && itemText) {
        categoryName = targetCategory;

        // JALAN PINTAS AI BELAJAR: Simpan ke database secara asinkronus (background)
        setTimeout(async () => {
          try {
            // A. Pastikan kategori utama ada di user_categories
            let { data: catData } = await supabase
              .from('user_categories')
              .select('id')
              .eq('name', categoryName)
              .single();

            if (!catData) {
              const { data: newCat } = await supabase
                .from('user_categories')
                .insert([{ name: categoryName }])
                .select('id')
                .single();
              catData = newCat;
            }

            // B. Masukkan kata benda ke ai_keywords agar AI ingat di masa depan
            if (catData) {
              await supabase
                .from('ai_keywords')
                .insert([{ category_id: catData.id, keyword: itemText }]);
              
              // Refresh memori AI lokal aplikasi
              fetchAiBrain();
            }
          } catch (err) {
            console.log("AI sudah hafal kata kunci ini.");
          }
        }, 500);

        phraseWithoutAmount = itemText; // Bersihkan frasa untuk catatan transaksi
      }
    } 
    // 3. DETEKSI OTOMATIS (Membaca hasil pembelajaran masa lalu)
    else {
      // Cari di memori lokal aiKeywords apakah ada keyword yang cocok dengan input user
      const coreWords = phraseWithoutAmount.replace(/(beli|bayar|untuk)\s*/g, '').trim().split(' ');
      
      // Cari kecocokan kata kunci
      const matchKey = aiKeywords.find(k => coreWords.includes(k.keyword));
      
      if (matchKey) {
        // Jika ketemu, cari nama kategorinya
        const matchCat = userCategories.find(c => c.id === matchKey.category_id);
        if (matchCat) {
          categoryName = matchCat.name;
        }
      }
    }

    // Bersihkan catatan akhir untuk nota transaksi (Capitalize huruf pertama)
    const finalNote = phraseWithoutAmount.charAt(0).toUpperCase() + phraseWithoutAmount.slice(1);

    return {
      amount,
      category: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
      note: finalNote
    };
  };

  const autoClassifyCategory = async (note) => {
  if (!note || note.length < 3) return;
  
  const { data: keywords } = await supabase.from('ai_keywords').select('keyword, category_id(name)');
  
  const noteLower = note.toLowerCase();
  const match = keywords?.find(k => noteLower.includes(k.keyword.toLowerCase()));
  
  if (match) {
    setCategory(match.category_id.name); // AI mengisi kategori otomatis
  } else {
    setCategory(""); // Reset jika tidak ketemu
  }
};

const extractAmount = (text) => {
  const match = text.match(/\d+/); // Mencari deretan angka
  return match ? parseInt(match[0]) : 0;
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

    // Saat memanggil fungsi submit/send
  onProcessTransaction({
      amount: extractAmount(inputText), 
      note: inputText,
      category: category
  });
    
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
              type="text"
              value={inputText}
              onChange={(e) => {
                const val = e.target.value;
                setInputText(val); // Update teks ketikan
                autoClassifyCategory(val); // Pemicu AI
              }}
              placeholder="Contoh: Beli pentol 10000"
              className="..." // class Anda sebelumnya
            />
            
            <button 
              type="button" 
              onClick={toggleListening} 
              className={`p-3 transition-all ${isListening ? 'text-red-300 animate-pulse scale-110' : 'text-white/70 hover:text-white'}`}
              title="Perintah Suara"
            >
              <Mic size={20} />
            </button>

            <button type="submit" disabled={isSmartLoading}>
            {isSmartLoading ? "Memproses..." : "Kirim"}
          </button>
          </>
        )}
      </motion.form>
    </>
  );
}