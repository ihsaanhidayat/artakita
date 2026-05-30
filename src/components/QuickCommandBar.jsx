"use client";
import { useState, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, TerminalSquare, Mic, Camera } from "lucide-react";

/**
 * QuickCommandBar
 * ───────────────
 * Komponen input cepat untuk mencatat transaksi.
 * Semua logic parsing ada di handleSmartSubmit (page.js).
 * Komponen ini hanya UI — tidak ada query Supabase di sini.
 *
 * Format:
 *   50k makan siang        → expense
 *   in 5jt gaji            → income
 *   200k belanja pos Makan → expense + buat/belajar kategori
 */
const QuickCommandBar = memo(function QuickCommandBar({
  onProcessTransaction,
  isSmartLoading = false,
}) {
  const [isActive,    setIsActive]    = useState(false);
  const [inputText,   setInputText]   = useState("");
  const [isListening, setIsListening] = useState(false);
  const [photoFile,   setPhotoFile]   = useState(null);
  const recognitionRef = useRef(null);
  const fileInputRef   = useRef(null);

  const close = useCallback(() => {
    if (isListening && recognitionRef.current) recognitionRef.current.stop();
    setIsActive(false);
    setIsListening(false);
    setInputText("");
    setPhotoFile(null);
  }, [isListening]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || text === "Mendengarkan...") return;
    if (typeof onProcessTransaction !== "function") {
      console.error("onProcessTransaction is not a function");
      return;
    }
    // Kirim text + foto ke page.js untuk diproses
    onProcessTransaction(text, photoFile || null);
    setInputText("");
    setPhotoFile(null);
    setIsActive(false);
  }, [inputText, photoFile, onProcessTransaction]);

  // ── Speech recognition ────────────────────────────────────────────────────
  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setInputText("");
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.warn("Browser tidak mendukung perintah suara."); return;
      return;
    }

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "id-ID";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart  = () => { setIsListening(true);  setInputText("Mendengarkan..."); };
    rec.onresult = (e) => { setIsListening(false); setInputText(e.results[0][0].transcript); };
    rec.onerror  = (e) => {
      setIsListening(false);
      setInputText("");
      // Mikrofon tidak diizinkan — user perlu allow di browser settings
    };
    rec.onend = () => setIsListening(false);
    rec.start();
  }, [isListening]);

  // ── Photo attach ──────────────────────────────────────────────────────────
  const handlePhotoSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) setPhotoFile(file);
  }, []);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={close}
          />
        )}
      </AnimatePresence>

      {/* Bar */}
      <motion.form
        layout
        onSubmit={handleSubmit}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className={`fixed z-50 flex items-center bg-blue-600 shadow-2xl shadow-blue-600/40 overflow-hidden transition-all ${
          isActive
            ? "bottom-[82px] left-4 right-4 max-w-[calc(512px-2rem)] mx-auto h-14 rounded-2xl px-2"
            : "bottom-[82px] right-4 w-14 h-14 rounded-full cursor-pointer justify-center"
        }`}
      >
        {!isActive ? (
          <button
            type="button"
            onClick={() => setIsActive(true)}
            className="w-full h-full flex items-center justify-center"
          >
            <TerminalSquare size={22} className="text-white" />
          </button>
        ) : (
          <>
            {/* Close */}
            <button
              type="button"
              onClick={close}
              className="p-2.5 text-white/60 hover:text-white transition-colors shrink-0"
            >
              <X size={18} />
            </button>

            {/* Input */}
            <input
              autoFocus
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
              placeholder="50k makan  |  in 5jt gaji"
              className="flex-1 bg-transparent outline-none text-sm font-bold text-white placeholder-white/40 px-1 h-full min-w-0"
            />

            {/* Photo indicator */}
            {photoFile && (
              <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg shrink-0">
                <span className="text-[9px] font-black text-white truncate max-w-[60px]">
                  {photoFile.name.slice(0, 8)}...
                </span>
                <button
                  type="button"
                  onClick={() => setPhotoFile(null)}
                  className="text-white/70 hover:text-white"
                >
                  <X size={10} />
                </button>
              </div>
            )}

            {/* Photo attach */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2.5 shrink-0 transition-colors ${photoFile ? "text-yellow-300" : "text-white/60 hover:text-white"}`}
            >
              <Camera size={18} />
            </button>

            {/* Voice */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 shrink-0 transition-all ${
                isListening ? "text-red-300 animate-pulse scale-110" : "text-white/60 hover:text-white"
              }`}
            >
              <Mic size={18} />
            </button>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSmartLoading || !inputText.trim()}
              className="p-2.5 text-white/60 hover:text-white disabled:opacity-30 transition-colors shrink-0"
            >
              {isSmartLoading
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Send size={18} />
              }
            </button>
          </>
        )}
      </motion.form>
    </>
  );
});

export default QuickCommandBar;
