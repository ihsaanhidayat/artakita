import { NextResponse, type NextRequest } from "next/server";
import { verifyAdmin } from "../auth";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { userId?: string; newPassword?: string };
    const { userId, newPassword } = body;
    if (!userId || !newPassword) {
      return NextResponse.json({ error: "userId dan newPassword wajib diisi" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }

    const auth = await verifyAdmin(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabaseAdmin } = auth;

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (authError) throw authError;

    await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", userId);

    return NextResponse.json({ success: true, message: "Password berhasil direset." });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
