import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Silakan login." }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Verify admin privileges
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya administrator yang berhak menghapus database." },
        { status: 403 }
      );
    }

    const { daysOld, purgeAll } = await req.json();

    let deletedCount = 0;

    if (purgeAll) {
      // Purge all messages and conversations
      const { error: msgErr } = await adminSupabase.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const { error: convErr } = await adminSupabase.from("conversations").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      if (msgErr || convErr) {
        throw msgErr || convErr;
      }

      return NextResponse.json({
        success: true,
        message: "Seluruh riwayat obrolan dan pesan berhasil dibersihkan dari database.",
      });
    }

    if (daysOld && typeof daysOld === "number" && daysOld > 0) {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysOld);
      const isoThreshold = thresholdDate.toISOString();

      // Delete conversations older than threshold date
      const { data, error } = await adminSupabase
        .from("conversations")
        .delete()
        .lt("updated_at", isoThreshold)
        .select("id");

      if (error) {
        throw error;
      }

      deletedCount = data?.length || 0;

      return NextResponse.json({
        success: true,
        deletedCount,
        message: `Berhasil menghapus ${deletedCount} percakapan lama (lebih dari ${daysOld} hari).`,
      });
    }

    return NextResponse.json(
      { error: "Parameter purge tidak valid. Berikan 'daysOld' atau 'purgeAll'." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error purging database:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal membersihkan database Supabase." },
      { status: 500 }
    );
  }
}

