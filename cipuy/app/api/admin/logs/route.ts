import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Silakan login." }, { status: 401 });
    }

    // Verify if user has admin role
    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya administrator yang dapat mengakses data ini." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    // ========================================================
    // MODE 1: INSPEKSI PROMPT DARI SATU PENGGUNA SPESIFIK
    // ========================================================
    if (targetUserId) {
      // 1. Ambil data profile user
      let targetUser: any = null;
      let { data: targetProfile } = await adminSupabase
        .from("profiles")
        .select("id, email, full_name, role, is_approved, created_at")
        .eq("id", targetUserId)
        .single();

      // Jika query gagal karena kolom is_approved belum dimigrasi di database:
      if (!targetProfile) {
        const { data: fallbackProfile } = await adminSupabase
          .from("profiles")
          .select("id, email, full_name, role, created_at")
          .eq("id", targetUserId)
          .single();
        targetProfile = fallbackProfile as any;
      }

      const { data: authUserData } = await adminSupabase.auth.admin.getUserById(targetUserId);

      if (targetProfile) {
        targetUser = {
          ...targetProfile,
          is_approved:
            targetProfile.role === "admin" ||
            targetProfile.is_approved === true ||
            authUserData?.user?.user_metadata?.is_approved === true,
        };
      } else if (authUserData?.user) {
        const isOwner =
          authUserData.user.email?.includes("admin") ||
          authUserData.user.user_metadata?.username === "faidhil";
        targetUser = {
          id: authUserData.user.id,
          email: authUserData.user.email,
          full_name:
            authUserData.user.user_metadata?.full_name ||
            authUserData.user.user_metadata?.username ||
            authUserData.user.email?.split("@")[0] ||
            "Pengguna",
          role: isOwner ? "admin" : "user",
          is_approved: isOwner || authUserData.user.user_metadata?.is_approved === true,
          created_at: authUserData.user.created_at,
        };
      }

      // 2. Ambil seluruh percakapan milik user
      const { data: userConversations } = await adminSupabase
        .from("conversations")
        .select("id, title, created_at, updated_at")
        .eq("user_id", targetUserId)
        .order("updated_at", { ascending: false });

      const conversations = userConversations || [];
      const convIds = conversations.map((c) => c.id);
      const convMap = new Map(conversations.map((c) => [c.id, c.title]));

      // 3. Ambil seluruh pesan & prompt
      let userMessages: any[] = [];
      if (convIds.length > 0) {
        const { data: msgs } = await adminSupabase
          .from("messages")
          .select("id, conversation_id, role, content, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: true });
        userMessages = msgs || [];
      } else {
        const { data: msgs } = await adminSupabase
          .from("messages")
          .select("id, conversation_id, role, content, created_at")
          .eq("user_id", targetUserId)
          .order("created_at", { ascending: true });
        userMessages = msgs || [];
      }

      // Perkayaan metadata pesan (conversation title)
      const enrichedMessages = userMessages.map((msg) => ({
        ...msg,
        conversation_title: convMap.get(msg.conversation_id) || "Percakapan Default",
      }));

      return NextResponse.json({
        user: targetUser,
        conversations,
        messages: enrichedMessages,
      });
    }

    // ========================================================
    // MODE 2: LIST SEMUA PENGGUNA & STATISTIK GLOBAL
    // ========================================================
    // Ambil profiles dari database (dengan fallback kolom is_approved)
    let allProfiles: any[] = [];
    const { data: profData, error: profErr } = await adminSupabase
      .from("profiles")
      .select("id, email, full_name, role, is_approved, created_at")
      .order("created_at", { ascending: false });

    if (profErr) {
      const { data: fallbackProf } = await adminSupabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .order("created_at", { ascending: false });
      allProfiles = fallbackProf || [];
    } else {
      allProfiles = profData || [];
    }

    // Ambil juga data dari Supabase Auth
    let authUsers: any[] = [];
    try {
      const { data: authData } = await adminSupabase.auth.admin.listUsers();
      if (authData?.users) {
        authUsers = authData.users;
      }
    } catch {
      // Ignore if listUsers fails
    }

    const authUsersMap = new Map<string, any>(authUsers.map((u) => [u.id, u]));

    // Gabungkan profiles dan authUsers tanpa duplikasi
    const profilesMap = new Map<string, any>();
    allProfiles.forEach((p) => {
      const authU = authUsersMap.get(p.id);
      const isApproved =
        p.role === "admin" ||
        p.is_approved === true ||
        authU?.user_metadata?.is_approved === true;

      profilesMap.set(p.id, {
        ...p,
        is_approved: isApproved,
      });
    });

    authUsers.forEach((u) => {
      if (!profilesMap.has(u.id)) {
        const isOwner =
          u.email?.includes("admin") ||
          u.user_metadata?.username === "faidhil" ||
          u.user_metadata?.username === "faidhil27";

        const isApproved =
          isOwner || u.user_metadata?.is_approved === true;

        profilesMap.set(u.id, {
          id: u.id,
          email: u.email,
          full_name:
            u.user_metadata?.full_name ||
            u.user_metadata?.username ||
            u.email?.split("@")[0] ||
            "Pengguna",
          role: isOwner ? "admin" : "user",
          is_approved: isApproved,
          created_at: u.created_at,
        });
      }
    });

    const combinedUsers = Array.from(profilesMap.values());

    // Ambil seluruh percakapan
    const { data: rawConversations } = await adminSupabase
      .from("conversations")
      .select("id, user_id, title, created_at, updated_at")
      .order("updated_at", { ascending: false });

    // Ambil log pesan terbaru
    const { data: rawMessages } = await adminSupabase
      .from("messages")
      .select("id, conversation_id, user_id, role, content, created_at")
      .order("created_at", { ascending: false });

    // Hitung per user
    const convCounts: Record<string, number> = {};
    (rawConversations || []).forEach((c) => {
      convCounts[c.user_id] = (convCounts[c.user_id] || 0) + 1;
    });

    const msgCounts: Record<string, number> = {};
    (rawMessages || []).forEach((m) => {
      if (m.user_id) {
        msgCounts[m.user_id] = (msgCounts[m.user_id] || 0) + 1;
      }
    });

    const usersWithStats = combinedUsers.map((u) => ({
      ...u,
      conversationsCount: convCounts[u.id] || 0,
      messagesCount: msgCounts[u.id] || 0,
    }));

    // Hitung statistik persetujuan akun
    const pendingUsersCount = usersWithStats.filter(
      (u) => !u.is_approved && u.role !== "admin"
    ).length;

    const approvedUsersCount = usersWithStats.filter(
      (u) => u.is_approved || u.role === "admin"
    ).length;

    // Sorting: Akun pending / belum di-ACC tampil di atas, lalu Admin, lalu paling banyak pesan
    usersWithStats.sort((a, b) => {
      const aPending = !a.is_approved && a.role !== "admin";
      const bPending = !b.is_approved && b.role !== "admin";
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      if (a.role === "admin" && b.role !== "admin") return -1;
      if (b.role === "admin" && a.role !== "admin") return 1;
      return (b.messagesCount || 0) - (a.messagesCount || 0);
    });

    const recentConversations = (rawConversations || []).slice(0, 50).map((c) => ({
      ...c,
      profiles: profilesMap.get(c.user_id),
    }));

    const recentMessages = (rawMessages || []).slice(0, 100).map((m) => ({
      ...m,
      profiles: profilesMap.get(m.user_id),
    }));

    return NextResponse.json({
      stats: {
        totalUsers: combinedUsers.length,
        pendingUsers: pendingUsersCount,
        approvedUsers: approvedUsersCount,
        totalConversations: rawConversations?.length || 0,
        totalMessages: rawMessages?.length || 0,
      },
      users: usersWithStats,
      conversations: recentConversations,
      messages: recentMessages,
    });
  } catch (error: any) {
    console.error("Error fetching admin logs:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal mengambil data log admin." },
      { status: 500 }
    );
  }
}
