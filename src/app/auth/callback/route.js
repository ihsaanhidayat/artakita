import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Mengarahkan kembali ke dashboard setelah login sukses
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = new Map() // Untuk storage sementara
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return request.cookies.get(name)?.value },
          set(name, value, options) { }, // Tidak dipakai di sini, gunakan NextResponse
          remove(name, options) { },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`)
      return response
    }
  }

  // Jika error, kembali ke halaman login
  return NextResponse.redirect(`${origin}/login`)
}