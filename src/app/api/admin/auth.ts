import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { AdminVerifyResult } from "@/types";

export function getAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function verifyAdmin(request: NextRequest): Promise<AdminVerifyResult> {
  const supabaseAdmin = getAdminClient();
  const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return { error: "Unauthorized", status: 401 };

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { error: "Invalid token", status: 401 };

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role?: string } | null)?.role !== "admin") return { error: "Forbidden", status: 403 };

  return { user: user as User, supabaseAdmin };
}
