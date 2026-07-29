import { createClient } from "@/lib/supabase/server";
import type { MemberProfile } from "@/types/auth";

export async function getAuthContext() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (!userId) {
    return { supabase, userId: null, email: null, profile: null };
  }

  const email = typeof claims?.email === "string" ? claims.email : null;

  // Recalcula o papel quando a validade de um acesso VIP termina.
  await supabase.rpc("refresh_member_vip_role", { target_user_id: userId });

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, bio, avatar_url, avatar_path, role, is_blocked, blocked_at, blocked_reason, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  return {
    supabase,
    userId,
    email,
    profile: (data as MemberProfile | null) ?? null,
  };
}
