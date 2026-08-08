export type EnterpriseOpportunityInterestStatus =
  | "submitted"
  | "selected"
  | "released"
  | "withdrawn"
  | "rejected"
  | "closed";

export type EnterpriseOpportunityInterest = {
  id: string;
  opportunity_id: string;
  driver_identity_id: string;
  vehicle_id: string;
  status: EnterpriseOpportunityInterestStatus;
  submitted_at: string;
  selected_at: string | null;
  released_at: string | null;
  withdrawn_at: string | null;
  rejected_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EnterpriseOpportunityInterestEligibility = {
  eligible: boolean;
  reason_code: string;
  driver_verified: boolean;
  vehicle_verified: boolean;
  ear_verified: boolean;
  seats_ok: boolean;
  vehicle_type_ok: boolean;
  powertrain_ok: boolean;
};

// Deliberadamente sem driver_identity_id, nome, CPF, CNH, placa ou contato.
// A empresa inicia o P6 usando interest_id, não a identidade bruta do motorista.
export type SafeEnterpriseOpportunityCandidate = {
  interest_id: string;
  interest_status: EnterpriseOpportunityInterestStatus;
  submitted_at: string;
  driver_alias: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_model_year: number;
  vehicle_seats: number;
  vehicle_type: string;
  vehicle_powertrain: string;
  driver_verified: boolean;
  vehicle_verified: boolean;
  ear_verified: boolean;
  eligible_now: boolean;
  eligibility_reason_code: string;
};
