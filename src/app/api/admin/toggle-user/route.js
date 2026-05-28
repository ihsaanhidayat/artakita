import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId, action } = await request.json();
    // action: 'ban' | 'unban'
    if (!userId || !action) {
      return NextResponse.json({ error: 'userId dan action wajib diisi' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const updateData = action === 'ban'
      ? { banned_until: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString() } // 100 tahun = permanen
      : { banned_until: null };

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);
    if (error) throw error;

    const msg = action === 'ban' ? 'User berhasil dinonaktifkan.' : 'User berhasil diaktifkan kembali.';
    return NextResponse.json({ success: true, message: msg });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
