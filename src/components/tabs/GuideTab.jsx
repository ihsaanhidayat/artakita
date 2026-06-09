"use client";
import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
 BookOpen, ChevronDown,
 Home, BarChart3, Landmark, MoreHorizontal,
 Wallet,
 Zap, WifiOff, Star
} from "lucide-react";
import { GUIDE, MORE } from "@/lib/constants";

// Visual metadata only — translatable content comes from GUIDE.SECTIONS
const SECTION_META = [
 { id: "mulai",     icon: Star,         color: "var(--a3)",      bg: "color-mix(in srgb, var(--a3) 8%, transparent)" },
 { id: "beranda",   icon: Home,         color: "var(--a1)",      bg: "color-mix(in srgb, var(--a1) 8%, transparent)" },
 { id: "statistik", icon: BarChart3,    color: "var(--a2)",      bg: "color-mix(in srgb, var(--a2) 8%, transparent)" },
 { id: "keuangan",  icon: Landmark,     color: "var(--income)",  bg: "color-mix(in srgb, var(--income) 8%, transparent)" },
 { id: "lainnya",   icon: MoreHorizontal, color: "var(--text-2)", bg: "color-mix(in srgb, var(--text-2) 8%, transparent)" },
 { id: "dompet",    icon: Wallet,       color: "var(--a1)",      bg: "color-mix(in srgb, var(--a1) 8%, transparent)" },
 { id: "offline",   icon: WifiOff,      color: "var(--a3)",      bg: "color-mix(in srgb, var(--a3) 8%, transparent)" },
 { id: "tips",      icon: Zap,          color: "var(--a2)",      bg: "color-mix(in srgb, var(--a2) 8%, transparent)" },
];

const SECTIONS = SECTION_META.map(m => ({ ...m, ...GUIDE.SECTIONS[m.id] }));

// ── Accordion Item ────────────────────────────────────────────────────────────
const AccordionItem = memo(function AccordionItem({ item }) {
 const [isOpen, setIsOpen] = useState(false);

 return (
 <div className="border-b ds-border last:border-0">
 <button
  onClick={() => setIsOpen(!isOpen)}
  className="w-full flex items-start justify-between py-3.5 text-left gap-3"
 >
  <p className={`text-sm font-bold transition-colors ${isOpen ? "ds-aurora-text" : "ds-t1"}`}>
  {item.q}
  </p>
  <motion.div
  animate={{ rotate: isOpen ? 180 : 0 }}
  transition={{ duration: 0.2 }}
  className="shrink-0 mt-0.5"
  >
  <ChevronDown size={16} className="ds-t3" />
  </motion.div>
 </button>

 <AnimatePresence initial={false}>
  {isOpen && (
  <motion.div
   initial={{ height: 0, opacity: 0 }}
   animate={{ height: "auto", opacity: 1 }}
   exit={{ height: 0, opacity: 0 }}
   transition={{ duration: 0.2, ease: "easeInOut" }}
   className="overflow-hidden"
  >
   <p className="text-sm ds-t2 pb-4 leading-relaxed whitespace-pre-line">
   {item.a}
   </p>
  </motion.div>
  )}
 </AnimatePresence>
 </div>
 );
});

// ── Section ───────────────────────────────────────────────────────────────────
const Section = memo(function Section({ section }) {
 const [isOpen, setIsOpen] = useState(false);

 return (
 <motion.div
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  className="ds-bg-1 rounded-[24px] border ds-border shadow-sm overflow-hidden"
 >
  <button
  onClick={() => setIsOpen(!isOpen)}
  className="w-full flex items-center gap-3 p-5 text-left"
  >
  <div
   style={{ background: section.bg }}
   className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
  >
   <section.icon size={18} style={{ color: section.color }} />
  </div>
  <div className="flex-1">
   <p className="font-black text-sm ds-t1">{section.title}</p>
   <p className="text-label ds-t3 mt-0.5">{GUIDE.TOPICS(section.items.length)}</p>
  </div>
  <motion.div
   animate={{ rotate: isOpen ? 180 : 0 }}
   transition={{ duration: 0.25 }}
   className="ds-t3 shrink-0"
  >
   <ChevronDown size={18} />
  </motion.div>
  </button>

  <AnimatePresence initial={false}>
  {isOpen && (
   <motion.div
   initial={{ height: 0, opacity: 0 }}
   animate={{ height: "auto", opacity: 1 }}
   exit={{ height: 0, opacity: 0 }}
   transition={{ duration: 0.25, ease: "easeInOut" }}
   className="overflow-hidden"
   >
   <div className="px-5 pb-2 border-t ds-border">
    {section.items.map((item, i) => (
    <AccordionItem key={i} item={item} />
    ))}
   </div>
   </motion.div>
  )}
  </AnimatePresence>
 </motion.div>
 );
});

