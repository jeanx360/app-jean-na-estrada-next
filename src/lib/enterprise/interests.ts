import "server-only";

import { getAuthContext } from "@/lib/auth";
import type {
  EnterpriseOpportunityInterest,
  EnterpriseOpportunityInterestEligibility,
  SafeEnterpriseOpportunityCandidate,
} from "@/types/enterprise-interests";

const DRIVER_INTEREST_COLUMNS =
  "id, opportunity_id, driver_identity_id, vehicle_id, status, submitted_at, selected_at, released_at, withdrawn_at, rejected_at, closed_at, created_at, updated_at";

export async function getCurrentDriverEnterpriseInterests(): Promise<
  EnterpriseOpportunityInterest[]
> {
  const context = await getAuthContext();
  if (!context.userId) return [];

  const { data, error } = await context.supabase
    .from("enterprise_opportunity_interests")
    .select(DRIVER_INTEREST_COLUMNS)
    .order("submitted_at", { ascending: false });

  if (error) {
    throw new Error(`Não foi possível carregar seus interesses: ${error.message}`);
  }

  return (data ?? []) as EnterpriseOpportunityInterest[];
}

export async function getEnterpriseOpportunityInterestEligibility(
  opportunityId: string,
  vehicleId: string,
): Promise<EnterpriseOpportunityInterestEligibility | null> {
  const context = await getAuthContext();
  if (!context.userId) return null;

  const { data, error } = await context.supabase.rpc(
    "get_enterprise_opportunity_interest_eligibility",
    {
      p_opportunity_id: opportunityId,
      p_vehicle_id: vehicleId,
    },
  );

  if (error) {
    throw new Error(`Não foi possível verificar sua elegibilidade: ${error.message}`);
  }

  const rows = (data ?? []) as EnterpriseOpportunityInterestEligibility[];
  return rows[0] ?? null;
}

export async function submitEnterpriseOpportunityInterest(
  opportunityId: string,
  vehicleId: string,
): Promise<string> {
  const context = await getAuthContext();
  if (!context.userId) {
    throw new Error("Autenticação necessária para demonstrar interesse.");
  }

  const { data, error } = await context.supabase.rpc(
    "submit_enterprise_opportunity_interest",
    {
      p_opportunity_id: opportunityId,
      p_vehicle_id: vehicleId,
    },
  );

  if (error) {
    throw new Error(`Não foi possível registrar seu interesse: ${error.message}`);
  }

  if (typeof data !== "string") {
    throw new Error("O banco não retornou o identificador do interesse.");
  }

  return data;
}

export async function withdrawEnterpriseOpportunityInterest(
  interestId: string,
): Promise<string> {
  const context = await getAuthContext();
  if (!context.userId) {
    throw new Error("Autenticação necessária para retirar o interesse.");
  }

  const { data, error } = await context.supabase.rpc(
    "withdraw_enterprise_opportunity_interest",
    {
      p_interest_id: interestId,
    },
  );

  if (error) {
    throw new Error(`Não foi possível retirar seu interesse: ${error.message}`);
  }

  if (typeof data !== "string") {
    throw new Error("O banco não retornou o identificador do interesse.");
  }

  return data;
}

export async function getOrganizationOpportunityCandidates(
  opportunityId: string,
  limit = 100,
  offset = 0,
): Promise<SafeEnterpriseOpportunityCandidate[]> {
  const context = await getAuthContext();
  if (!context.userId) return [];

  const { data, error } = await context.supabase.rpc(
    "list_safe_enterprise_opportunity_candidates",
    {
      p_opportunity_id: opportunityId,
      p_limit: limit,
      p_offset: offset,
    },
  );

  if (error) {
    throw new Error(`Não foi possível carregar os candidatos: ${error.message}`);
  }

  return (data ?? []) as SafeEnterpriseOpportunityCandidate[];
}
