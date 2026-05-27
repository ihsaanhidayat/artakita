import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    // 1. Gunakan Master Key agar Anda tidak ter-logout
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 2. Format username menjadi email internal
    const email = `${username.toLowerCase().trim()}@artakita.internal`;

    // 3. Buat User langsung ke Auth Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Langsung aktif
    });

    if (authError) throw authError;

    // 4. (Opsional) Paksa user baru mengganti password saat login pertama kali
    await supabaseAdmin.from('profiles')
      .update({ must_change_password: true })
      .eq('id', authData.user.id);

    return NextResponse.json({ success: true, message: "User berhasil dibuat!" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}