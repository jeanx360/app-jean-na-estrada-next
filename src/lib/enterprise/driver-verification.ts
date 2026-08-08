import "server-only";

import { getAuthContext } from "@/lib/auth";
import { getCurrentJneIdentity } from "@/lib/enterprise/identity";
import type {
  CurrentEnterpriseDriverContext,
  DriverVerification,
  EnterpriseDriverProfile,
  EnterpriseVehicle,
} from "@/types/enterprise-verification";

const DRIVER_PROFILE_COLUMNS =
  "identity_id, professional_status, city, region, bio, availability_status, verified_at, verification_expires_at, created_at, updated_at";

const VEHICLE_COLUMNS =
  "id, identity_id, nickname, brand, model, model_year, seats, vehicle_type, powertrain, status, is_primary, verified_at, verification_expires_at, created_at, updated_at";

const VERIFICATION_COLUMNS =
  "id, identity_id, verification_type, vehicle_id, status, user_reason_code, submitted_at, reviewed_at, expires_at, supersedes_verification_id, created_at, updated_at";

export async function ensureCurrentEnterpriseDriverProfile(): Promise<EnterpriseDriverProfile> {
  const context = await getAuthContext();
  if (!context.userId) {
    throw new Error("Autenticação necessária.");
  }

  const { error } = await context.supabase.rpc("ensure_enterprise_driver_profile");

  if (error) {
    throw new Error(`Não foi possível preparar o perfil profissional empresarial: ${error.message}`);
  }

  const profile = await getCurrentEnterpriseDriverProfile();
  if (!profile) {
    throw new Error("O perfil profissional empresarial foi criado, mas não pôde ser carregado.");
  }

  return profile;
}

export async function getCurrentEnterpriseDriverProfile(): Promise<EnterpriseDriverProfile | null> {
  const context = await getAuthContext();
  if (!context.userId) return null;

  const currentIdentity = await getCurrentJneIdentity();
  if (!currentIdentity) return null;

  const { data, error } = await context.supabase
    .from("driver_profiles")
    .select(DRIVER_PROFILE_COLUMNS)
    .eq("identity_id", currentIdentity.identity.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível carregar o perfil profissional empresarial: ${error.message}`);
  }

  return (data as EnterpriseDriverProfile | null) ?? null;
}

export async function getCurrentEnterpriseVehicles(): Promise<EnterpriseVehicle[]> {
  const context = await getAuthContext();
  if (!context.userId) return [];

  const currentIdentity = await getCurrentJneIdentity();
  if (!currentIdentity) return [];

  const { data, error } = await context.supabase
    .from("vehicles")
    .select(VEHICLE_COLUMNS)
    .eq("identity_id", currentIdentity.identity.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Não foi possível carregar os veículos empresariais: ${error.message}`);
  }

  return (data ?? []) as EnterpriseVehicle[];
}

export async function getCurrentDriverVerifications(): Promise<DriverVerification[]> {
  const context = await getAuthContext();
  if (!context.userId) return [];

  const currentIdentity = await getCurrentJneIdentity();
  if (!currentIdentity) return [];

  const { data, error } = await context.supabase
    .from("driver_verifications")
    .select(VERIFICATION_COLUMNS)
    .eq("identity_id", currentIdentity.identity.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Não foi possível carregar as verificações profissionais: ${error.message}`);
  }

  return (data ?? []) as DriverVerification[];
}

export async function getCurrentEnterpriseDriverContext(): Promise<CurrentEnterpriseDriverContext | null> {
  const profile = await getCurrentEnterpriseDriverProfile();
  if (!profile) return null;

  const [vehicles, verifications] = await Promise.all([
    getCurrentEnterpriseVehicles(),
    getCurrentDriverVerifications(),
  ]);

  return {
    profile,
    vehicles,
    verifications,
  };
}
