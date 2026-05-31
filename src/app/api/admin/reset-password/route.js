import { NextResponse } from 'next/server';
import { verifyAdmin, getAdminClient } from '../auth';

export async function POST(request) {
  try {
    const { userId, newPassword } = await request.json();
    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'userId dan newPassword wajib diisi' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    const auth = await verifyAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabaseAdmin } = auth;

    // Reset password
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (authError) throw authError;

    // Tandai must_change_password agar user ganti saat login berikutnya
    await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', userId);

    return NextResponse.json({ success: true, message: 'Password berhasil direset.' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
