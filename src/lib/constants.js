// ============================================================
// ARTAKITA — LANGUAGE SWITCHER
// Baca preferensi bahasa dari localStorage, default: "id"
// Ganti bahasa → langsung berlaku tanpa reload/logout
// ============================================================

import * as ID from "./constants.id";
import * as EN from "./constants.en";

// Detect bahasa aktif — server-safe (localStorage hanya di client)
const getLang = () => {
  if (typeof window === "undefined") return "id";
  return localStorage.getItem("arta_lang") || "id";
};

const C = getLang() === "en" ? EN : ID;

export const APP_NAME    = C.APP_NAME;
export const APP_TAGLINE = C.APP_TAGLINE;
export const APP_VERSION = C.APP_VERSION;
export const APP_AUTHOR  = C.APP_AUTHOR;

export const NAV       = C.NAV;
export const HOME      = C.HOME;
export const WALLET    = C.WALLET;
export const STATS     = C.STATS;
export const FINANCE   = C.FINANCE;
export const DEBT      = C.DEBT;
export const ASSET     = C.ASSET;
export const RECURRING = C.RECURRING;
export const MORE      = C.MORE;
export const ABOUT     = C.ABOUT;
export const FORM      = C.FORM;
export const LOGIN     = C.LOGIN;
export const TOAST     = C.TOAST;
export const CONFIRM   = C.CONFIRM;
export const CMD       = C.CMD;
export const LANG      = C.LANG;
