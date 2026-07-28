export type MemberRole = "member" | "vip" | "admin";

export type MemberProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: MemberRole;
  created_at: string;
  updated_at: string;
};

export type AuthActionState = {
  error?: string;
  success?: string;
};
