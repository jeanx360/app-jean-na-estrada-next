export type MemberRole = "member" | "vip" | "admin";

export type MemberProfile = {
  id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_path: string | null;
  role: MemberRole;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthActionState = {
  error?: string;
  success?: string;
};

export type AdminActionState = AuthActionState & {
  code?: string;
};
