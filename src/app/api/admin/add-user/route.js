import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const email = `${username.trim().toLowerCase()}@artakita.internal`;

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) throw error;

    return NextResponse.json({ success: true, message: "User berhasil dibuat!" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
