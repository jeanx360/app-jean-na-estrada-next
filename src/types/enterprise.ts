export type JneIdentityStatus = "active" | "pending_review" | "suspended" | "closed";
export type JneIdentityRole = "passenger" | "driver" | "enterprise_driver" | "admin";
export type JneIdentityRoleStatus = "active" | "inactive";

export type JneIdentity = {
  id: string;
  display_name: string | null;
  status: JneIdentityStatus;
  created_at: string;
  updated_at: string;
};

export type JneIdentityRoleRow = {
  identity_id: string;
  role: JneIdentityRole;
  status: JneIdentityRoleStatus;
  created_at: string;
  updated_at: string;
};

export type CurrentJneIdentity = {
  identity: JneIdentity;
  roles: JneIdentityRole[];
};
