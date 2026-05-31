import { createClient } from '@supabase/supabase-js';

export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function verifyAdmin(request) {
  const supabaseAdmin = getAdminClient();
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!token) return { error: 'Unauthorized', status: 401 };

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { error: 'Invalid token', status: 401 };

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Forbidden', status: 403 };

  return { user, supabaseAdmin };
}