// ── Main ──────────────────────────────────────────────────────────────────────
const GuideTab = memo(function GuideTab({ onBack }) {
 return (
 <motion.div
  initial={{ opacity: 0, x: 40 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: 40 }}
  transition={{ type: "spring", stiffness: 400, damping: 35 }}
  className="fixed inset-0 z-[90] ds-bg-0 overflow-y-auto no-scrollbar"
 >
  <div className="w-full max-w-lg mx-auto pt-8 px-3 pb-32">

  {/* Breadcrumb */}
  <div className="flex items-center justify-between mb-6">
   <span className="text-caption font-black ds-t3 uppercase tracking-widest">{MORE.PANDUAN}</span>
   <button
   onClick={onBack}
   className="flex items-center gap-1.5 ds-aurora-text hover:ds-aurora-text active:scale-95 transition-all ds-aurora-bg border ds-aurora-border-c px-3 py-1.5 rounded-xl"
   >
   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
   <span className="text-label font-black uppercase tracking-widest">{MORE.TITLE}</span>
   </button>
  </div>

  {/* Header */}
  <div
   className="rounded-[28px] p-6 mb-6 relative overflow-hidden"
   style={{
   background: "linear-gradient(135deg, var(--a1), var(--a2))",
   boxShadow: "0 20px 60px color-mix(in srgb, var(--a1) 20%, transparent)"
   }}
  >
   <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10 blur-2xl" />
   <div className="relative z-10">
   <div className="flex items-center gap-2 mb-2">
    <BookOpen size={20} className="text-white" />
    <p className="text-white/80 text-caption font-black uppercase tracking-widest">{GUIDE.PAGE_TITLE}</p>
   </div>
   <h2 className="text-2xl font-black text-white tracking-tight mb-1">ArtaKita.</h2>
   <p className="text-white/70 text-xs font-bold">{GUIDE.PAGE_SUBTITLE}</p>
   </div>
  </div>

  {/* Quick start banner */}
  <div className="ds-aurora-bg border ds-aurora-border-c rounded-[20px] p-4 mb-5 flex items-start gap-3">
   <Zap size={16} style={{ color: "var(--a1)" }} className="shrink-0 mt-0.5" />
   <div>
   <p className="text-caption font-black ds-aurora-text uppercase tracking-widest mb-1">{GUIDE.QUICK_START_TITLE}</p>
   <p className="text-xs font-bold ds-t1 leading-relaxed">
    {(() => {
    const full = GUIDE.QUICK_START_TEXT(GUIDE.QUICK_START_A, GUIDE.QUICK_START_B);
    const [pre, rest] = full.split(GUIDE.QUICK_START_A);
    const [mid, post] = rest.split(GUIDE.QUICK_START_B);
    return <>{pre}<span className="font-black ds-aurora-text">{GUIDE.QUICK_START_A}</span>{mid}<span className="font-black ds-aurora-text">{GUIDE.QUICK_START_B}</span>{post}</>;
    })()}
   </p>
   </div>
  </div>

  {/* Sections */}
  <div className="space-y-3">
   {SECTIONS.map(section => (
   <Section key={section.id} section={section} />
   ))}
  </div>

  {/* Footer */}
  <div className="text-center mt-8 space-y-1">
   <p className="text-caption ds-t3 font-bold">
   ArtaKita v2.0.0
   </p>
   <p className="text-label ds-t3">
   {MORE.BY_AUTHOR}
   </p>
  </div>
  </div>
 </motion.div>
 );
});

export default GuideTab;
