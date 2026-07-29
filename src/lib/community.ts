import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getLegalAcceptanceStatus } from "@/lib/legal";
import type { MemberProfile } from "@/types/auth";
import type { createClient } from "@/lib/supabase/server";

export function hasCommunityAccess(profile: MemberProfile | null) {
  return Boolean(
    profile &&
      !profile.is_blocked &&
      (profile.role === "vip" || profile.role === "admin"),
  );
}

export async function requireCommunityAccess(next = "/comunidade") {
  const context = await getAuthContext();

  if (!context.userId) {
    redirect(`/entrar?next=${encodeURIComponent(next)}`);
  }

  const legal = await getLegalAcceptanceStatus(context.supabase, context.userId);
  if (!legal.complete) {
    redirect(`/aceite?next=${encodeURIComponent(next)}`);
  }

  if (!hasCommunityAccess(context.profile)) {
    redirect(`/assinar?next=${encodeURIComponent(next)}`);
  }

  return context;
}

export async function createCommunityImageUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imagePath: string | null,
) {
  if (!imagePath) return null;
  const { data, error } = await supabase.storage
    .from("community-images")
    .createSignedUrl(imagePath, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export function formatCommunityDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
