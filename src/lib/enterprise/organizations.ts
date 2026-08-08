import "server-only";

import { getAuthContext } from "@/lib/auth";
import { getCurrentJneIdentity } from "@/lib/enterprise/identity";
import type {
  CurrentOrganizationMembership,
  Organization,
  OrganizationMember,
} from "@/types/enterprise-organizations";

const ORGANIZATION_COLUMNS =
  "id, legal_name, trade_name, organization_type, status, city, region, created_by_identity_id, created_at, updated_at";

const MEMBERSHIP_COLUMNS =
  "id, organization_id, identity_id, role, status, invited_by_identity_id, joined_at, created_at, updated_at";

export async function getCurrentOrganizationMemberships(): Promise<
  CurrentOrganizationMembership[]
> {
  const context = await getAuthContext();
  if (!context.userId) return [];

  const currentIdentity = await getCurrentJneIdentity();
  if (!currentIdentity) return [];

  const { data: membershipData, error: membershipError } = await context.supabase
    .from("organization_members")
    .select(MEMBERSHIP_COLUMNS)
    .eq("identity_id", currentIdentity.identity.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (membershipError) {
    throw new Error(
      `Não foi possível carregar os vínculos empresariais: ${membershipError.message}`,
    );
  }

  const memberships = (membershipData ?? []) as OrganizationMember[];
  if (memberships.length === 0) return [];

  const organizationIds = memberships.map((membership) => membership.organization_id);

  const { data: organizationData, error: organizationError } = await context.supabase
    .from("organizations")
    .select(ORGANIZATION_COLUMNS)
    .in("id", organizationIds);

  if (organizationError) {
    throw new Error(
      `Não foi possível carregar as organizações: ${organizationError.message}`,
    );
  }

  const organizations = (organizationData ?? []) as Organization[];
  const organizationById = new Map(
    organizations.map((organization) => [organization.id, organization]),
  );

  return memberships.flatMap((membership) => {
    const organization = organizationById.get(membership.organization_id);
    if (!organization) return [];

    return [{ organization, membership }];
  });
}

export async function getOrganizationById(
  organizationId: string,
): Promise<Organization | null> {
  const context = await getAuthContext();
  if (!context.userId) return null;

  const { data, error } = await context.supabase
    .from("organizations")
    .select(ORGANIZATION_COLUMNS)
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível carregar a organização: ${error.message}`);
  }

  return (data as Organization | null) ?? null;
}

export async function getOrganizationMembers(
  organizationId: string,
): Promise<OrganizationMember[]> {
  const context = await getAuthContext();
  if (!context.userId) return [];

  const { data, error } = await context.supabase
    .from("organization_members")
    .select(MEMBERSHIP_COLUMNS)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Não foi possível carregar a equipe da organização: ${error.message}`);
  }

  return (data ?? []) as OrganizationMember[];
}
