"use client";
import { useState, useRef, useCallback, memo, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, TerminalSquare, Mic, Camera, Calendar, ChevronDown } from "lucide-react";
import { parseFlexibleNumber } from "@/lib/utils";
import { tokenizeInput } from "@/lib/aiEngine";

const TODAY = () => new Date().toISOString().slice(0, 10);

const STOP_WORDS = new Set([
  "beli", "bayar", "untuk", "ke", "di", "dari", "dan", "atau", "dengan", "yang",
  "nya", "ini", "itu", "ada", "aja", "deh", "dong", "sih", "lah", "mau", "udah"
]);

// ── Parse preview + AI classify v2 ─────────────────────────────────────────
const parsePreview = (text, aiKeywords, userCategories, userPatterns) => {
  if (!text || text.length < 1) return null;
  let raw = text.trim();
  let type = "expense";

  if (/^in\s+/i.test(raw)) { type = "income"; raw = raw.replace(/^in\s+/i, ""); }
  else if (/^out\s+/i.test(raw)) { raw = raw.replace(/^out\s+/i, ""); }

  // pos override
  let manualCategory = null;
  const posIdx = raw.toLowerCase().indexOf(" pos ");
  if (posIdx !== -1) {
    manualCategory = raw.slice(posIdx + 5).trim();
    manualCategory = manualCategory.charAt(0).toUpperCase() + manualCategory.slice(1);
    raw = raw.slice(0, posIdx).trim();
  }

  // Smart tokenize
  const { amount, note: parsedNote } = tokenizeInput(raw);
  const note = parsedNote || raw;

  const words = note.toLowerCase().replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));

  let aiCategory = null;
  let aiCandidates = [];
  let aiSource = "legacy";

  if (!manualCategory && note) {
    // AI v2 — userPatterns (dari habit user)
    if (userPatterns?.length) {
      const scoreMap = {};
      const noteLow = note.toLowerCase().trim();
      for (const p of userPatterns) {
        const phrase = p.phrase?.toLowerCase().trim();
        if (!phrase || phrase.length < 2) continue;
        const freq = Math.max(1, p.frequency || 1);
        const isMulti = phrase.includes(" ");
        let score = 0;

        if (noteLow === phrase) score = 1000 * freq; // exact full
        else if (noteLow.includes(phrase)) score = (isMulti ? 500 : 200) * freq;
        else {
          for (const word of words) {
            if (word === phrase) score += 100 * freq;
            else if (phrase.startsWith(word) && word.length >= 3) score += 30 * freq;
            else if (phrase.includes(word) && word.length >= 3) score += 10 * freq;
          }
        }
        if (score > 0) {
          if (!scoreMap[p.category_id] || scoreMap[p.category_id].score < score) {
            scoreMap[p.category_id] = { score, name: p.name, id: p.category_id };
          }
        }
      }
      const sorted = Object.values(scoreMap).sort((a, b) => b.score - a.score);
      if (sorted.length > 0) {
        aiSource = "v2";
        const isExactWin = sorted[0].score >= 1000; // exact match — tidak perlu alternatif
        const limit = isExactWin ? 1 : 3;
        aiCandidates = sorted.slice(0, limit).map(s => ({ name: s.name, score: s.score, id: s.id })).filter(c => c.name);
        if (aiCandidates.length > 0) aiCategory = aiCandidates[0].name;
      }
    }

    // Fallback legacy aiKeywords
    if (!aiCategory && words.length > 0 && aiKeywords?.length) {
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
      const sortedLeg = Object.entries(scoreMap).sort((a, b) => b[1] - a[1]);
      aiCandidates = sortedLeg.map(([name]) => ({ name }));
      if (aiCandidates.length > 0) aiCategory = aiCandidates[0].name;
    }
  }

  return {
    type, amount,
    hasAmount: !!(amount && amount > 0),
    note: note.charAt(0).toUpperCase() + note.slice(1) || "-",
    category: manualCategory || aiCategory || "Lainnya",
    manualCategory, aiCandidates, aiSource,
    isManual: !!manualCategory,
  };
};

