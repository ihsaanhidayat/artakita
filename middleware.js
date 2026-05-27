import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  // 1. Inisialisasi Response
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 2. Inisialisasi Supabase Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse = NextResponse.next({ request })
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 3. Cek Sesi (ambil session DAN error)
  const { data: { session }, error } = await supabase.auth.getSession()

  // 4. Penanganan Error (Jika token invalid)
  if (error) {
    console.error("Token tidak valid, sesi dianggap tidak ada:", error.message);
    // Kita tidak perlu redirect paksa di sini, 
    // biarkan aplikasi menganggap tidak ada sesi (session = null)
  }

  // 5. Logika Redirect (Opsional)
  // Karena Anda sudah menghapus halaman /login dan menggabungkan semuanya di '/',
  // Anda tidak perlu melakukan redirect di sini.
  // Biarkan middleware mengembalikan respon apa adanya.

  return supabaseResponse
}

// Konfigurasi tetap sama
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}