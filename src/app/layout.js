import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
 subsets: ["latin"],
 variable: "--ff-sans",
 display: "swap",
});
const dmMono = DM_Mono({
 subsets: ["latin"],
 weight: ["300", "400"],
 variable: "--ff-mono",
 display: "swap",
});

export const viewport = {
 width: "device-width",
 initialScale: 1,
 maximumScale: 1,
 userScalable: false,
 viewportFit: "cover",
};

export const metadata = {
 title: "ArtaKita",
 description: "Finance management with AI",
 manifest: "/manifest.json",
 appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ArtaKita" },
};

export default function RootLayout({ children }) {
 return (
  <html lang="id" className="dark" suppressHydrationWarning>
   <body className={`${dmSans.variable} ${dmMono.variable}`} style={{ background: "#000", color: "rgba(255,255,255,0.95)", fontFamily: "var(--ff-sans)" }}>
    {children}
   </body>
  </html>
 );
}
