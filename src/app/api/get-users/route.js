import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) throw error;

    const availableUsers = data.users
      .filter(u => u.email && u.email.endsWith('@artakita.internal'))
      .map(u => ({
        uid: u.id,
        username: u.email.split('@')[0]
      }));

    return NextResponse.json({ success: true, users: availableUsers });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}