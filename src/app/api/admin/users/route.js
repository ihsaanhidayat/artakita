import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verifikasi token dari header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verifikasi token via Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Cek role admin di profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Ambil semua user
    const { data: authData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const internalUsers = authData.users.filter(u =>
      u.email?.endsWith('@artakita.internal')
    );

    const userIds = internalUsers.map(u => u.id);
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, username, role, must_change_password, created_at')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

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
