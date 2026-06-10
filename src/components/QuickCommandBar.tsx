"use client";
import { useState, useRef, useCallback, memo, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, TerminalSquare, Mic, Calendar, ChevronDown } from "lucide-react";
import { tokenizeInput } from "@/lib/aiEngine";
import type { AiKeyword, UserCategory, UserPattern } from "@/types";
import type { Session } from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ContextKey = "debts" | "recurring" | "savings" | "assets";

export interface DebtPreview      { person: string; amount: number; type: "debt" | "receivable"; }
export interface RecurringPreview { note: string; amount: number; type: "income" | "expense"; frequency: "daily" | "weekly" | "monthly"; category: string; }
export interface SavingsPreview   { name: string; target_amount: number; }
export interface AssetPreview     { name: string; price: number; condition: "baru" | "baik" | "perlu_servis" | "rusak"; }
export type ContextPreview = DebtPreview | RecurringPreview | SavingsPreview | AssetPreview;

interface AiCandidate { name: string; score?: number; id?: string; }

interface ParsePreviewResult {
  type: "income" | "expense";
  amount: number | null;
  hasAmount: boolean;
  note: string;
  category: string;
  manualCategory: string | null;
  aiCandidates: AiCandidate[];
  aiSource: string;
  isManual: boolean;
}

interface SuggestionChip {
  phrase: string;
  categoryId?: string;
  categoryName?: string;
  score?: number;
  frequency?: number;
  typicalAmount?: number | null;
  isPosMode?: boolean;
  displayLabel?: string;
}

interface ContextConfig { placeholder: string; label: string; }

