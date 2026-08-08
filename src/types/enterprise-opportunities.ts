export type EnterpriseOpportunityStatus =
  | "draft"
  | "published"
  | "paused"
  | "negotiating"
  | "contracted"
  | "expired"
  | "cancelled";

export type EnterpriseOpportunityServiceType =
  | "employee_transport"
  | "executive_transport"
  | "airport_transfer"
  | "event_transport"
  | "tourism"
  | "recurring_transport"
  | "professional_transport"
  | "other";

export type EnterpriseOpportunityEngagementType =
  | "one_time"
  | "temporary"
  | "recurring"
  | "ongoing";

export type EnterpriseOpportunitySchedulePattern =
  | "one_time"
  | "weekdays"
  | "weekends"
  | "selected_days"
  | "shifts"
  | "flexible"
  | "other";

export type EnterpriseOpportunityVehicleType =
  | "any"
  | "hatch"
  | "sedan"
  | "suv"
  | "minivan"
  | "van"
  | "pickup"
  | "other";

export type EnterpriseOpportunityPowertrain =
  | "any"
  | "electric"
  | "hybrid"
  | "plug_in_hybrid"
  | "combustion"
  | "other";

export type EnterpriseOpportunityBudgetType =
  | "per_trip"
  | "daily"
  | "weekly"
  | "monthly"
  | "total"
  | "negotiable";

export type EnterpriseOpportunity = {
  id: string;
  organization_id: string;
  created_by_identity_id: string;
  status: EnterpriseOpportunityStatus;
  service_type: EnterpriseOpportunityServiceType;
  engagement_type: EnterpriseOpportunityEngagementType;
  origin_city: string;
  origin_region: string;
  destination_city: string | null;
  destination_region: string | null;
  start_date: string;
  end_date: string | null;
  intended_duration_days: number;
  schedule_pattern: EnterpriseOpportunitySchedulePattern;
  daily_start_time: string | null;
  daily_end_time: string | null;
  required_seats: number;
  required_vehicle_type: EnterpriseOpportunityVehicleType;
  required_powertrain: EnterpriseOpportunityPowertrain;
  requires_verified_vehicle: boolean;
  requires_ear: boolean;
  budget_type: EnterpriseOpportunityBudgetType;
  budget_min: number | null;
  budget_max: number | null;
  currency_code: string;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

// Contrato deliberadamente sem organization_id, responsável ou texto livre.
// Este é o formato permitido antes da negociação exclusiva.
export type SafeEnterpriseOpportunity = {
  id: string;
  service_type: EnterpriseOpportunityServiceType;
  engagement_type: EnterpriseOpportunityEngagementType;
  origin_city: string;
  origin_region: string;
  destination_city: string | null;
  destination_region: string | null;
  start_date: string;
  end_date: string | null;
  intended_duration_days: number;
  schedule_pattern: EnterpriseOpportunitySchedulePattern;
  daily_start_time: string | null;
  daily_end_time: string | null;
  required_seats: number;
  required_vehicle_type: EnterpriseOpportunityVehicleType;
  required_powertrain: EnterpriseOpportunityPowertrain;
  requires_verified_vehicle: boolean;
  requires_ear: boolean;
  budget_type: EnterpriseOpportunityBudgetType;
  budget_min: number | null;
  budget_max: number | null;
  currency_code: string;
  published_at: string;
  expires_at: string;
};
