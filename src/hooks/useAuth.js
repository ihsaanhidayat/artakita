"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

const IDLE_TIMEOUT   = 30 * 60 * 1000; // 30 menit
const WARNING_BEFORE = 5  * 60 * 1000; // Warning 5 menit sebelum logout

/**
 * useAuth — Session management lengkap
 * - Auto-logout setelah 30 menit idle
 * - Warning 5 menit sebelum logout
 * - Clean logout tanpa stuck loading
 * - Token refresh handling
 */
export function useAuth() {
  const [session, setSession]                     = useState(null);
  const [isAuthLoading, setIsAuthLoading]         = useState(true); // true saat init
  const [authError, setAuthError]                 = useState("");
  const [authUsername, setAuthUsername]            = useState("");
  const [authPassword, setAuthPassword]           = useState("");
  const [loginAttempts, setLoginAttempts]          = useState(0);
  const [isLocked, setIsLocked]                    = useState(false);
  const [sessionWarning, setSessionWarning]        = useState(false); // warning sebelum logout
  const [forcePasswordModal, setForcePasswordModal] = useState({
    isOpen: false,
    newPassword: "",
  });

  const idleTimerRef    = useRef(null);
  const warningTimerRef = useRef(null);
  const isLoggingOut    = useRef(false);

  // ── Clean logout — bersihkan semua state lalu redirect ─────────────────
  const cleanLogout = useCallback(async (silent = false) => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    // 1. Clear timers
    clearTimeout(idleTimerRef.current);
    clearTimeout(warningTimerRef.current);

    // 2. Clear storage
    localStorage.removeItem("arta_active_wallet");
    localStorage.removeItem("arta_trx_cache");
    localStorage.removeItem("arta_pending_queue");
    sessionStorage.removeItem("arta_last_tab");

    // 3. Sign out dari Supabase
    try { await supabase.auth.signOut(); } catch {}

    // 4. Reset semua state SEBELUM reload
    setSession(null);
    setSessionWarning(false);
    setAuthError("");
    setIsAuthLoading(false);

    isLoggingOut.current = false;

    // 5. Jika bukan silent → reload
    if (!silent) {
      window.location.replace(window.location.pathname);
    }
  }, []);

  // ── Session listener ──────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (s) {
          setSession(s);
          checkProfileStatus(s.user.id);
        } else {
          setSession(null);
        }
      } catch {
        if (mounted) setSession(null);
      } finally {
        if (mounted) setIsAuthLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted || isLoggingOut.current) return;

        if (event === "SIGNED_OUT") {
          setSession(null);
          setIsAuthLoading(false);
          return;
        }

        if (event === "TOKEN_REFRESHED") {
          if (newSession) {
            setSession(newSession);
          } else {
            // Refresh gagal → force logout bersih
            cleanLogout(true);
          }
          return;
        }

        if (newSession) {
          setSession(newSession);
          checkProfileStatus(newSession.user.id);
        } else if (event !== "INITIAL_SESSION") {
          setSession(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [cleanLogout]);

  // ── Idle timer + warning ──────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;

    const startTimers = () => {
      clearTimeout(idleTimerRef.current);
      clearTimeout(warningTimerRef.current);
      setSessionWarning(false);

      // Warning 5 menit sebelum logout
      warningTimerRef.current = setTimeout(() => {
        setSessionWarning(true);
      }, IDLE_TIMEOUT - WARNING_BEFORE);

      // Logout setelah idle timeout
      idleTimerRef.current = setTimeout(() => {
        cleanLogout();
      }, IDLE_TIMEOUT);
    };

    const resetOnActivity = () => {
      if (sessionWarning) setSessionWarning(false);
      startTimers();
    };

    const events = ["mousemove", "keydown", "scroll", "click", "touchstart"];
    events.forEach(ev => window.addEventListener(ev, resetOnActivity, { passive: true }));
    startTimers();

    return () => {
      clearTimeout(idleTimerRef.current);
      clearTimeout(warningTimerRef.current);
      events.forEach(ev => window.removeEventListener(ev, resetOnActivity));
    };
  }, [session, cleanLogout, sessionWarning]);

  // ── Extend session — user klik "Lanjutkan" di warning ─────────────────
  const extendSession = useCallback(() => {
    setSessionWarning(false);
    // Timer akan di-reset otomatis oleh useEffect di atas
  }, []);

  // ── Check profile ─────────────────────────────────────────────────────
  const checkProfileStatus = async (userId) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", userId)
        .single();
      if (data?.must_change_password) {
        setForcePasswordModal({ isOpen: true, newPassword: "" });
      }
    } catch {}
  };

  // ── Login — tanpa reload, update state langsung ───────────────────────
  const handleLogin = useCallback(async (e) => {
    e?.preventDefault();
    if (isLocked) {
      setAuthError("Terlalu banyak percobaan. Silakan tunggu 30 detik.");
      return;
    }

    setIsAuthLoading(true);
    setAuthError("");

    const raw   = authUsername.trim().toLowerCase();
    const email = raw.includes("@") ? raw : `${raw}@artakita.internal`;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: authPassword,
      });

      if (error) {
        const next = loginAttempts + 1;
        setLoginAttempts(next);
        if (next >= 3) {
          setIsLocked(true);
          setAuthError("Akses dibekukan sementara karena salah password 3 kali.");
          setTimeout(() => {
            setIsLocked(false);
            setLoginAttempts(0);
            setAuthError("");
          }, 30000);
        } else {
          setAuthError(`Password salah! (Sisa percobaan: ${3 - next})`);
        }
        setIsAuthLoading(false);
      } else {
        // Login berhasil — session langsung di-set oleh onAuthStateChange
        // Reload untuk memastikan semua state fresh
        window.location.replace(window.location.pathname);
      }
    } catch (err) {
      setAuthError("Gagal login: " + err.message);
      setIsAuthLoading(false);
    }
  }, [authUsername, authPassword, isLocked, loginAttempts]);

  // ── Logout ────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => cleanLogout(), [cleanLogout]);

  // ── Force change password ─────────────────────────────────────────────
  const handleForceChangePassword = useCallback(async (e) => {
    e?.preventDefault();
    if (forcePasswordModal.newPassword.length < 6) {
      setAuthError("Password baru minimal 6 karakter!");
      return;
    }

    setIsAuthLoading(true);
    try {
      const { error: authErr } = await supabase.auth.updateUser({
        password: forcePasswordModal.newPassword,
      });

      if (authErr) {
        setAuthError("Gagal update password: " + authErr.message);
        setIsAuthLoading(false);
        return;
      }

      await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", session.user.id);

      setForcePasswordModal({ isOpen: false, newPassword: "" });
      setAuthError("");
    } catch (err) {
      setAuthError("Gagal: " + err.message);
    } finally {
      setIsAuthLoading(false);
    }
  }, [forcePasswordModal, session]);

  return {
    session,
    isAuthLoading,
    authError,     setAuthError,
    authUsername,   setAuthUsername,
    authPassword,  setAuthPassword,
    isLocked,
    sessionWarning,    // true = warning muncul
    extendSession,     // user klik "Lanjutkan"
    forcePasswordModal, setForcePasswordModal,
    handleLogin,
    handleLogout,
    handleForceChangePassword,
  };
}
