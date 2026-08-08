import "server-only";

import { getAuthContext } from "@/lib/auth";
import type {
  EnterpriseOpportunity,
  SafeEnterpriseOpportunity,
} from "@/types/enterprise-opportunities";

const ORGANIZATION_OPPORTUNITY_COLUMNS =
  "id, organization_id, created_by_identity_id, status, service_type, engagement_type, origin_city, origin_region, destination_city, destination_region, start_date, end_date, intended_duration_days, schedule_pattern, daily_start_time, daily_end_time, required_seats, required_vehicle_type, required_powertrain, requires_verified_vehicle, requires_ear, budget_type, budget_min, budget_max, currency_code, published_at, expires_at, created_at, updated_at";

export async function getOrganizationEnterpriseOpportunities(
  organizationId: string,
): Promise<EnterpriseOpportunity[]> {
  const context = await getAuthContext();
  if (!context.userId) return [];

  const { data, error } = await context.supabase
    .from("enterprise_opportunities")
    .select(ORGANIZATION_OPPORTUNITY_COLUMNS)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Não foi possível carregar as oportunidades da empresa: ${error.message}`);
  }

  return (data ?? []) as EnterpriseOpportunity[];
}

export async function getSafeEnterpriseOpportunityFeed(
  limit = 50,
  offset = 0,
): Promise<SafeEnterpriseOpportunity[]> {
  const context = await getAuthContext();
  if (!context.userId) return [];

  const { data, error } = await context.supabase.rpc(
    "list_safe_enterprise_opportunities",
    {
      p_limit: limit,
      p_offset: offset,
    },
  );

  if (error) {
    throw new Error(`Não foi possível carregar as oportunidades disponíveis: ${error.message}`);
  }

  return (data ?? []) as SafeEnterpriseOpportunity[];
}

export async function getSafeEnterpriseOpportunityById(
  opportunityId: string,
): Promise<SafeEnterpriseOpportunity | null> {
  const context = await getAuthContext();
  if (!context.userId) return null;

  const { data, error } = await context.supabase.rpc(
    "get_safe_enterprise_opportunity",
    {
      p_opportunity_id: opportunityId,
    },
  );

  if (error) {
    throw new Error(`Não foi possível carregar a oportunidade: ${error.message}`);
  }

  const rows = (data ?? []) as SafeEnterpriseOpportunity[];
  return rows[0] ?? null;
}
