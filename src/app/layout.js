import { Inter } from "next/font/google";
import "./globals.css";

// Memuat font Inter dengan subset latin
const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning={true}>
      <body>{children}</body>
    </html>
  );
}

export const viewport = {
  themeColor: '#0a0f1c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = {
  title: 'ArtaKita',
  description: 'Aplikasi Manajemen Keuangan Pribadi & Bersama',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ArtaKita',
  },
};