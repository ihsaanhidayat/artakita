import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState('light');

  // Mengecek tema yang tersimpan saat aplikasi pertama kali dimuat
  useEffect(() => {
    const savedTheme = localStorage.getItem('artakita-theme') || 'light';
    setTheme(savedTheme);
    
    // Menerapkan tema ke tag paling luar (html/body)
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, []);

  // Fungsi untuk mengubah tema
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('artakita-theme', newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  };

  return { theme, toggleTheme };
}