import { NextResponse, type NextRequest } from "next/server";
import { verifyAdmin } from "../auth";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await verifyAdmin(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabaseAdmin } = auth;

    const body = await request.json() as { username?: string; password?: string };
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "username dan password wajib diisi" }, { status: 400 });
    }

    const email = `${username.trim().toLowerCase()}@artakita.internal`;

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) throw error;

    return NextResponse.json({ success: true, message: "User berhasil dibuat!" });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
