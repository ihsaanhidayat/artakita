import { NextResponse } from 'next/server';
import { verifyAdmin, getAdminClient } from '../auth';

export async function POST(request) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabaseAdmin } = auth;

    const { username, password } = await request.json();

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
