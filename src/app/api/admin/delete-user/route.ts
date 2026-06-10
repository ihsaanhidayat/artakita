import { NextResponse, type NextRequest } from "next/server";
import { verifyAdmin } from "../auth";

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { userId?: string };
    const { userId } = body;
    if (!userId) return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });

    const auth = await verifyAdmin(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabaseAdmin } = auth;

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    return NextResponse.json({ success: true, message: "User berhasil dihapus." });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
