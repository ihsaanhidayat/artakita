"use client";
import { useState, useRef, useCallback, memo, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, TerminalSquare, Mic, Calendar, ChevronDown } from "lucide-react";
import { parseFlexibleNumber } from "@/lib/utils";

const TODAY = () => new Date().toISOString().slice(0, 10);

const STOP_WORDS = new Set([
  "beli","bayar","untuk","ke","di","dari","dan","atau","dengan","yang",
  "nya","ini","itu","ada","aja","deh","dong","sih","lah","mau","udah"
]);

// ── Parse preview + AI classify ───────────────────────────────────────────────
const parsePreview = (text, aiKeywords, userCategories) => {
  if (!text || text.length < 2) return null;
  const clean = text.toLowerCase().trim();
  let type = "expense", rest = clean;

  if (clean.startsWith("in "))  { type = "income";  rest = clean.slice(3).trim(); }
  else if (clean.startsWith("out ")) { rest = clean.slice(4).trim(); }

  // pos override
  let manualCategory = null;
  if (rest.includes(" pos ")) {
    const parts    = rest.split(" pos ");
    rest           = parts[0].trim();
    manualCategory = parts[1]?.trim();
    manualCategory = manualCategory
      ? manualCategory.charAt(0).toUpperCase() + manualCategory.slice(1)
      : null;
  }

  const match = rest.match(/^([\d.,]+(?:k|rb|ribu|m|jt|juta)?)\s*(.*)$/i);
  if (!match) return null;
  const amount = parseFlexibleNumber(match[1]);
  if (!amount || amount <= 0) return null;

  const note  = match[2]?.trim() || "";
  const words = note.toLowerCase().replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));

  // AI classify
  let aiCategory   = null;
  let aiCandidates = []; // [{name, score}]

  if (!manualCategory && words.length > 0 && aiKeywords?.length) {
    const scoreMap = {};
    for (const word of words) {
      for (const kw of aiKeywords) {
        if (!kw.keyword) continue;
        const kwLow = kw.keyword.toLowerCase();
        if (word.includes(kwLow) || kwLow.includes(word)) {
          const cat = userCategories?.find(c => c.id === kw.category_id);
          if (cat) {
            scoreMap[cat.name] = (scoreMap[cat.name] || 0) + (word === kwLow ? 2 : 1);
          }
        }
      }
    }
    const sorted = Object.entries(scoreMap).sort((a,b) => b[1]-a[1]);
    aiCandidates = sorted.map(([name]) => name);
    if (aiCandidates.length > 0) aiCategory = aiCandidates[0];
  }

  return {
    type, amount,
    note: note.charAt(0).toUpperCase() + note.slice(1) || "-",
    category: manualCategory || aiCategory || "Lainnya",
    manualCategory,
    aiCandidates: manualCategory ? [] : aiCandidates,
    isManual: !!manualCategory,
  };
};

