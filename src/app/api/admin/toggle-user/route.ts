import { NextResponse, type NextRequest } from "next/server";
import { verifyAdmin } from "../auth";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { userId?: string; action?: "ban" | "unban" };
    const { userId, action } = body;
    if (!userId || !action) {
      return NextResponse.json({ error: "userId dan action wajib diisi" }, { status: 400 });
    }

    const auth = await verifyAdmin(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabaseAdmin } = auth;

    const updateData = action === "ban"
      ? { ban_duration: "876000h" }
      : { ban_duration: "none" };

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);
    if (error) throw error;

    const msg = action === "ban" ? "User berhasil dinonaktifkan." : "User berhasil diaktifkan kembali.";
    return NextResponse.json({ success: true, message: msg });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
