"use client";
import { useState, useCallback } from "react";

const LANG_KEY = "arta_lang";

/**
 * useLanguage — Hook untuk membaca dan mengganti bahasa
 * Menyimpan ke localStorage dan trigger re-render
 */
export function useLanguage() {
  const [lang, setLangState] = useState(() => {
    if (typeof window === "undefined") return "id";
    return localStorage.getItem(LANG_KEY) || "id";
  });

  const setLang = useCallback((newLang) => {
    if (!["id", "en"].includes(newLang)) return;
    localStorage.setItem(LANG_KEY, newLang);
    setLangState(newLang);
    // Force re-render seluruh app dengan reload ringan
    // Constants dibaca ulang dari localStorage saat module re-evaluate
    window.location.reload();
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "id" ? "en" : "id");
  }, [lang, setLang]);

  return { lang, setLang, toggleLang, isID: lang === "id", isEN: lang === "en" };
}
