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

    // ── Agregasi aktivitas dari transaksi (jendela 30 hari terakhir) ──
    // Service-role bypass RLS → bisa baca transaksi semua user.
    const now       = Date.now();
    const since30d  = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const start7d    = now - 7 * 24 * 60 * 60 * 1000;

    const { data: trx } = await supabaseAdmin
      .from('transactions')
      .select('user_id, created_at')
      .gte('created_at', since30d)
      .order('created_at', { ascending: false })
      .limit(10000);

    // user_id → { last, today, week, month }
    const activity = new Map();
    for (const t of (trx || [])) {
      if (!t.user_id) continue;
      let a = activity.get(t.user_id);
      if (!a) { a = { last: t.created_at, today: 0, week: 0, month: 0 }; activity.set(t.user_id, a); }
      // Data sudah descending → entri pertama = aktivitas terakhir
      const ts = new Date(t.created_at).getTime();
      a.month++;
      if (ts >= start7d)              a.week++;
      if (ts >= startToday.getTime()) a.today++;
    }

    const users = internalUsers.map(u => {
      const a = activity.get(u.id) || { last: null, today: 0, week: 0, month: 0 };
      return {
        id:                   u.id,
        username:             u.email.split('@')[0],
        email:                u.email,
        role:                 profileMap.get(u.id)?.role || 'user',
        must_change_password: profileMap.get(u.id)?.must_change_password || false,
        created_at:           u.created_at,
        last_sign_in_at:      u.last_sign_in_at,
        banned:               u.banned_until ? new Date(u.banned_until) > new Date() : false,
        banned_until:         u.banned_until || null,
        // ── Aktivitas ──
        last_activity_at:     a.last,
        activity_today:       a.today,
        activity_week:        a.week,
        activity_month:       a.month,
      };
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
