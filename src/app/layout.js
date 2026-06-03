import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning={true}>
      <head>
        {/* iOS PWA fullscreen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ArtaKita" />
        <link rel="apple-touch-icon" href="/artakita.png" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}

export const viewport = {
  themeColor: "#0a0f1c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata = {
  title: "ArtaKita",
  description: "Aplikasi Manajemen Keuangan Pribadi & Bersama",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ArtaKita",
  },
};
