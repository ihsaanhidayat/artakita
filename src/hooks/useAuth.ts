"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import type { ForcePasswordModalState, UseAuthReturn } from "@/types";

const IDLE_TIMEOUT   = 30 * 60 * 1000;
const WARNING_BEFORE = 5  * 60 * 1000;

export function useAuth(): UseAuthReturn {
  const [session, setSession]                       = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading]           = useState(true);
  const [authError, setAuthError]                   = useState("");
  const [authUsername, setAuthUsername]             = useState("");
  const [authPassword, setAuthPassword]             = useState("");
  const [loginAttempts, setLoginAttempts]           = useState(0);
  const [isLocked, setIsLocked]                     = useState(false);
  const [sessionWarning, setSessionWarning]         = useState(false);
  const [forcePasswordModal, setForcePasswordModal] = useState<ForcePasswordModalState>({
    isOpen: false,
    newPassword: "",
  });

  const idleTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoggingOut    = useRef(false);

  const cleanLogout = useCallback(async (silent = false): Promise<void> => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    try {
      localStorage.removeItem("arta_active_wallet");
      localStorage.removeItem("arta_trx_cache");
      localStorage.removeItem("arta_pending_queue");
      sessionStorage.removeItem("arta_last_tab");
    } catch {}

    try { await supabase.auth.signOut(); } catch {}

    setSession(null);
    setSessionWarning(false);
    setAuthError("");
    setIsAuthLoading(false);

    isLoggingOut.current = false;

    if (!silent) {
      window.location.replace(window.location.pathname);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initSession = async (): Promise<void> => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (s) {
          setSession(s);
          void checkProfileStatus(s.user.id);
        } else {
          setSession(null);
        }
      } catch {
        if (mounted) setSession(null);
      } finally {
        if (mounted) setIsAuthLoading(false);
      }
    };

    void initSession();

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
            void cleanLogout(true);
          }
          return;
        }

        if (newSession) {
          setSession(newSession);
          void checkProfileStatus(newSession.user.id);
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

  useEffect(() => {
    if (!session) return;

    const startTimers = (): void => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setSessionWarning(false);

      warningTimerRef.current = setTimeout(() => {
        setSessionWarning(true);
      }, IDLE_TIMEOUT - WARNING_BEFORE);

      idleTimerRef.current = setTimeout(() => {
        void cleanLogout();
      }, IDLE_TIMEOUT);
    };

    const resetOnActivity = (): void => {
      if (sessionWarning) setSessionWarning(false);
      startTimers();
    };

    const events = ["mousemove", "keydown", "scroll", "click", "touchstart"] as const;
    events.forEach(ev => window.addEventListener(ev, resetOnActivity, { passive: true }));
    startTimers();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      events.forEach(ev => window.removeEventListener(ev, resetOnActivity));
    };
  }, [session, cleanLogout, sessionWarning]);

  const extendSession = useCallback((): void => {
    setSessionWarning(false);
  }, []);

  async function checkProfileStatus(userId: string): Promise<void> {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", userId)
        .single();
      if ((data as { must_change_password?: boolean } | null)?.must_change_password) {
        setForcePasswordModal({ isOpen: true, newPassword: "" });
      }
    } catch {}
  }

  const handleLogin = useCallback(async (e?: React.FormEvent): Promise<void> => {
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
      const { error } = await supabase.auth.signInWithPassword({ email, password: authPassword });

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
        window.location.replace(window.location.pathname);
      }
    } catch (err) {
      setAuthError("Gagal login: " + (err as Error).message);
      setIsAuthLoading(false);
    }
  }, [authUsername, authPassword, isLocked, loginAttempts]);

  const handleLogout = useCallback((): void => { void cleanLogout(); }, [cleanLogout]);

  const handleForceChangePassword = useCallback(async (e?: React.FormEvent): Promise<void> => {
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

      if (session?.user?.id) {
        await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("id", session.user.id);
      }

      setForcePasswordModal({ isOpen: false, newPassword: "" });
      setAuthError("");
    } catch (err) {
      setAuthError("Gagal: " + (err as Error).message);
    } finally {
      setIsAuthLoading(false);
    }
  }, [forcePasswordModal, session]);

  return {
    session,
    isAuthLoading,
    authError,     setAuthError,
    authUsername,  setAuthUsername,
    authPassword,  setAuthPassword,
    isLocked,
    sessionWarning,
    extendSession,
    forcePasswordModal, setForcePasswordModal,
    handleLogin,
    handleLogout,
    handleForceChangePassword,
  };
}
