import { NextResponse } from 'next/server';
import { verifyAdmin, getAdminClient } from '../auth';

export async function DELETE(request) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId wajib diisi' }, { status: 400 });

    const auth = await verifyAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabaseAdmin } = auth;

    // Hapus dari auth (cascade ke profiles via FK jika ada)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'User berhasil dihapus.' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