const fmtRp = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
};

const dateLabel = (d) => {
  if (!d || d === TODAY()) return "Hari ini";
  const diff = Math.round((new Date(TODAY()) - new Date(d)) / 86400000);
  if (diff === 1) return "Kemarin";
  if (diff > 1) return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  return d;
};

// ── Context config ─────────────────────────────────────────────────────────────
const CONTEXT_CONFIG = {
  debts:     { placeholder: "Hutang ke Budi 500rb...",  label: "HUTANG/PIUTANG" },
  recurring: { placeholder: "Netflix 59rb bulanan...",  label: "RUTIN" },
  savings:   { placeholder: "Nabung laptop 5jt...",     label: "TABUNGAN" },
  assets:    { placeholder: "Laptop Dell 8jt baru...",  label: "ASET" },
};

// ── Context-aware parse functions ────────────────────────────────────────────
const parseDebt = (text) => {
  const { amount, note: parsedNote } = tokenizeInput(text);
  const raw = (parsedNote || text).toLowerCase();
  const type = ["piutang", "tagih", "pinjemin", "nyarain"].some(w => raw.includes(w))
    ? "receivable" : "debt";
  let person = parsedNote || text;
  ["hutang", "piutang", "pinjam", "tagih", "pinjemin", "kasih", "nyarain", "ngutang", "minjam"]
    .forEach(w => { person = person.replace(new RegExp("\\b" + w + "\\b", "gi"), ""); });
  [" ke ", " dari ", " sama ", " buat "].forEach(w => { person = person.replace(new RegExp(w, "gi"), " "); });
  person = person.trim().replace(/\s+/g, " ");
  if (person) person = person.charAt(0).toUpperCase() + person.slice(1);
  return { person: person || "?", amount: amount || 0, type };
};

const parseRecurring = (text) => {
  const { amount, note: parsedNote } = tokenizeInput(text);
  const raw = text.toLowerCase();
  const frequency = /harian|daily/.test(raw) ? "daily"
    : /mingguan|weekly/.test(raw) ? "weekly" : "monthly";
  const type = /^in\s|gaji|terima|pemasukan/.test(raw) ? "income" : "expense";
  let note = parsedNote || text;
  ["harian", "daily", "mingguan", "weekly", "bulanan", "monthly"]
    .forEach(w => { note = note.replace(new RegExp("\\b" + w + "\\b", "gi"), ""); });
  if (/^in\s/i.test(note)) note = note.replace(/^in\s/i, "");
  note = note.trim().replace(/\s+/g, " ");
  if (note) note = note.charAt(0).toUpperCase() + note.slice(1);
  const lower = (note || "").toLowerCase();
  const category = /netflix|spotify|streaming|subscribe|langganan/.test(lower) ? "Hiburan"
    : /gaji|salary/.test(lower) ? "Gaji"
    : /listrik|pln|air|pdam|internet/.test(lower) ? "Tagihan"
    : /cicilan|kredit|angsuran/.test(lower) ? "Cicilan"
    : type === "income" ? "Pendapatan" : "Tagihan";
  return { note: note || "?", amount: amount || 0, type, frequency, category };
};

const parseSavings = (text) => {
  const { amount, note: parsedNote } = tokenizeInput(text);
  let name = parsedNote || text;
  ["nabung", "target", "tabung", "goal", "saving", "tujuan", "untuk", "buat"]
    .forEach(w => { name = name.replace(new RegExp("\\b" + w + "\\b", "gi"), ""); });
  name = name.trim().replace(/\s+/g, " ");
  if (name) name = name.charAt(0).toUpperCase() + name.slice(1);
  return { name: name || "?", target_amount: amount || 0 };
};

