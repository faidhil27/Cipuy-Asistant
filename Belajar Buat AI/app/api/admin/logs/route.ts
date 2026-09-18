import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    // Fetch conversations with user profile information
    const { data: conversations, error: convError } = await adminSupabase
      .from("conversations")
      .select(`
        id,
        user_id,
        title,
        created_at,
        updated_at,
        profiles (email, full_name)
      `)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (convError) {
      throw convError;
    }

    // Fetch recent messages across all users
    const { data: messages, error: msgError } = await adminSupabase
      .from("messages")
      .select(`
        id,
        conversation_id,
        user_id,
        role,
        content,
        created_at,
        profiles (email, full_name)
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (msgError) {
      throw msgError;
    }

    // Fetch summary stats
    const { count: totalUsers } = await adminSupabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: totalConversations } = await adminSupabase
      .from("conversations")
      .select("*", { count: "exact", head: true });

    const { count: totalMessages } = await adminSupabase
      .from("messages")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        totalConversations: totalConversations || 0,
        totalMessages: totalMessages || 0,
      },
      conversations: conversations || [],
      messages: messages || [],
    });
  } catch (error: any) {
    console.error("Error fetching admin logs:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal mengambil data log admin." },
      { status: 500 }
    );
  }
}