interface SpeechRecognitionInstance {
  lang: string; interimResults: boolean;
  onstart: () => void;
  onresult: (e: { results: { [0]: { [0]: { transcript: string } } } }) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface QuickCommandBarProps {
  onProcessTransaction?: (text: string, photo: null, date: string | null) => void;
  isSmartLoading?: boolean;
  aiKeywords?: AiKeyword[];
  userCategories?: UserCategory[];
  userPatterns?: UserPattern[];
  session?: Session | null;
  currentContext?: ContextKey | null;
  onContextSubmit?: (context: ContextKey, preview: ContextPreview) => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TODAY = (): string => new Date().toISOString().slice(0, 10);

const STOP_WORDS = new Set([
  "beli", "bayar", "untuk", "ke", "di", "dari", "dan", "atau", "dengan", "yang",
  "nya", "ini", "itu", "ada", "aja", "deh", "dong", "sih", "lah", "mau", "udah",
]);

const CONTEXT_CONFIG: Record<ContextKey, ContextConfig> = {
  debts:     { placeholder: "Hutang ke Budi 500rb...",  label: "HUTANG/PIUTANG" },
  recurring: { placeholder: "Netflix 59rb bulanan...",  label: "RUTIN" },
  savings:   { placeholder: "Nabung laptop 5jt...",     label: "TABUNGAN" },
  assets:    { placeholder: "Laptop Dell 8jt baru...",  label: "ASET" },
};

const FREQ_LABELS: Record<string, string> = { daily: "HARIAN", weekly: "MINGGUAN", monthly: "BULANAN" };
const COND_LABELS: Record<string, string> = { baru: "Baru", baik: "Baik", perlu_servis: "Perlu Servis", rusak: "Rusak" };
const COND_COLORS: Record<string, string> = { baru: "var(--a1)", baik: "var(--income)", perlu_servis: "rgb(245,158,11)", rusak: "var(--a3)" };

const fmtRp = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
};

const dateLabel = (d: string): string => {
  if (!d || d === TODAY()) return "Hari ini";
  const diff = Math.round((new Date(TODAY()).getTime() - new Date(d).getTime()) / 86400000);
  if (diff === 1) return "Kemarin";
  if (diff > 1) return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  return d;
};

// ── Parse functions ───────────────────────────────────────────────────────────

const parsePreview = (
  text: string,
  aiKeywords: AiKeyword[],
  userCategories: UserCategory[],
  userPatterns: UserPattern[],
): ParsePreviewResult | null => {
  if (!text || text.length < 1) return null;
  let raw = text.trim();
  let type: "income" | "expense" = "expense";
  if (/^in\s+/i.test(raw)) { type = "income"; raw = raw.replace(/^in\s+/i, ""); }
  else if (/^out\s+/i.test(raw)) { raw = raw.replace(/^out\s+/i, ""); }

  let manualCategory: string | null = null;
  const posIdx = raw.toLowerCase().indexOf(" pos ");
  if (posIdx !== -1) {
    manualCategory = raw.slice(posIdx + 5).trim();
    manualCategory = manualCategory.charAt(0).toUpperCase() + manualCategory.slice(1);
    raw = raw.slice(0, posIdx).trim();
  }

  const { amount, note: parsedNote } = tokenizeInput(raw);
  const note = parsedNote || raw;
  const words = note.toLowerCase().replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));

  let aiCategory: string | null = null;
  let aiCandidates: AiCandidate[] = [];
  let aiSource = "legacy";

  if (!manualCategory && note) {
    if (userPatterns?.length) {
      const scoreMap: Record<string, { score: number; name: string; id: string }> = {};
      const noteLow = note.toLowerCase().trim();
      for (const p of userPatterns) {
        const phrase = p.phrase?.toLowerCase().trim();
        if (!phrase || phrase.length < 2) continue;
        const freq = Math.max(1, p.frequency || 1);
        const isMulti = phrase.includes(" ");
        let score = 0;
        if (noteLow === phrase) score = 1000 * freq;
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
            scoreMap[p.category_id] = { score, name: p.name ?? "", id: p.category_id };
          }
        }
      }
      const sorted = Object.values(scoreMap).sort((a, b) => b.score - a.score);
      if (sorted.length > 0) {
        aiSource = "v2";
        const isExactWin = sorted[0].score >= 1000;
        const limit = isExactWin ? 1 : 3;
        aiCandidates = sorted.slice(0, limit).map(s => ({ name: s.name, score: s.score, id: s.id })).filter(c => c.name);
        if (aiCandidates.length > 0) aiCategory = aiCandidates[0].name;
      }
    }

    if (!aiCategory && words.length > 0 && aiKeywords?.length) {
      const scoreMap: Record<string, number> = {};
      for (const word of words) {
        for (const kw of aiKeywords) {
          if (!kw.keyword) continue;
          const kwLow = kw.keyword.toLowerCase();
          if (word.includes(kwLow) || kwLow.includes(word)) {
            const cat = userCategories?.find(c => c.id === kw.category_id);
            if (cat) scoreMap[cat.name] = (scoreMap[cat.name] || 0) + (word === kwLow ? 2 : 1);
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

const parseDebt = (text: string): DebtPreview => {
  const { amount, note: parsedNote } = tokenizeInput(text);
  const raw = (parsedNote || text).toLowerCase();
  const type = ["piutang", "tagih", "pinjemin", "nyarain"].some(w => raw.includes(w)) ? "receivable" as const : "debt" as const;
  let person = parsedNote || text;
  ["hutang", "piutang", "pinjam", "tagih", "pinjemin", "kasih", "nyarain", "ngutang", "minjam"]
    .forEach(w => { person = person.replace(new RegExp("\\b" + w + "\\b", "gi"), ""); });
  [" ke ", " dari ", " sama ", " buat "].forEach(w => { person = person.replace(new RegExp(w, "gi"), " "); });
  person = person.trim().replace(/\s+/g, " ");
  if (person) person = person.charAt(0).toUpperCase() + person.slice(1);
  return { person: person || "?", amount: amount || 0, type };
};

const parseRecurring = (text: string): RecurringPreview => {
  const { amount, note: parsedNote } = tokenizeInput(text);
  const raw = text.toLowerCase();
  const frequency = /harian|daily/.test(raw) ? "daily" as const : /mingguan|weekly/.test(raw) ? "weekly" as const : "monthly" as const;
  const type = /^in\s|gaji|terima|pemasukan/.test(raw) ? "income" as const : "expense" as const;
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

const parseSavings = (text: string): SavingsPreview => {
  const { amount, note: parsedNote } = tokenizeInput(text);
  let name = parsedNote || text;
  ["nabung", "target", "tabung", "goal", "saving", "tujuan", "untuk", "buat"]
    .forEach(w => { name = name.replace(new RegExp("\\b" + w + "\\b", "gi"), ""); });
  name = name.trim().replace(/\s+/g, " ");
  if (name) name = name.charAt(0).toUpperCase() + name.slice(1);
  return { name: name || "?", target_amount: amount || 0 };
};

const parseAsset = (text: string): AssetPreview => {
  const { amount, note: parsedNote } = tokenizeInput(text);
  const raw = text.toLowerCase();
  const condition = /rusak/.test(raw) ? "rusak" as const
    : /servis|service/.test(raw) ? "perlu_servis" as const
    : /baru|new/.test(raw) ? "baru" as const
    : "baik" as const;
  let name = parsedNote || text;
  ["baru", "rusak", "servis", "service", "new"]
    .forEach(w => { name = name.replace(new RegExp("\\b" + w + "\\b", "gi"), ""); });
  name = name.trim().replace(/\s+/g, " ");
  if (name) name = name.charAt(0).toUpperCase() + name.slice(1);
  return { name: name || "?", price: amount || 0, condition };
};

const parseByContext = (context: ContextKey, text: string): ContextPreview => {
  switch (context) {
    case "debts":     return parseDebt(text);
    case "recurring": return parseRecurring(text);
    case "savings":   return parseSavings(text);
    case "assets":    return parseAsset(text);
  }
};

// ── Main ──────────────────────────────────────────────────────────────────────

const QuickCommandBar = memo(function QuickCommandBar({
  onProcessTransaction,
  isSmartLoading = false,
  aiKeywords = [],
  userCategories = [],
  userPatterns = [],
  session: _session,
  currentContext = null,
  onContextSubmit,
}: QuickCommandBarProps) {
  const [isOpen,        setIsOpen]        = useState(false);
  const [inputText,     setInputText]     = useState("");
  const [suggestions,   setSuggestions]   = useState<SuggestionChip[]>([]);
  const suppressSuggest                   = useRef(false);
  const [isListening,   setIsListening]   = useState(false);
  const [selDate,       setSelDate]       = useState(TODAY());
  const [showCal,       setShowCal]       = useState(false);
  const [selCategory,   setSelCategory]   = useState<string | null>(null);
  const [showCandList,  setShowCandList]  = useState(false);
  const [inputError,    setInputError]    = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const camRef         = useRef<HTMLInputElement>(null);
  const galRef         = useRef<HTMLInputElement>(null);

  const ctxConfig: ContextConfig | undefined = currentContext ? CONTEXT_CONFIG[currentContext] : undefined;
  const isContextMode = !!ctxConfig;

  const preview = useMemo<ParsePreviewResult | null>(() =>
    !isContextMode ? parsePreview(inputText, aiKeywords, userCategories, userPatterns) : null,
    [isContextMode, inputText, aiKeywords, userCategories, userPatterns]
  );

  const contextPreview = useMemo<ContextPreview | null>(() => {
    if (!isContextMode || !currentContext || !inputText.trim()) return null;
    return parseByContext(currentContext, inputText);
  }, [isContextMode, currentContext, inputText]);

  useEffect(() => {
    setSelCategory(null);
    setShowCandList(false);
    if (inputError && inputText.length === 0) setInputError(false);
  }, [inputText]);

  // Autocomplete from local userPatterns
  useEffect(() => {
    if (suppressSuggest.current) return;
    if (!inputText.trim() || !isOpen) { setSuggestions([]); return; }

    const posMatch = inputText.match(/ pos (.*)$/i);
    if (posMatch) {
      const posPartial = posMatch[1].toLowerCase().trim();
      if (userCategories?.length) {
        const exactCat = userCategories.find(c => c.name.toLowerCase() === posPartial);
        if (exactCat && posPartial.length > 0) { setSuggestions([]); return; }
        const catMatches: SuggestionChip[] = userCategories
          .filter(c => c.name.toLowerCase().startsWith(posPartial) || posPartial.length === 0)
          .slice(0, 4)
          .map(c => ({ phrase: c.name, categoryId: c.id, categoryName: c.name, score: 1000, isPosMode: true, displayLabel: c.name }));
        setSuggestions(catMatches);
      }
      return;
    }

    const { note } = tokenizeInput(inputText);
    const search = (note || inputText).toLowerCase().trim();
    if (!search || !userPatterns?.length) { setSuggestions([]); return; }

    const scoreMap: Record<string, SuggestionChip> = {};
    for (const p of userPatterns) {
      const phrase = p.phrase?.toLowerCase();
      if (!phrase) continue;
      const freq = p.frequency || 1;
      let score = 0;
      if (phrase === search) score = 1000 * freq;
      else if (phrase.startsWith(search)) score = 500 * freq;
      else if (phrase.includes(search)) score = 200 * freq;
      else if (search.includes(phrase) && phrase.length >= 3) score = 100 * freq;
      if (score > 0) {
        const key = p.category_id;
        const existing = scoreMap[key];
        if (!existing || (existing.score ?? 0) < score) {
          scoreMap[key] = { phrase: p.phrase, categoryId: p.category_id, categoryName: p.name ?? undefined, score, frequency: freq, typicalAmount: p.typical_amount ?? null };
        }
      }
    }
    const sorted = Object.values(scoreMap).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const hasExact = (sorted[0]?.score ?? 0) >= 1000;
    setSuggestions(hasExact ? sorted.slice(0, 1) : sorted.slice(0, 3));
  }, [inputText, isOpen, userPatterns, userCategories]);

  // Focus on open
  useEffect(() => {
    if (!isOpen) return;
    const el = inputRef.current;
    if (!el) return;
    const t1 = setTimeout(() => { el.focus(); el.removeAttribute("readonly"); el.focus(); }, 0);
    const t2 = setTimeout(() => { if (document.activeElement !== el) el.focus(); }, 100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isOpen]);

  const close = useCallback((): void => {
    recognitionRef.current?.stop();
    setIsOpen(false);
    setIsListening(false);
    setInputText("");
    setSelDate(TODAY());
    setShowCal(false);
    setSelCategory(null);
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent): Promise<void> => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || isSmartLoading) return;

    if (isContextMode) {
      if (!onContextSubmit || !contextPreview || !currentContext) return;
      await onContextSubmit(currentContext, contextPreview);
      setInputText(""); setSelDate(TODAY()); setShowCal(false); setSelCategory(null); setSuggestions([]); setIsOpen(false);
      return;
    }
    if (typeof onProcessTransaction !== "function") return;

    const { amount, note } = tokenizeInput(text);
    const hasContent = (note?.length ?? 0) > 0 || amount;
    if (!hasContent || (!amount && note)) { setInputError(true); inputRef.current?.focus(); return; }
    if (!amount) { inputRef.current?.focus(); return; }
    setInputError(false);

    let finalText = text;
    if (selCategory && !text.toLowerCase().includes(" pos ")) {
      const posI = text.toLowerCase().indexOf(" pos ");
      const baseText = posI !== -1 ? text.slice(0, posI) : text;
      finalText = `${baseText} pos ${selCategory}`;
    }

    onProcessTransaction(finalText, null, selDate !== TODAY() ? selDate : null);
    setInputText(""); setSelDate(TODAY()); setShowCal(false); setSelCategory(null); setSuggestions([]); setIsOpen(false);
  }, [inputText, selCategory, selDate, isSmartLoading, onProcessTransaction, isContextMode, onContextSubmit, contextPreview, currentContext]);

  const toggleVoice = useCallback((): void => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SRClass = (window as unknown as Record<string, unknown>).SpeechRecognition as (new () => SpeechRecognitionInstance) | undefined
      ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition as (new () => SpeechRecognitionInstance) | undefined;
    if (!SRClass) return;
    const rec = new SRClass();
    recognitionRef.current = rec;
    rec.lang = "id-ID"; rec.interimResults = false;
    rec.onstart  = () => { setIsListening(true); setInputText("Mendengarkan..."); };
    rec.onresult = (e) => { setIsListening(false); setInputText(e.results[0][0].transcript); };
    rec.onerror  = () => { setIsListening(false); setInputText(""); };
    rec.onend    = () => setIsListening(false);
    rec.start();
  }, [isListening]);

  const candidates = preview?.aiCandidates ?? [];
  const shownCat   = selCategory || preview?.category || "Lainnya";
  const isExact    = !preview?.isManual && candidates.length === 1;
  const canClick   = !preview?.isManual && candidates.length > 1;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-[199]" style={{ background: "transparent" }}
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              if (!inputText.trim()) { close(); }
              else { setShowCandList(false); setShowCal(false); inputRef.current?.focus(); }
            }}
          />
        )}
      </AnimatePresence>

      <div className="relative flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>

          {!isOpen && (
            <motion.button
              key="fab"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              onClick={() => setIsOpen(true)}
              className="w-12 h-12 active:scale-90 rounded-[18px] flex items-center justify-center transition-all"
              style={{ background: "linear-gradient(135deg, var(--a1), var(--a2))", boxShadow: "0 0 24px color-mix(in srgb, var(--a1) 30%, transparent), 0 8px 32px color-mix(in srgb, var(--a2) 20%, transparent)" }}
            >
              <TerminalSquare size={22} className="text-white" />
            </motion.button>
          )}

          {isOpen && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 10, scale: 0.98, x: "-50%" }}
              animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
              exit={{ opacity: 0, y: 6, scale: 0.98, x: "-50%" }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl overflow-visible"
              style={{
                position: "fixed",
                bottom: "calc(72px + env(safe-area-inset-bottom,0px) + 8px)",
                left: "50%",
                width: "calc(100vw - 2rem)",
                maxWidth: 480,
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                boxShadow: "0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px color-mix(in srgb,var(--a1) 15%,transparent)",
                zIndex: 200,
              }}
            >
              {ctxConfig && (
                <div className="px-4 pt-3 pb-0">
                  <span className="text-2xs font-black uppercase tracking-widest ff-mono px-2.5 py-1 rounded-lg"
                    style={{ color: "var(--a2)", background: "color-mix(in srgb, var(--a2) 12%, transparent)" }}>
                    {ctxConfig.label}
                  </span>
                </div>
              )}

              {/* Context preview */}
              <AnimatePresence>
                {isContextMode && contextPreview && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.12 }} className="overflow-visible">
                    <div className="flex items-center gap-2 px-4 pt-2 pb-1 flex-wrap">
                      {currentContext === "debts" && (() => { const p = contextPreview as DebtPreview; return (<>
                        <span className="font-black text-sm" style={{ color: "var(--text-1)" }}>{p.person}</span>
                        <span className="text-label font-black px-2 py-0.5 rounded-lg uppercase tracking-widest" style={p.type === "debt" ? { background: "color-mix(in srgb, var(--a3) 15%, transparent)", color: "var(--a3)" } : { background: "color-mix(in srgb, var(--income) 15%, transparent)", color: "var(--income)" }}>{p.type === "debt" ? "Hutang" : "Piutang"}</span>
                        <span className="font-black text-sm ff-mono" style={{ color: p.type === "debt" ? "var(--a3)" : "var(--income)" }}>{p.amount > 0 ? `Rp ${fmtRp(p.amount)}` : "···"}</span>
                      </>); })()}
                      {currentContext === "recurring" && (() => { const p = contextPreview as RecurringPreview; return (<>
                        <span className="font-black text-sm" style={{ color: "var(--text-1)" }}>{p.note}</span>
                        <span className="text-label font-black px-2 py-0.5 rounded-lg uppercase tracking-widest" style={p.type === "income" ? { background: "color-mix(in srgb, var(--income) 15%, transparent)", color: "var(--income)" } : { background: "color-mix(in srgb, var(--a3) 15%, transparent)", color: "var(--a3)" }}>{p.type === "income" ? "Masuk" : "Keluar"}</span>
                        <span className="text-label font-black px-2 py-0.5 rounded-lg uppercase tracking-widest" style={{ background: "color-mix(in srgb, var(--a1) 15%, transparent)", color: "var(--a1)" }}>{FREQ_LABELS[p.frequency] ?? p.frequency}</span>
                        <span className="font-black text-sm ff-mono" style={{ color: "var(--text-2)" }}>{p.amount > 0 ? `Rp ${fmtRp(p.amount)}` : "···"}</span>
                      </>); })()}
                      {currentContext === "savings" && (() => { const p = contextPreview as SavingsPreview; return (<>
                        <span className="text-caption">🎯</span>
                        <span className="font-black text-sm" style={{ color: "var(--text-1)" }}>{p.name}</span>
                        <span className="text-label font-black px-2 py-0.5 rounded-lg uppercase tracking-widest" style={{ background: "color-mix(in srgb, var(--income) 15%, transparent)", color: "var(--income)" }}>Target</span>
                        <span className="font-black text-sm ff-mono" style={{ color: "var(--income)" }}>{p.target_amount > 0 ? `Rp ${fmtRp(p.target_amount)}` : "···"}</span>
                      </>); })()}
                      {currentContext === "assets" && (() => { const p = contextPreview as AssetPreview; return (<>
                        <span className="font-black text-sm" style={{ color: "var(--text-1)" }}>{p.name}</span>
                        <span className="text-label font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border" style={{ color: COND_COLORS[p.condition], background: `color-mix(in srgb, ${COND_COLORS[p.condition]} 12%, transparent)`, borderColor: `color-mix(in srgb, ${COND_COLORS[p.condition]} 25%, transparent)` }}>{COND_LABELS[p.condition]}</span>
                        {p.price > 0 && <span className="font-black text-sm ff-mono" style={{ color: "var(--a2)" }}>Rp {fmtRp(p.price)}</span>}
                      </>); })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Transaction preview */}
              <AnimatePresence>
                {!isContextMode && preview && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.12 }} className="overflow-visible">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1 flex-wrap">
                      <span className="text-label font-black px-2 py-1 rounded-lg uppercase tracking-widest"
                        style={preview.type === "income" ? { background: "color-mix(in srgb, var(--income) 15%, transparent)", color: "var(--income)" } : { background: "color-mix(in srgb, var(--a3) 15%, transparent)", color: "var(--a3)" }}>
                        {preview.type === "income" ? "Masuk" : "Keluar"}
                      </span>
                      <span className="font-black text-sm ff-mono" style={{ color: preview.type === "income" ? "var(--income)" : "var(--a3)" }}>
                        {preview.hasAmount ? `Rp ${fmtRp(preview.amount!)}` : "···"}
                      </span>
                      {preview.note && preview.note !== "-" && <span className="text-white/50 text-xs truncate max-w-[120px]">{preview.note}</span>}

                      <div className="relative ml-auto">
                        <button type="button" disabled={!canClick} onClick={() => canClick && setShowCandList(p => !p)}
                          className={`flex items-center gap-1 text-label font-black px-2.5 py-1 rounded-lg uppercase tracking-widest transition-all ${(preview.isManual || isExact || canClick) ? "active:scale-95" : "cursor-default"}`}
                          style={(preview.isManual || isExact || canClick) ? { background: "color-mix(in srgb, var(--a2) 15%, transparent)", color: "var(--a2)" } : { background: "color-mix(in srgb, var(--text-1) 8%, transparent)", color: "var(--text-3)" }}>
                          {preview.isManual ? "📌" : candidates.length > 0 ? "🤖" : ""}
                          {shownCat}
                          {canClick && <ChevronDown size={9} />}
                        </button>
                        <AnimatePresence>
                          {showCandList && canClick && (<>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60]" onClick={() => setShowCandList(false)} />
                            <motion.div initial={{ opacity: 0, y: 4, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.96 }} transition={{ duration: 0.12 }}
                              className="absolute bottom-full right-0 mb-1.5 ds-bg-2 border border-white/10 rounded-2xl shadow-2xl z-[61] overflow-hidden min-w-[140px]">
                              {candidates.map((cat, ci) => (
                                <button key={`cat-${ci}-${cat.name}`} onClick={() => { setSelCategory(cat.name); setShowCandList(false); }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-bold transition-colors flex items-center justify-between gap-3"
                                  style={shownCat === cat.name ? { color: "var(--a2)", background: "color-mix(in srgb, var(--a2) 10%, transparent)" } : { color: "var(--text-2)" }}>
                                  {cat.name}
                                  {shownCat === cat.name && <span style={{ color: "var(--a2)" }} className="text-caption">✓</span>}
                                </button>
                              ))}
                            </motion.div>
                          </>)}
                        </AnimatePresence>
                      </div>

                      {selDate !== TODAY() && (
                        <span className="text-label font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">{dateLabel(selDate)}</span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Date picker */}
              <AnimatePresence>
                {!isContextMode && showCal && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.12 }} className="overflow-hidden">
                    <div className="px-4 pb-2 pt-2 flex items-center gap-3">
                      <label className="text-label font-black text-white/40 uppercase tracking-widest shrink-0">Tanggal</label>
                      <input type="date" value={selDate} max={TODAY()} onChange={e => { setSelDate(e.target.value || TODAY()); inputRef.current?.focus(); }} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-[var(--a1)] transition-colors" />
                      {selDate !== TODAY() && (
                        <button type="button" onClick={() => { setSelDate(TODAY()); inputRef.current?.focus(); }} className="text-label font-black text-white/30 hover:text-white uppercase tracking-widest transition-colors shrink-0">Reset</button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input row */}
              <form onSubmit={handleSubmit} className={`flex items-center gap-1 px-3 py-3 transition-all ${inputError ? "animate-shake" : ""}`}>
                <button type="button" onClick={close} className="p-2 text-white/30 hover:text-white/70 rounded-xl hover:bg-white/5 transition-colors shrink-0"><X size={18} /></button>
                <input ref={inputRef} type="text" value={inputText} onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void handleSubmit(); } }}
                  placeholder={ctxConfig?.placeholder ?? "50k makan siang"}
                  autoComplete="off" autoCorrect="off" autoFocus
                  className="flex-1 bg-transparent outline-none text-sm font-bold text-white placeholder-white/25 h-10 min-w-0" />
                {!isContextMode && (
                  <button type="button" onClick={() => { setShowCal(p => !p); inputRef.current?.focus(); }}
                    className={`p-2 rounded-xl transition-all shrink-0 ${selDate !== TODAY() || showCal ? "text-amber-400 bg-amber-500/10" : "text-white/30 hover:text-white/70 hover:bg-white/5"}`}>
                    <Calendar size={17} />
                  </button>
                )}
                <button type="button" onClick={toggleVoice}
                  className={`p-2 rounded-xl transition-all shrink-0 ${isListening ? "animate-pulse" : "text-white/30 hover:text-white/70 hover:bg-white/5"}`}
                  style={isListening ? { color: "var(--a3)", background: "color-mix(in srgb, var(--a3) 10%, transparent)" } : undefined}>
                  <Mic size={17} />
                </button>
                <button type="submit" disabled={isSmartLoading || !inputText.trim() || inputText === "Mendengarkan..."}
                  className="p-2 rounded-xl transition-all shrink-0 disabled:opacity-30"
                  style={((preview || contextPreview) && !isSmartLoading) ? { background: "linear-gradient(135deg, var(--a1), var(--a2))", color: "#fff" } : { color: "var(--text-4)" }}>
                  {isSmartLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" /> : <Send size={17} />}
                </button>
              </form>

              <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={e => { e.target.value = ""; }} className="hidden" />
              <input ref={galRef} type="file" accept="image/*" onChange={e => { e.target.value = ""; }} className="hidden" />

              {/* Autocomplete chips */}
              <AnimatePresence>
                {!isContextMode && suggestions.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} className="px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto no-scrollbar">
                    {suggestions.map((s, i) => {
                      const chipKey = `${i}-${s.phrase ?? i}`;
                      return (
                        <motion.button key={chipKey}
                          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.1, delay: i * 0.04 }}
                          type="button"
                          onClick={() => {
                            if (s.isPosMode) {
                              const base = inputText.replace(/ pos .*$/i, "").trim();
                              const newText = base ? `${base} pos ${s.categoryName}` : `pos ${s.categoryName}`;
                              suppressSuggest.current = true;
                              setInputText(newText); setSelCategory(s.categoryName ?? null); setSuggestions([]);
                              setTimeout(() => { suppressSuggest.current = false; }, 400);
                              inputRef.current?.focus(); return;
                            }
                            const { amount } = tokenizeInput(inputText);
                            const useAmt = amount || s.typicalAmount;
                            const filled = useAmt ? `${useAmt >= 1000 ? Math.round(useAmt / 1000) + "k" : useAmt} ${s.phrase}` : s.phrase;
                            suppressSuggest.current = true;
                            setInputText(filled); setSelCategory(s.categoryName ?? null); setSuggestions([]);
                            setTimeout(() => { suppressSuggest.current = false; }, 400);
                            inputRef.current?.focus();
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 active:scale-95 rounded-xl text-caption font-black whitespace-nowrap transition-all shrink-0 border"
                          style={{ background: "color-mix(in srgb, var(--a2) 12%, transparent)", borderColor: "color-mix(in srgb, var(--a2) 20%, transparent)", color: "var(--a2)" }}>
                          {s.isPosMode ? <span style={{ color: "var(--a2)" }} className="font-black">{s.displayLabel}</span> : <span>{s.phrase}</span>}
                          {!s.isPosMode && s.typicalAmount != null && (
                            <span className="text-amber-300/70">· {s.typicalAmount >= 1000000 ? `${(s.typicalAmount / 1000000).toFixed(1)}jt` : s.typicalAmount >= 1000 ? `${Math.round(s.typicalAmount / 1000)}k` : s.typicalAmount}</span>
                          )}
                          {!s.isPosMode && s.categoryName && <span style={{ color: "var(--a1)", opacity: 0.7 }}>· {s.categoryName}</span>}
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
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                      className="text-label font-black mb-1.5" style={{ color: "var(--a3)" }}>
                      ⚠ Format: <span className="text-white/60">50k makan siang</span> atau <span className="text-white/60">in 5jt gaji</span>
                    </motion.p>
                  )}
                </AnimatePresence>
                {isContextMode ? (
                  <p className="text-label text-white/20 font-bold">
                    {currentContext === "debts"     && "cth: hutang ke Budi 500rb · piutang dari Ani 1jt"}
                    {currentContext === "recurring" && "cth: Netflix 59rb bulanan · gaji 5jt bulanan"}
                    {currentContext === "savings"   && "cth: nabung laptop 5jt · target HP baru 2jt"}
                    {currentContext === "assets"    && "cth: Laptop Dell 8jt baru · iPhone 15jt"}
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
