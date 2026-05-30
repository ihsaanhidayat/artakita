"use client";
import { useState, useRef, useCallback, memo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, TerminalSquare, Mic, Camera, Calendar, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { parseFlexibleNumber } from "@/lib/utils";

// ── Konstanta ─────────────────────────────────────────────────────────────────
const TODAY = () => new Date().toISOString().slice(0, 10);

// ── Preview parser — baca command dan tampilkan preview ───────────────────────
const parsePreview = (text) => {
  if (!text || text.length < 2) return null;
  const clean = text.toLowerCase().trim();
  let type     = "expense";
  let rest     = clean;

  if (clean.startsWith("in "))  { type = "income";  rest = clean.slice(3).trim(); }
  else if (clean.startsWith("out ")) { rest = clean.slice(4).trim(); }

  // Hapus bagian "pos Kategori" dari preview
  let category = null;
  if (rest.includes(" pos ")) {
    const parts = rest.split(" pos ");
    rest     = parts[0].trim();
    category = parts[1]?.trim();
    category = category ? category.charAt(0).toUpperCase() + category.slice(1) : null;
  }

  const match = rest.match(/^([\d.,]+(?:k|rb|ribu|m|jt|juta)?)\s*(.*)$/i);
  if (!match) return null;

  const amount = parseFlexibleNumber(match[1]);
  const note   = match[2]?.trim() || "";
  if (!amount || amount <= 0) return null;

  return { type, amount, note: note.charAt(0).toUpperCase() + note.slice(1) || "-", category };
};

// ── Format Rupiah ringkas ─────────────────────────────────────────────────────
const fmtRp = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}jt`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
};

// ── Date label ────────────────────────────────────────────────────────────────
const dateLabel = (d) => {
  if (!d || d === TODAY()) return "Hari ini";
  const diff = Math.round((new Date(TODAY()) - new Date(d)) / 86400000);
  if (diff === 1) return "Kemarin";
  if (diff > 1)  return new Date(d).toLocaleDateString("id-ID", { day:"numeric", month:"short" });
  return d;
};

// ── Main ──────────────────────────────────────────────────────────────────────
const QuickCommandBar = memo(function QuickCommandBar({
  onProcessTransaction,
  isSmartLoading = false,
}) {
  const [isOpen,      setIsOpen]      = useState(false);
  const [inputText,   setInputText]   = useState("");
  const [isListening, setIsListening] = useState(false);
  const [photoFile,   setPhotoFile]   = useState(null);
  const [selDate,     setSelDate]     = useState(TODAY());
  const [showCal,     setShowCal]     = useState(false);
  const recognitionRef = useRef(null);
  const fileInputRef   = useRef(null);
  const inputRef       = useRef(null);

  const preview = parsePreview(inputText);

  // Focus input saat terbuka
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [isOpen]);

  // Reset saat tutup
  const close = useCallback(() => {
    recognitionRef.current?.stop();
    setIsOpen(false);
    setIsListening(false);
    setInputText("");
    setPhotoFile(null);
    setSelDate(TODAY());
    setShowCal(false);
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || isSmartLoading) return;
    if (typeof onProcessTransaction !== "function") return;
    // Kirim text + foto + tanggal custom
    const dateToSend = selDate !== TODAY() ? selDate : null;
    onProcessTransaction(text, photoFile || null, dateToSend);
    setInputText("");
    setPhotoFile(null);
    setSelDate(TODAY());
    setShowCal(false);
    setIsOpen(false);
  }, [inputText, photoFile, selDate, isSmartLoading, onProcessTransaction]);

  // ── Voice ─────────────────────────────────────────────────────────────────
  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec  = new SR();
    recognitionRef.current = rec;
    rec.lang           = "id-ID";
    rec.interimResults = false;
    rec.onstart  = () => { setIsListening(true); setInputText("Mendengarkan..."); };
    rec.onresult = (e) => { setIsListening(false); setInputText(e.results[0][0].transcript); };
    rec.onerror  = () => { setIsListening(false); setInputText(""); };
    rec.onend    = ()  => setIsListening(false);
    rec.start();
  }, [isListening]);

  // ── Photo ─────────────────────────────────────────────────────────────────
  const handlePhoto = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) setPhotoFile(file);
  }, []);

  return (
    <>
      {/* ── Backdrop ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={close}
          />
        )}
      </AnimatePresence>

      {/* ── Container fixed bottom ── */}
      <div className="fixed bottom-[82px] right-4 z-50" style={{ maxWidth: "calc(512px - 2rem)" }}>

        <AnimatePresence mode="wait" initial={false}>

          {/* ── CLOSED — FAB button ── */}
          {!isOpen && (
            <motion.button
              key="fab"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              exit={{ scale: 0.8,   opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 bg-blue-600 hover:bg-blue-500 active:scale-90 rounded-full shadow-2xl shadow-blue-600/40 flex items-center justify-center transition-colors"
            >
              <TerminalSquare size={22} className="text-white" />
            </motion.button>
          )}

          {/* ── OPEN — expanded panel ── */}
          {isOpen && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{ opacity: 0,  y: 12, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="w-[calc(100vw-2rem)] max-w-[480px] bg-[#1a1f2e] border border-white/10 rounded-3xl shadow-2xl shadow-black/40 overflow-hidden"
              style={{ right: 0, position: "absolute", bottom: 0 }}
            >
              {/* Preview bar */}
              <AnimatePresence>
                {preview && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                      {preview.type === "income"
                        ? <ArrowDownCircle size={13} className="text-green-400 shrink-0" />
                        : <ArrowUpCircle  size={13} className="text-red-400 shrink-0" />
                      }
                      <span className={`font-black text-sm ${preview.type === "income" ? "text-green-400" : "text-red-400"}`}>
                        Rp {fmtRp(preview.amount)}
                      </span>
                      {preview.note && (
                        <span className="text-white/60 text-xs truncate">{preview.note}</span>
                      )}
                      {preview.category && (
                        <span className="text-[9px] font-black text-blue-400 bg-blue-500/15 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                          {preview.category}
                        </span>
                      )}
                      {selDate !== TODAY() && (
                        <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0 ml-auto">
                          {dateLabel(selDate)}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Date picker row */}
              <AnimatePresence>
                {showCal && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-2 pt-2 flex items-center gap-3">
                      <label className="text-[9px] font-black text-white/40 uppercase tracking-widest shrink-0">
                        Tanggal
                      </label>
                      <input
                        type="date"
                        value={selDate}
                        max={TODAY()}
                        onChange={e => setSelDate(e.target.value || TODAY())}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500 transition-colors"
                      />
                      {selDate !== TODAY() && (
                        <button
                          type="button"
                          onClick={() => setSelDate(TODAY())}
                          className="text-[9px] font-black text-white/40 hover:text-white uppercase tracking-widest transition-colors"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input row */}
              <form onSubmit={handleSubmit} className="flex items-center gap-1 px-3 py-3">
                {/* Close */}
                <button
                  type="button"
                  onClick={close}
                  className="p-2 text-white/30 hover:text-white/70 transition-colors shrink-0 rounded-xl hover:bg-white/5"
                >
                  <X size={18} />
                </button>

                {/* Text input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
                  placeholder="50k makan  |  in 5jt gaji"
                  className="flex-1 bg-transparent outline-none text-sm font-bold text-white placeholder-white/25 h-10 min-w-0"
                />

                {/* Photo badge */}
                {photoFile && (
                  <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg shrink-0">
                    <span className="text-[9px] font-bold text-white/60 max-w-[48px] truncate">
                      {photoFile.name.slice(0, 8)}
                    </span>
                    <button type="button" onClick={() => setPhotoFile(null)} className="text-white/40 hover:text-red-400 transition-colors">
                      <X size={10} />
                    </button>
                  </div>
                )}

                {/* Calendar toggle */}
                <button
                  type="button"
                  onClick={() => setShowCal(p => !p)}
                  className={`p-2 rounded-xl transition-all shrink-0 ${
                    selDate !== TODAY() || showCal
                      ? "text-amber-400 bg-amber-500/10"
                      : "text-white/30 hover:text-white/70 hover:bg-white/5"
                  }`}
                >
                  <Calendar size={17} />
                </button>

                {/* Photo */}
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 rounded-xl transition-all shrink-0 ${
                    photoFile ? "text-yellow-400 bg-yellow-500/10" : "text-white/30 hover:text-white/70 hover:bg-white/5"
                  }`}
                >
                  <Camera size={17} />
                </button>

                {/* Voice */}
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`p-2 rounded-xl transition-all shrink-0 ${
                    isListening ? "text-red-400 bg-red-500/10 animate-pulse" : "text-white/30 hover:text-white/70 hover:bg-white/5"
                  }`}
                >
                  <Mic size={17} />
                </button>

                {/* Send */}
                <button
                  type="submit"
                  disabled={isSmartLoading || !inputText.trim() || inputText === "Mendengarkan..."}
                  className={`p-2 rounded-xl transition-all shrink-0 ${
                    preview && !isSmartLoading
                      ? "text-blue-400 bg-blue-500/15 hover:bg-blue-500/25"
                      : "text-white/20"
                  } disabled:opacity-30`}
                >
                  {isSmartLoading
                    ? <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    : <Send size={17} />
                  }
                </button>
              </form>

              {/* Hint text */}
              <div className="px-4 pb-3">
                <p className="text-[9px] text-white/20 font-bold">
                  <span className="text-blue-400/60">in</span> untuk pemasukan · <span className="text-amber-400/60">pos Kategori</span> untuk buat kategori
                  {selDate !== TODAY() && (
                    <span className="text-amber-400/60"> · backdate: {dateLabel(selDate)}</span>
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
});

export default QuickCommandBar;
