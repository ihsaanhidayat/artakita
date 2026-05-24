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