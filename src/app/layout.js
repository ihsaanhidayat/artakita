import { Inter } from "next/font/google";
import "./globals.css";

// Memuat font Inter dengan subset latin
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: 'ArtaKita',
  description: 'Sistem Ledger AI',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning={true}>
      <body>{children}</body>
    </html>
  );
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f1c' },
  ],
};