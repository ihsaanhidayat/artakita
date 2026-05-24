import React from 'react';
import { useTheme } from './useTheme'; // Sesuaikan path-nya

export default function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header-fixed">
      <div className="header-container">
        {/* Logo atau Nama Aplikasi */}
        <h1 className="logo">ArtaKita</h1>
        
        {/* Tombol Ganti Tema */}
        <button onClick={toggleTheme} className="theme-toggle-btn">
          {theme === 'light' ? '🌙 Gelap' : '☀️ Terang'}
        </button>
      </div>
    </header>
  );
}