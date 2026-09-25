import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized. Silakan masuk terlebih dahulu." },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminClient();

    // Verifikasi role admin
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya administrator yang dapat meresmikan akun pengguna." },
        { status: 403 }
      );
    }

    const { userId, approve } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "ID Pengguna (userId) wajib disertakan." },
        { status: 400 }
      );
    }

    const shouldApprove = approve !== false; // default true jika tidak dispesifikasikan

    // 1. Update di tabel profiles
    const { error: profileError } = await adminSupabase
      .from("profiles")
      .update({ is_approved: shouldApprove })
      .eq("id", userId);

    if (profileError) {
      console.warn("Update profile error (mungkin kolom is_approved baru):", profileError.message);
    }

    // 2. Update di auth.users user_metadata untuk keandalan maksimal
    const { data: targetAuthUser, error: authGetError } =
      await adminSupabase.auth.admin.getUserById(userId);

    if (targetAuthUser?.user) {
      const existingMeta = targetAuthUser.user.user_metadata || {};
      await adminSupabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingMeta,
          is_approved: shouldApprove,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: shouldApprove
        ? "Akun berhasil di-ACC / diresmikan! Pengguna kini dapat masuk dan menggunakan Cipuy."
        : "Status ACC akun pengguna berhasil dicabut.",
      userId,
      isApproved: shouldApprove,
    });
  } catch (error: any) {
    console.error("Error approving user:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memperbarui status persetujuan akun." },
      { status: 500 }
    );
  }
}
