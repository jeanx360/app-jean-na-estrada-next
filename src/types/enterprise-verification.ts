export type EnterpriseDriverProfessionalStatus =
  | "not_started"
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "expired"
  | "suspended";

export type EnterpriseDriverAvailabilityStatus = "available" | "limited" | "unavailable";

export type EnterpriseDriverProfile = {
  identity_id: string;
  professional_status: EnterpriseDriverProfessionalStatus;
  city: string | null;
  region: string | null;
  bio: string | null;
  availability_status: EnterpriseDriverAvailabilityStatus;
  verified_at: string | null;
  verification_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EnterpriseVehicleType =
  | "hatch"
  | "sedan"
  | "suv"
  | "minivan"
  | "van"
  | "pickup"
  | "other";

export type EnterpriseVehiclePowertrain =
  | "electric"
  | "hybrid"
  | "plug_in_hybrid"
  | "combustion"
  | "other";

export type EnterpriseVehicleStatus =
  | "draft"
  | "pending_verification"
  | "verified"
  | "rejected"
  | "expired"
  | "inactive";

export type EnterpriseVehicle = {
  id: string;
  identity_id: string;
  nickname: string | null;
  brand: string;
  model: string;
  model_year: number;
  seats: number;
  vehicle_type: EnterpriseVehicleType;
  powertrain: EnterpriseVehiclePowertrain;
  status: EnterpriseVehicleStatus;
  is_primary: boolean;
  verified_at: string | null;
  verification_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DriverVerificationType =
  | "identity"
  | "cpf"
  | "cnh"
  | "ear"
  | "phone"
  | "email"
  | "vehicle"
  | "liveness";

export type DriverVerificationStatus =
  | "pending"
  | "processing"
  | "approved"
  | "rejected"
  | "expired"
  | "manual_review";

export type DriverVerification = {
  id: string;
  identity_id: string;
  verification_type: DriverVerificationType;
  vehicle_id: string | null;
  status: DriverVerificationStatus;
  user_reason_code: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  expires_at: string | null;
  supersedes_verification_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CurrentEnterpriseDriverContext = {
  profile: EnterpriseDriverProfile;
  vehicles: EnterpriseVehicle[];
  verifications: DriverVerification[];
};
