"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100dvh", gap: 16, padding: 24,
      background: "#000", color: "rgba(255,255,255,0.9)", fontFamily: "sans-serif",
    }}>
      <h1 style={{ fontSize: 20, fontWeight: 300, letterSpacing: -1, margin: 0 }}>ArtaKita.</h1>
      <p style={{ fontSize: 14, opacity: 0.45, textAlign: "center", maxWidth: 280, margin: 0 }}>
        {error.message || "Terjadi kesalahan tak terduga."}
      </p>
      <button onClick={reset} style={{
        marginTop: 8, padding: "12px 28px", borderRadius: 14,
        background: "linear-gradient(135deg,#22d3ee,#a855f7)",
        color: "#fff", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em",
        textTransform: "uppercase", border: "none", cursor: "pointer",
      }}>
        Coba Lagi
      </button>
    </div>
  );
}
