"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * useAuth — Hook untuk semua logika autentikasi
 *
 * Menangani:
 * - Session management
 * - Login / Logout
 * - Force change password
 * - Auto-logout setelah 30 menit idle
 * - Profile status check
 */
export function useAuth() {
  const [session, setSession]                   = useState(null);
  const [isAuthLoading, setIsAuthLoading]       = useState(false);
  const [authError, setAuthError]               = useState("");
  const [authUsername, setAuthUsername]         = useState("");
  const [authPassword, setAuthPassword]         = useState("");
  const [loginAttempts, setLoginAttempts]       = useState(0);
  const [isLocked, setIsLocked]                 = useState(false);
  const [forcePasswordModal, setForcePasswordModal] = useState({
    isOpen: false,
    newPassword: "",
  });

  // ── Session listener ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkProfileStatus(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) checkProfileStatus(session.user.id);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Auto-logout setelah 30 menit idle ────────────────────────────────────
  useEffect(() => {
    if (!session) return;

    let timeoutId;
    const MAX_IDLE = 30 * 60 * 1000;

    const handleIdleLogout = async () => {
      await supabase.auth.signOut();
      localStorage.removeItem("arta_active_wallet");
      window.location.reload();
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleIdleLogout, MAX_IDLE);
    };

    const events = ["mousemove", "keydown", "scroll", "click", "touchstart"];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [session]);

  // ── Check profile: apakah harus ganti password ───────────────────────────
  const checkProfileStatus = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", userId)
        .single();
      if (error) throw error;
      if (data?.must_change_password) {
        setForcePasswordModal({ isOpen: true, newPassword: "" });
      }
    } catch (err) {
      console.error("Gagal cek profil:", err.message);
    }
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLocked) {
      setAuthError("Terlalu banyak percobaan. Silakan tunggu 30 detik.");
      return;
    }

    setIsAuthLoading(true);
    setAuthError("");

    const raw   = authUsername.trim().toLowerCase();
    const email = raw.includes("@") ? raw : `${raw}@artakita.internal`;

    const { error } = await supabase.auth.signInWithPassword({
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
      window.location.reload();
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("arta_active_wallet");
    window.location.reload();
  };

  // ── Force change password ─────────────────────────────────────────────────
  const handleForceChangePassword = async (e) => {
    e.preventDefault();
    if (forcePasswordModal.newPassword.length < 6) {
      setAuthError("Password baru minimal 6 karakter!");
      return;
    }

    setIsAuthLoading(true);
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
    setIsAuthLoading(false);
  };

  return {
    session,
    isAuthLoading,
    authError,     setAuthError,
    authUsername,  setAuthUsername,
    authPassword,  setAuthPassword,
    isLocked,
    forcePasswordModal, setForcePasswordModal,
    handleLogin,
    handleLogout,
    handleForceChangePassword,
  };
}