const fmtRp = (n) => {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(n%1_000_000===0?0:1)}jt`;
  if (n >= 1_000)     return `${(n/1_000).toFixed(0)}k`;
  return String(n);
};

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
  aiKeywords = [],
  userCategories = [],
}) {
  const [isOpen,       setIsOpen]       = useState(false);
  const [inputText,    setInputText]    = useState("");
  const [isListening,  setIsListening]  = useState(false);
  const [selDate,      setSelDate]      = useState(TODAY());
  const [showCal,      setShowCal]      = useState(false);
  const [selCategory,  setSelCategory]  = useState(null); // user pilih dari candidates
  const [showCandList, setShowCandList] = useState(false);
  const recognitionRef = useRef(null);
  const inputRef       = useRef(null);

  const preview = useMemo(() =>
    parsePreview(inputText, aiKeywords, userCategories),
    [inputText, aiKeywords, userCategories]
  );

  // Category yang dipakai: user pilih > manual pos > AI > Lainnya
  const activeCategory = selCategory
    || preview?.manualCategory
    || preview?.aiCategory
    || preview?.category
    || "Lainnya";

  // Reset selCategory saat input berubah
  useEffect(() => { setSelCategory(null); setShowCandList(false); }, [inputText]);

  // ── Keyboard trigger — cross platform ──────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    // iOS dan Android butuh user gesture untuk focus
    // requestAnimationFrame + multiple attempt
    let attempts = 0;
    const tryFocus = () => {
      if (!inputRef.current) return;
      inputRef.current.focus();
      // Trigger click untuk iOS Safari
      if (document.activeElement !== inputRef.current) {
        inputRef.current.click();
        inputRef.current.focus();
      }
      if (document.activeElement !== inputRef.current && attempts < 5) {
        attempts++;
        requestAnimationFrame(tryFocus);
      }
    };
    requestAnimationFrame(tryFocus);
  }, [isOpen]);

  const close = useCallback(() => {
    recognitionRef.current?.stop();
    setIsOpen(false);
    setIsListening(false);
    setInputText("");
    setSelDate(TODAY());
    setShowCal(false);
    setSelCategory(null);
  }, []);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || isSmartLoading) return;
    if (typeof onProcessTransaction !== "function") return;

    // Jika user sudah pilih kategori manual, inject ke command
    let finalText = text;
    if (selCategory && !text.toLowerCase().includes(" pos ")) {
      // Hapus pos lama jika ada, tambah yang baru
      const posIdx = text.toLowerCase().indexOf(" pos ");
      const baseText = posIdx !== -1 ? text.slice(0, posIdx) : text;
      finalText = `${baseText} pos ${selCategory}`;
    }

    const dateToSend = selDate !== TODAY() ? selDate : null;
    onProcessTransaction(finalText, null, dateToSend);
    setInputText("");
    setSelDate(TODAY());
    setShowCal(false);
    setSelCategory(null);
    setIsOpen(false);
  }, [inputText, selCategory, selDate, isSmartLoading, onProcessTransaction]);

  const toggleVoice = useCallback(() => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "id-ID"; rec.interimResults = false;
    rec.onstart  = () => { setIsListening(true); setInputText("Mendengarkan..."); };
    rec.onresult = (e) => { setIsListening(false); setInputText(e.results[0][0].transcript); };
    rec.onerror  = () => { setIsListening(false); setInputText(""); };
    rec.onend    = () => setIsListening(false);
    rec.start();
  }, [isListening]);

  // Candidates untuk dropdown kategori
  const candidates = preview?.aiCandidates || [];
  const shownCat   = selCategory || preview?.category || "Lainnya";
  const isExact    = !preview?.isManual && candidates.length === 1;
  const canClick   = !preview?.isManual && candidates.length > 1;

  return (
    <>
      {/* Backdrop — refocus bukan close */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onMouseDown={e => e.preventDefault()}
            onClick={() => { setShowCandList(false); setShowCal(false); inputRef.current?.focus(); }}
          />
        )}
      </AnimatePresence>

      {/* Container */}
      <div className="fixed bottom-[82px] right-4 z-50" style={{ maxWidth: "calc(512px - 2rem)" }}>
        <AnimatePresence mode="wait" initial={false}>

          {/* FAB */}
          {!isOpen && (
            <motion.button
              key="fab"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              exit={{ scale: 0.9,   opacity: 0 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 bg-blue-600 hover:bg-blue-500 active:scale-90 rounded-full shadow-2xl shadow-blue-600/40 flex items-center justify-center transition-colors"
            >
              <TerminalSquare size={22} className="text-white" />
            </motion.button>
          )}

          {/* Panel */}
          {isOpen && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{ opacity: 0,  y: 6,  scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="w-[calc(100vw-2rem)] max-w-[480px] bg-[#1a1f2e] border border-white/10 rounded-3xl shadow-2xl shadow-black/40 overflow-visible"
              style={{ right: 0, position: "absolute", bottom: 0 }}
            >

              {/* ── Preview bar ── */}
              <AnimatePresence>
                {preview && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="overflow-visible"
                  >
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1 flex-wrap">
                      {/* Tipe */}
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                        preview.type === "income"
                          ? "bg-green-500/15 text-green-400"
                          : "bg-red-500/15 text-red-400"
                      }`}>
                        {preview.type === "income" ? "Masuk" : "Keluar"}
                      </span>

                      {/* Nominal */}
                      <span className={`font-black text-sm ${
                        preview.type === "income" ? "text-green-400" : "text-red-400"
                      }`}>
                        Rp {fmtRp(preview.amount)}
                      </span>

                      {/* Note */}
                      {preview.note && preview.note !== "-" && (
                        <span className="text-white/50 text-xs truncate max-w-[120px]">
                          {preview.note}
                        </span>
                      )}

                      {/* Kategori badge — AI atau manual */}
                      <div className="relative ml-auto">
                        <button
                          type="button"
                          disabled={!canClick}
                          onClick={() => canClick && setShowCandList(p => !p)}
                          className={`flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest transition-all ${
                            preview.isManual || isExact
                              ? "bg-blue-500/20 text-blue-400 cursor-default"
                              : canClick
                              ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 active:scale-95"
                              : "bg-white/10 text-white/40 cursor-default"
                          }`}
                        >
                          {preview.isManual ? "📌" : candidates.length > 0 ? "🤖" : ""}
                          {shownCat}
                          {canClick && <ChevronDown size={9} />}
                        </button>

                        {/* Dropdown candidates */}
                        <AnimatePresence>
                          {showCandList && canClick && (
                            <>
                              <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[60]"
                                onClick={() => setShowCandList(false)}
                              />
                              <motion.div
                                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                                transition={{ duration: 0.12 }}
                                className="absolute bottom-full right-0 mb-1.5 bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl z-[61] overflow-hidden min-w-[140px]"
                              >
                                {candidates.map(cat => (
                                  <button
                                    key={cat}
                                    onClick={() => { setSelCategory(cat); setShowCandList(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center justify-between gap-3 ${
                                      shownCat === cat
                                        ? "text-blue-400 bg-blue-500/10"
                                        : "text-white/70 hover:bg-white/5"
                                    }`}
                                  >
                                    {cat}
                                    {shownCat === cat && <span className="text-blue-400 text-[10px]">✓</span>}
                                  </button>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Badge tanggal */}
                      {selDate !== TODAY() && (
                        <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                          {dateLabel(selDate)}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Date picker */}
              <AnimatePresence>
                {showCal && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-2 pt-2 flex items-center gap-3">
                      <label className="text-[9px] font-black text-white/40 uppercase tracking-widest shrink-0">Tanggal</label>
                      <input
                        type="date"
                        value={selDate}
                        max={TODAY()}
                        onChange={e => { setSelDate(e.target.value || TODAY()); inputRef.current?.focus(); }}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500 transition-colors"
                      />
                      {selDate !== TODAY() && (
                        <button type="button" onClick={() => { setSelDate(TODAY()); inputRef.current?.focus(); }}
                          className="text-[9px] font-black text-white/30 hover:text-white uppercase tracking-widest transition-colors shrink-0">
                          Reset
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input row */}
              <form onSubmit={handleSubmit} className="flex items-center gap-1 px-3 py-3">
                <button type="button" onClick={close}
                  className="p-2 text-white/30 hover:text-white/70 rounded-xl hover:bg-white/5 transition-colors shrink-0">
                  <X size={18} />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
                  placeholder="50k makan siang"
                  autoComplete="off"
                  autoCorrect="off"
                  className="flex-1 bg-transparent outline-none text-sm font-bold text-white placeholder-white/25 h-10 min-w-0"
                />

                <button type="button" onClick={() => { setShowCal(p => !p); inputRef.current?.focus(); }}
                  className={`p-2 rounded-xl transition-all shrink-0 ${
                    selDate !== TODAY() || showCal ? "text-amber-400 bg-amber-500/10" : "text-white/30 hover:text-white/70 hover:bg-white/5"
                  }`}>
                  <Calendar size={17} />
                </button>

                <button type="submit" disabled={isSmartLoading || !inputText.trim() || inputText === "Mendengarkan..."}
                  className={`p-2 rounded-xl transition-all shrink-0 ${
                    preview && !isSmartLoading ? "text-blue-400 bg-blue-500/15 hover:bg-blue-500/25" : "text-white/20"
                  } disabled:opacity-30`}>
                  {isSmartLoading
                    ? <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    : <Send size={17} />
                  }
                </button>
              </form>

              {/* Hint */}
              <div className="px-4 pb-3">
                <p className="text-[9px] text-white/20 font-bold">
                  <span className="text-green-400/50">in</span> = trx masuk
                  {" · "}
                  <span className="text-blue-400/50">pos Kategori</span> = pilihan kategori
                  {selDate !== TODAY() && <span className="text-amber-400/50"> · backdate: {dateLabel(selDate)}</span>}
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
