import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Verifikasi caller adalah admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Ambil semua user dari auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    // Filter hanya user internal ArtaKita
    const internalUsers = authData.users.filter(u =>
      u.email?.endsWith('@artakita.internal')
    );

    // Ambil profile data untuk semua user
    const userIds = internalUsers.map(u => u.id);
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, username, role, must_change_password, created_at')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Gabungkan data auth + profile
    const users = internalUsers.map(u => ({
      id:                   u.id,
      username:             u.email.split('@')[0],
      email:                u.email,
      role:                 profileMap.get(u.id)?.role || 'user',
      must_change_password: profileMap.get(u.id)?.must_change_password || false,
      created_at:           u.created_at,
      last_sign_in_at:      u.last_sign_in_at,
      banned:               u.banned_until ? new Date(u.banned_until) > new Date() : false,
      banned_until:         u.banned_until || null,
    }));

    return NextResponse.json({ success: true, users });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