const parseAsset = (text) => {
  const { amount, note: parsedNote } = tokenizeInput(text);
  const raw = text.toLowerCase();
  const condition = /rusak/.test(raw) ? "rusak"
    : /servis|service/.test(raw) ? "perlu_servis"
    : /baru|new/.test(raw) ? "baru"
    : "baik";
  let name = parsedNote || text;
  ["baru", "rusak", "servis", "service", "new"]
    .forEach(w => { name = name.replace(new RegExp("\\b" + w + "\\b", "gi"), ""); });
  name = name.trim().replace(/\s+/g, " ");
  if (name) name = name.charAt(0).toUpperCase() + name.slice(1);
  return { name: name || "?", price: amount || 0, condition };
};

const parseByContext = (context, text) => {
  switch (context) {
    case "debts": return parseDebt(text);
    case "recurring": return parseRecurring(text);
    case "savings": return parseSavings(text);
    case "assets": return parseAsset(text);
    default: return null;
  }
};

const FREQ_LABELS = { daily: "HARIAN", weekly: "MINGGUAN", monthly: "BULANAN" };
const COND_LABELS = { baru: "Baru", baik: "Baik", perlu_servis: "Perlu Servis", rusak: "Rusak" };
const COND_COLORS = {
  baru:         "var(--a1)",
  baik:         "var(--income)",
  perlu_servis: "rgb(245,158,11)",
  rusak:        "var(--a3)",
};

