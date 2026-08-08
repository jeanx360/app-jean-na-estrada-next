import "server-only";

import { getAuthContext } from "@/lib/auth";
import type {
  CurrentJneIdentity,
  JneIdentity,
  JneIdentityRole,
  JneIdentityRoleRow,
} from "@/types/enterprise";

function activeRoles(rows: JneIdentityRoleRow[] | null | undefined) {
  return (rows ?? [])
    .filter((row) => row.status === "active")
    .map((row) => row.role as JneIdentityRole);
}

export async function getCurrentJneIdentity(): Promise<CurrentJneIdentity | null> {
  const context = await getAuthContext();
  if (!context.userId) return null;

  const { data: identityId, error: identityIdError } = await context.supabase.rpc(
    "current_jne_identity_id",
  );

  if (identityIdError) {
    throw new Error(`Não foi possível consultar a identidade JNE: ${identityIdError.message}`);
  }

  if (typeof identityId !== "string" || !identityId) return null;

  const [identityResult, rolesResult] = await Promise.all([
    context.supabase
      .from("jne_identities")
      .select("id, display_name, status, created_at, updated_at")
      .eq("id", identityId)
      .maybeSingle(),
    context.supabase
      .from("jne_identity_roles")
      .select("identity_id, role, status, created_at, updated_at")
      .eq("identity_id", identityId),
  ]);

  if (identityResult.error) {
    throw new Error(`Não foi possível carregar a identidade JNE: ${identityResult.error.message}`);
  }

  if (!identityResult.data) return null;

  if (rolesResult.error) {
    throw new Error(`Não foi possível carregar os papéis da identidade JNE: ${rolesResult.error.message}`);
  }

  return {
    identity: identityResult.data as JneIdentity,
    roles: activeRoles((rolesResult.data as JneIdentityRoleRow[] | null) ?? null),
  };
}

export async function ensureCurrentJneIdentity(): Promise<CurrentJneIdentity> {
  const context = await getAuthContext();
  if (!context.userId) {
    throw new Error("Autenticação necessária.");
  }

  const { error } = await context.supabase.rpc("ensure_current_jne_identity");

  if (error) {
    throw new Error(`Não foi possível preparar a identidade JNE: ${error.message}`);
  }

  const currentIdentity = await getCurrentJneIdentity();
  if (!currentIdentity) {
    throw new Error("A identidade JNE foi criada, mas não pôde ser carregada.");
  }

  return currentIdentity;
}
