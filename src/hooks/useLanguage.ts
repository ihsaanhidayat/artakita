"use client";
import { useState, useCallback } from "react";
import type { UseLanguageReturn } from "@/types";

const LANG_KEY = "arta_lang";

export function useLanguage(): UseLanguageReturn {
  const [lang, setLangState] = useState<"id" | "en">(() => {
    if (typeof window === "undefined") return "id";
    return (localStorage.getItem(LANG_KEY) as "id" | "en") || "id";
  });

  const setLang = useCallback((newLang: "id" | "en"): void => {
    if (!["id", "en"].includes(newLang)) return;
    localStorage.setItem(LANG_KEY, newLang);
    setLangState(newLang);
    window.location.reload();
  }, []);

  const toggleLang = useCallback((): void => {
    setLang(lang === "id" ? "en" : "id");
  }, [lang, setLang]);

  return { lang, setLang, toggleLang, isID: lang === "id", isEN: lang === "en" };
}