// ── Main ──────────────────────────────────────────────────────────────────────
const QuickCommandBar = memo(function QuickCommandBar({
  onProcessTransaction,
  isSmartLoading = false,
  aiKeywords = [],
  userCategories = [],
  userPatterns = [],
  session,
  currentContext = null,
  onContextSubmit,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const suggestDebounce = useRef(null);
  const suppressSuggest = useRef(false); // prevent refire setelah chip klik
  const [isListening, setIsListening] = useState(false);
  const [selDate, setSelDate] = useState(TODAY());
  const [showCal, setShowCal] = useState(false);
  const [selCategory, setSelCategory] = useState(null); // user pilih dari candidates
  const [showCandList, setShowCandList] = useState(false);
  const [inputError, setInputError] = useState(false);
  const [hasTriedOnce, setHasTriedOnce] = useState(false);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);
  const camRef = useRef(null);
  const galRef = useRef(null);

  const ctxConfig = CONTEXT_CONFIG[currentContext];
  const isContextMode = !!ctxConfig;

  const preview = useMemo(() =>
    !isContextMode ? parsePreview(inputText, aiKeywords, userCategories, userPatterns) : null,
    [isContextMode, inputText, aiKeywords, userCategories, userPatterns]
  );

  const contextPreview = useMemo(() => {
    if (!isContextMode || !inputText.trim()) return null;
    return parseByContext(currentContext, inputText);
  }, [isContextMode, currentContext, inputText]);

  // Reset selCategory dan error saat input berubah
  useEffect(() => {
    setSelCategory(null);
    setShowCandList(false);
    if (inputError && inputText.length === 0) setInputError(false);
  }, [inputText]);


  // ── Autocomplete instant dari local userPatterns ─────────────────────────
  useEffect(() => {
    if (suppressSuggest.current) return; // chip baru diklik, skip
    if (!inputText.trim() || !isOpen) { setSuggestions([]); return; }

    // ── Deteksi mode "pos" — autocomplete kategori ──────────────────────────
    const posMatch = inputText.match(/ pos (.*)$/i);
    if (posMatch) {
      const posPartial = posMatch[1].toLowerCase().trim();
      if (userCategories?.length) {
        const exactCat = userCategories.find(c => c.name.toLowerCase() === posPartial);
        if (exactCat && posPartial.length > 0) { setSuggestions([]); return; }
        const catMatches = userCategories
          .filter(c => c.name.toLowerCase().startsWith(posPartial) ||
            (posPartial.length === 0))
          .slice(0, 4)
          .map((c, i) => ({
            phrase: c.name, // simpan nama saja
            categoryId: c.id,
            categoryName: c.name,
            score: 1000,
            isPosMode: true,
            displayLabel: c.name,
          }));
        setSuggestions(catMatches);
      }
      return;
    }

    const { note } = tokenizeInput(inputText);
    const search = (note || inputText).toLowerCase().trim();
    if (!search) { setSuggestions([]); return; }
    if (!userPatterns?.length) { setSuggestions([]); return; }

    const scoreMap = {};
    for (const p of userPatterns) {
      const phrase = p.phrase?.toLowerCase();
      if (!phrase) continue;
      const freq = p.frequency || 1;
      let score = 0;
      if (phrase === search) score = 1000 * freq; // exact
      else if (phrase.startsWith(search)) score = 500 * freq; // prefix
      else if (phrase.includes(search)) score = 200 * freq; // contains
      else if (search.includes(phrase) && phrase.length >= 3) score = 100 * freq; // reverse
      if (score > 0) {
        const key = p.category_id;
        if (!scoreMap[key] || scoreMap[key].score < score) {
          scoreMap[key] = { phrase: p.phrase, categoryId: p.category_id, categoryName: p.name, score, frequency: freq, typicalAmount: p.typical_amount || null };
        }
      }
    }
    const sorted = Object.values(scoreMap).sort((a, b) => b.score - a.score);
    // Jika ada exact match (score >= 1000*freq) → hanya tampil 1
    const hasExact = sorted[0]?.score >= 1000;
    setSuggestions(hasExact ? sorted.slice(0, 1) : sorted.slice(0, 3));
  }, [inputText, isOpen, userPatterns]);

  // ── Keyboard trigger instan — iOS + Android + Desktop ───────────────────────
  useEffect(() => {
    if (!isOpen) return;
    // Langsung focus tanpa delay — paling instan
    const el = inputRef.current;
    if (!el) return;
    // Trigger di dalam gesture context (setTimeout 0 = next tick)
    const t1 = setTimeout(() => {
      el.focus();
      // iOS Safari: perlu readOnly trick
      el.removeAttribute("readonly");
      el.focus();
    }, 0);
    // Fallback jika belum fokus
    const t2 = setTimeout(() => {
      if (document.activeElement !== el) {
        el.focus();
      }
    }, 100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
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

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || isSmartLoading) return;

    // Context mode — route ke onContextSubmit
    if (isContextMode) {
      if (!onContextSubmit || !contextPreview) return;
      await onContextSubmit(currentContext, contextPreview);
      setInputText("");
      setSelDate(TODAY());
      setShowCal(false);
      setSelCategory(null);
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    if (typeof onProcessTransaction !== "function") return;

    // Smart tokenize — tidak perlu format kaku
    const { amount, note } = tokenizeInput(text);

    // Validasi: harus ada minimal note atau amount
    const hasContent = note?.length > 0 || amount;
    if (!hasContent) {
      setHasTriedOnce(true);
      setInputError(true);
      inputRef.current?.focus();
      return;
    }
    // Jika ada note tapi tidak ada amount → hint, bukan error keras
    if (!amount && note) {
      setHasTriedOnce(true);
      setInputError(true);
      inputRef.current?.focus();
      return;
    }
    // Jika ketuk chip suggestion tanpa amount → fokus input
    if (!amount) {
      inputRef.current?.focus();
      return;
    }
    setInputError(false);
    setHasTriedOnce(false);

    // Inject kategori manual jika ada
    let finalText = text;
    if (selCategory && !text.toLowerCase().includes(" pos ")) {
      const posIdx = text.toLowerCase().indexOf(" pos ");
      const baseText = posIdx !== -1 ? text.slice(0, posIdx) : text;
      const catName = typeof selCategory === "string" ? selCategory : selCategory?.name;
      finalText = `${baseText} pos ${catName}`;
    }

    const dateToSend = selDate !== TODAY() ? selDate : null;
    onProcessTransaction(finalText, null, dateToSend);
    setInputText("");
    setSelDate(TODAY());
    setShowCal(false);
    setSelCategory(null);
    setSuggestions([]);
    setIsOpen(false);
  }, [inputText, selCategory, selDate, isSmartLoading, onProcessTransaction,
      isContextMode, onContextSubmit, contextPreview, currentContext]);

  const toggleVoice = useCallback(() => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "id-ID"; rec.interimResults = false;
    rec.onstart = () => { setIsListening(true); setInputText("Mendengarkan..."); };
    rec.onresult = (e) => { setIsListening(false); setInputText(e.results[0][0].transcript); };
    rec.onerror = () => { setIsListening(false); setInputText(""); };
    rec.onend = () => setIsListening(false);
    rec.start();
  }, [isListening]);

  // Candidates untuk dropdown kategori
  const candidates = preview?.aiCandidates || [];
  const shownCat = (typeof selCategory === "string" ? selCategory : selCategory?.name) || preview?.category || "Lainnya";
  const isExact = !preview?.isManual && candidates.length === 1;
  const canClick = !preview?.isManual && candidates.length > 1;

  return (
    <>
      {/* Backdrop — refocus bukan close */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-[199]" style={{ background: "transparent" }}
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              if (!inputText.trim()) {
                // Kosong → tutup instan
                close();
              } else {
                // Ada isian → tetap buka, fokus input
                setShowCandList(false);
                setShowCal(false);
                inputRef.current?.focus();
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Container */}
      <div className="relative flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>

          {/* FAB */}
          {!isOpen && (
            <motion.button
              key="fab"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              onClick={() => setIsOpen(true)}
              className="w-12 h-12 active:scale-90 rounded-[18px] flex items-center justify-center transition-all" style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))", boxShadow: "0 0 24px color-mix(in srgb, var(--a1) 30%, transparent), 0 8px 32px color-mix(in srgb, var(--a2) 20%, transparent)" }}
            >
              <TerminalSquare size={22} className="text-white" />
            </motion.button>
          )}

          {/* Panel */}
          {isOpen && (
            <motion.div
              key="panel"
              /* 1. Tambahkan x: "-50%" di sini agar Framer Motion yang menguncinya di tengah */
              initial={{ opacity: 0, y: 10, scale: 0.98, x: "-50%" }}
              animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
              exit={{ opacity: 0, y: 6, scale: 0.98, x: "-50%" }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl overflow-visible"
              style={{
                position: "fixed",
                bottom: "calc(72px + env(safe-area-inset-bottom,0px) + 8px)",
                left: "50%",
                /* transform: "translateX(-50%)" dihapus karena sudah diurus motion */
                width: "calc(100vw - 2rem)",
                maxWidth: 480,
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                boxShadow: "0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px color-mix(in srgb,var(--a1) 15%,transparent)",
                zIndex: 200,
              }}
            >

              {/* ── Context badge ── */}
              {ctxConfig && (
                <div className="px-4 pt-3 pb-0">
                  <span className="text-2xs font-black uppercase tracking-widest ff-mono px-2.5 py-1 rounded-lg"
                    style={{ color: "var(--a2)", background: "color-mix(in srgb, var(--a2) 12%, transparent)" }}>
                    {ctxConfig.label}
                  </span>
                </div>
              )}

              {/* ── Context preview ── */}
              <AnimatePresence>
                {isContextMode && contextPreview && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="overflow-visible"
                  >
                    <div className="flex items-center gap-2 px-4 pt-2 pb-1 flex-wrap">
                      {currentContext === "debts" && (
                        <>
                          <span className="font-black text-sm" style={{ color: "var(--text-1)" }}>
                            {contextPreview.person}
                          </span>
                          <span className="text-label font-black px-2 py-0.5 rounded-lg uppercase tracking-widest"
                            style={contextPreview.type === "debt"
                              ? { background: "color-mix(in srgb, var(--a3) 15%, transparent)", color: "var(--a3)" }
                              : { background: "color-mix(in srgb, var(--income) 15%, transparent)", color: "var(--income)" }}>
                            {contextPreview.type === "debt" ? "Hutang" : "Piutang"}
                          </span>
                          <span className="font-black text-sm ff-mono" style={{ color: contextPreview.type === "debt" ? "var(--a3)" : "var(--income)" }}>
                            {contextPreview.amount > 0 ? `Rp ${fmtRp(contextPreview.amount)}` : "···"}
                          </span>
                        </>
                      )}
                      {currentContext === "recurring" && (
                        <>
                          <span className="font-black text-sm" style={{ color: "var(--text-1)" }}>
                            {contextPreview.note}
                          </span>
                          <span className="text-label font-black px-2 py-0.5 rounded-lg uppercase tracking-widest"
                            style={contextPreview.type === "income"
                              ? { background: "color-mix(in srgb, var(--income) 15%, transparent)", color: "var(--income)" }
                              : { background: "color-mix(in srgb, var(--a3) 15%, transparent)", color: "var(--a3)" }}>
                            {contextPreview.type === "income" ? "Masuk" : "Keluar"}
                          </span>
                          <span className="text-label font-black px-2 py-0.5 rounded-lg uppercase tracking-widest"
                            style={{ background: "color-mix(in srgb, var(--a1) 15%, transparent)", color: "var(--a1)" }}>
                            {FREQ_LABELS[contextPreview.frequency] || contextPreview.frequency}
                          </span>
                          <span className="font-black text-sm ff-mono" style={{ color: "var(--text-2)" }}>
                            {contextPreview.amount > 0 ? `Rp ${fmtRp(contextPreview.amount)}` : "···"}
                          </span>
                        </>
                      )}
                      {currentContext === "savings" && (
                        <>
                          <span className="text-caption">🎯</span>
                          <span className="font-black text-sm" style={{ color: "var(--text-1)" }}>
                            {contextPreview.name}
                          </span>
                          <span className="text-label font-black px-2 py-0.5 rounded-lg uppercase tracking-widest"
                            style={{ background: "color-mix(in srgb, var(--income) 15%, transparent)", color: "var(--income)" }}>
                            Target
                          </span>
                          <span className="font-black text-sm ff-mono" style={{ color: "var(--income)" }}>
                            {contextPreview.target_amount > 0 ? `Rp ${fmtRp(contextPreview.target_amount)}` : "···"}
                          </span>
                        </>
                      )}
                      {currentContext === "assets" && (
                        <>
                          <span className="font-black text-sm" style={{ color: "var(--text-1)" }}>
                            {contextPreview.name}
                          </span>
                          <span className="text-label font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border"
                            style={{ color: COND_COLORS[contextPreview.condition], background: `color-mix(in srgb, ${COND_COLORS[contextPreview.condition]} 12%, transparent)`, borderColor: `color-mix(in srgb, ${COND_COLORS[contextPreview.condition]} 25%, transparent)` }}>
                            {COND_LABELS[contextPreview.condition]}
                          </span>
                          {contextPreview.price > 0 && (
                            <span className="font-black text-sm ff-mono" style={{ color: "var(--a2)" }}>
                              Rp {fmtRp(contextPreview.price)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Transaction preview bar ── */}
              <AnimatePresence>
                {!isContextMode && preview && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="overflow-visible"
                  >
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1 flex-wrap">
                      {/* Tipe */}
                      <span
                        className="text-label font-black px-2 py-1 rounded-lg uppercase tracking-widest"
                        style={preview.type === "income"
                          ? { background: "color-mix(in srgb, var(--income) 15%, transparent)", color: "var(--income)" }
                          : { background: "color-mix(in srgb, var(--a3) 15%, transparent)", color: "var(--a3)" }}
                      >
                        {preview.type === "income" ? "Masuk" : "Keluar"}
                      </span>

                      {/* Nominal */}
                      <span
                        className="font-black text-sm ff-mono"
                        style={{ color: preview.type === "income" ? "var(--income)" : "var(--a3)" }}
                      >
                        {preview.hasAmount ? `Rp ${fmtRp(preview.amount)}` : "···"}
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
                          className={`flex items-center gap-1 text-label font-black px-2.5 py-1 rounded-lg uppercase tracking-widest transition-all ${
                            (preview.isManual || isExact || canClick)
                              ? "active:scale-95"
                              : "cursor-default"
                          }`}
                          style={(preview.isManual || isExact || canClick)
                            ? { background: "color-mix(in srgb, var(--a2) 15%, transparent)", color: "var(--a2)" }
                            : { background: "color-mix(in srgb, var(--text-1) 8%, transparent)", color: "var(--text-3)" }}
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
                                className="absolute bottom-full right-0 mb-1.5 ds-bg-2 border border-white/10 rounded-2xl shadow-2xl z-[61] overflow-hidden min-w-[140px]"
                              >
                                {candidates.map((cat, ci) => {
                                  const catName = typeof cat === "string" ? cat : cat?.name;
                                  return (
                                    <button
                                      key={`cat-${ci}-${catName}`}
                                      onClick={() => { setSelCategory(catName); setShowCandList(false); }}
                                      className="w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center justify-between gap-3"
                                      style={shownCat === catName
                                        ? { color: "var(--a2)", background: "color-mix(in srgb, var(--a2) 10%, transparent)" }
                                        : { color: "var(--text-2)" }}
                                    >
                                      {catName}
                                      {shownCat === catName && <span style={{ color: "var(--a2)" }} className="text-caption">✓</span>}
                                    </button>
                                  );
                                })}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Badge tanggal */}
                      {selDate !== TODAY() && (
                        <span className="text-label font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                          {dateLabel(selDate)}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Date picker (transaction mode only) */}
              <AnimatePresence>
                {!isContextMode && showCal && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-2 pt-2 flex items-center gap-3">
                      <label className="text-label font-black text-white/40 uppercase tracking-widest shrink-0">Tanggal</label>
                      <input
                        type="date"
                        value={selDate}
                        max={TODAY()}
                        onChange={e => { setSelDate(e.target.value || TODAY()); inputRef.current?.focus(); }}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-[var(--a1)] transition-colors"
                      />
                      {selDate !== TODAY() && (
                        <button type="button" onClick={() => { setSelDate(TODAY()); inputRef.current?.focus(); }}
                          className="text-label font-black text-white/30 hover:text-white uppercase tracking-widest transition-colors shrink-0">
                          Reset
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input row */}
              <form onSubmit={handleSubmit} className={`flex items-center gap-1 px-3 py-3 transition-all ${inputError ? "animate-shake" : ""}`}>
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
                  placeholder={ctxConfig?.placeholder ?? "50k makan siang"}
                  autoComplete="off"
                  autoCorrect="off"
                  autoFocus
                  className="flex-1 bg-transparent outline-none text-sm font-bold text-white placeholder-white/25 h-10 min-w-0"
                />

                {!isContextMode && (
                  <button type="button" onClick={() => { setShowCal(p => !p); inputRef.current?.focus(); }}
                    className={`p-2 rounded-xl transition-all shrink-0 ${selDate !== TODAY() || showCal ? "text-amber-400 bg-amber-500/10" : "text-white/30 hover:text-white/70 hover:bg-white/5"
                      }`}>
                    <Calendar size={17} />
                  </button>
                )}

                {/* Mic */}
                <button type="button" onClick={toggleVoice}
                  className={`p-2 rounded-xl transition-all shrink-0 ${isListening ? "animate-pulse" : "text-white/30 hover:text-white/70 hover:bg-white/5"}`}
                  style={isListening ? { color: "var(--a3)", background: "color-mix(in srgb, var(--a3) 10%, transparent)" } : undefined}
                  >
                  <Mic size={17} />
                </button>

                <button type="submit" disabled={isSmartLoading || !inputText.trim() || inputText === "Mendengarkan..."}
                  className="p-2 rounded-xl transition-all shrink-0 disabled:opacity-30"
                  style={((preview || contextPreview) && !isSmartLoading) ? { background: "linear-gradient(135deg, var(--a1), var(--a2))", color: "#fff" } : { color: "var(--text-4)" }}
                  >
                  {isSmartLoading
                    ? <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    : <Send size={17} />
                  }
                </button>
              </form>

              {/* File inputs tersembunyi */}
              <input ref={camRef} type="file" accept="image/*" capture="environment"
                onChange={e => { if (e.target.files?.[0]) { /* handle foto dari QCB jika perlu */ } e.target.value = ""; }}
                className="hidden" />
              <input ref={galRef} type="file" accept="image/*"
                onChange={e => { if (e.target.files?.[0]) { /* handle foto dari QCB jika perlu */ } e.target.value = ""; }}
                className="hidden" />

              {/* Autocomplete Chips (transaction mode only) */}
              <AnimatePresence>
                {!isContextMode && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto no-scrollbar"
                  >
                    {suggestions.map((s, i) => {
                      const chipKey = `${i}-${typeof s.phrase === "string" ? s.phrase : String(i)}`; return (
                        <motion.button
                          key={chipKey}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ duration: 0.1, delay: i * 0.04 }}
                          type="button"
                          onClick={() => {
                            // Fill input dengan phrase + auto-submit
                            if (s.isPosMode) {
                              // Pos mode
                              const base = inputText.replace(/ pos .*$/i, "").trim();
                              const newText = base ? `${base} pos ${s.categoryName}` : `pos ${s.categoryName}`;
                              suppressSuggest.current = true;
                              setInputText(newText);
                              setSelCategory(s.categoryName || null);
                              setSuggestions([]);
                              setTimeout(() => { suppressSuggest.current = false; }, 400);
                              inputRef.current?.focus();
                              return;
                            }
                            const { amount } = tokenizeInput(inputText);
                            const useAmt = amount || s.typicalAmount;
                            const filled = useAmt ? `${useAmt >= 1000 ? Math.round(useAmt / 1000) + "k" : useAmt} ${s.phrase}` : s.phrase;
                            suppressSuggest.current = true;
                            setInputText(filled);
                            setSelCategory(s.categoryName || null);
                            setSuggestions([]);
                            setTimeout(() => { suppressSuggest.current = false; }, 400);
                            // User review dulu, baru Enter untuk submit
                            inputRef.current?.focus();
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 active:scale-95 rounded-xl text-caption font-black whitespace-nowrap transition-all shrink-0 border"
                          style={{ background: "color-mix(in srgb, var(--a2) 12%, transparent)", borderColor: "color-mix(in srgb, var(--a2) 20%, transparent)", color: "var(--a2)" }}
                        >
                          {s.isPosMode ? (
                            <span style={{ color: "var(--a2)" }} className="font-black">{s.displayLabel}</span>
                          ) : (
                            <span>{s.phrase}</span>
                          )}
                          {!s.isPosMode && s.typicalAmount && (
                            <span className="text-amber-300/70">· {s.typicalAmount >= 1000000 ? `${(s.typicalAmount / 1000000).toFixed(1)}jt` : s.typicalAmount >= 1000 ? `${Math.round(s.typicalAmount / 1000)}k` : s.typicalAmount}</span>
                          )}
                          {!s.isPosMode && s.categoryName && (
                            <span style={{ color: "var(--a1)", opacity: 0.7 }}>· {s.categoryName}</span>
                          )}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hint */}
              <div className="px-4 pb-3">
                <AnimatePresence>
                  {inputError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-label font-black mb-1.5" style={{ color: "var(--a3)" }}
                    >
                      ⚠ Format: <span className="text-white/60">50k makan siang</span> atau <span className="text-white/60">in 5jt gaji</span>
                    </motion.p>
                  )}
                </AnimatePresence>
                {isContextMode ? (
                  <p className="text-label text-white/20 font-bold">
                    {currentContext === "debts" && "cth: hutang ke Budi 500rb · piutang dari Ani 1jt"}
                    {currentContext === "recurring" && "cth: Netflix 59rb bulanan · gaji 5jt bulanan"}
                    {currentContext === "savings" && "cth: nabung laptop 5jt · target HP baru 2jt"}
                    {currentContext === "assets" && "cth: Laptop Dell 8jt baru · iPhone 15jt"}
                  </p>
                ) : (
                  <p className="text-label text-white/20 font-bold">
                    ketik bebas · <span style={{ color: "color-mix(in srgb, var(--income) 50%, transparent)" }}>in</span> = pemasukan
                    {selDate !== TODAY() && <span className="text-amber-400/50"> · {dateLabel(selDate)}</span>}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
});
export default QuickCommandBar;
