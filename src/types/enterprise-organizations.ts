export type OrganizationStatus =
  | "onboarding"
  | "pending_verification"
  | "verified"
  | "rejected"
  | "suspended"
  | "closed";

export type OrganizationType =
  | "company"
  | "event_agency"
  | "tourism"
  | "hotel"
  | "education"
  | "healthcare"
  | "condominium"
  | "association"
  | "cooperative"
  | "other";

export type OrganizationMemberRole = "owner" | "admin" | "recruiter" | "viewer";
export type OrganizationMemberStatus = "active" | "inactive" | "removed";

export type Organization = {
  id: string;
  legal_name: string;
  trade_name: string | null;
  organization_type: OrganizationType;
  status: OrganizationStatus;
  city: string | null;
  region: string | null;
  created_by_identity_id: string;
  created_at: string;
  updated_at: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  identity_id: string;
  role: OrganizationMemberRole;
  status: OrganizationMemberStatus;
  invited_by_identity_id: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CurrentOrganizationMembership = {
  organization: Organization;
  membership: OrganizationMember;
};
