import { createClient } from "@/lib/supabase/server";
import type { MemberProfile } from "@/types/auth";

const PROFILE_SELECT =
  "id, full_name, bio, avatar_url, avatar_path, role, is_blocked, blocked_at, blocked_reason, created_at, updated_at";

export async function getAuthContext() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (!userId) {
    return { supabase, userId: null, email: null, profile: null };
  }

  const email = typeof claims?.email === "string" ? claims.email : null;

  // Primeiro lê o perfil. Administradores nunca devem passar pela rotina
  // automática que recalcula apenas os níveis member/vip.
  const { data: initialData } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  let profile = (initialData as MemberProfile | null) ?? null;

  // A validade automática é relevante somente para membros e VIPs.
  // O cargo de administrador é permanente até uma ação administrativa explícita.
  if (profile && profile.role !== "admin") {
    const { data: refreshedRole, error: refreshError } = await supabase.rpc(
      "refresh_member_vip_role",
      { target_user_id: userId },
    );

    if (!refreshError && refreshedRole && refreshedRole !== profile.role) {
      const { data: refreshedData } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .eq("id", userId)
        .maybeSingle();

      profile = (refreshedData as MemberProfile | null) ?? profile;
    }
  }

  return {
    supabase,
    userId,
    email,
    profile,
  };
}
