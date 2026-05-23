import './globals.css';

export const metadata = {
  title: 'ArtaKita - Buku Kas Dinamis',
  description: 'Pencatatan keuangan rumah tangga super cepat.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="antialiased" suppressHydrationWarning>
      <head>
        {/* Suntikan Font & Ikon seperti di file HTML pertama kita */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        {/* Pustaka Utama Tailwind CSS standalone script */}
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
              darkMode: 'class',
              theme: {
                extend: {
                  fontFamily: { sans: ['Inter', 'sans-serif'] }
                }
              }
            }
          `
        }} />
      </head>
      <body className="m-0 p-0 overflow-x-hidden bg-gray-100 dark:bg-gray-950 transition-colors duration-300" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}