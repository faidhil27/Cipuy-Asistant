import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { username, password, fullName } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan kata sandi wajib diisi." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Kata sandi minimal 6 karakter." },
        { status: 400 }
      );
    }

    // Format email internal agar tidak butuh email asli dan bebas verifikasi
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    const email = username.includes("@")
      ? username.trim().toLowerCase()
      : `${cleanUsername}@cipuy.local`;

    const adminSupabase = createAdminClient();

    // Periksa apakah ini akun pertama atau akun owner Faidhil
    const { count } = await adminSupabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const isFirstUser = !count || count === 0;
    const isOwner = cleanUsername === "faidhil" || cleanUsername === "faidhil27" || isFirstUser;
    const role = isOwner ? "admin" : "user";
    const isApproved = isOwner ? true : false;

    // Buat user langsung terkonfirmasi (email_confirm: true)
    // Pengguna TIDAK AKAN PERNAH diminta verifikasi email!
    const { data: newUser, error: createError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm aktif seketika
        user_metadata: {
          full_name: fullName || username,
          username: cleanUsername,
          role,
          is_approved: isApproved,
        },
      });

    if (createError) {
      if (createError.message.includes("already registered")) {
        return NextResponse.json(
          { error: "Username ini sudah terdaftar. Silakan langsung masuk." },
          { status: 400 }
        );
      }
      throw createError;
    }

    if (newUser?.user) {
      await adminSupabase.from("profiles").upsert(
        {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name: fullName || username,
          role,
          is_approved: isApproved,
        },
        { onConflict: "id" }
      );
    }

    return NextResponse.json({
      success: true,
      pendingApproval: !isApproved,
      message: isApproved
        ? "Akun Administrator berhasil dibuat! Silakan masuk."
        : "Pengajuan akun berhasil dikirim! Akun Anda sedang menunggu persetujuan (ACC) dari Admin sebelum dapat digunakan.",
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        username: cleanUsername,
        isApproved,
      },
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal membuat akun." },
      { status: 500 }
    );
  }
}
