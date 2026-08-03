import type { SupabaseClient } from "@supabase/supabase-js";

export const LEGAL_VERSIONS = {
  terms: "2.0.2",
  privacy: "2.0.2",
  apk_disclaimer: "1.0.0",
} as const;

export type LegalDocumentType = keyof typeof LEGAL_VERSIONS;

export const LEGAL_DOCUMENTS = [
  { type: "terms", label: "Termos de Uso", href: "/termos", version: LEGAL_VERSIONS.terms },
  { type: "privacy", label: "Política de Privacidade", href: "/privacidade", version: LEGAL_VERSIONS.privacy },
  { type: "apk_disclaimer", label: "Aviso sobre APKs e modificações", href: "/seguranca-apks", version: LEGAL_VERSIONS.apk_disclaimer },
] as const;

export function safeInternalPath(value: string | null | undefined, fallback = "/membros") {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function getLegalAcceptanceStatus(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from("user_legal_acceptances").select("document_type, version").eq("user_id", userId);
  if (error) return { complete: false, missing: LEGAL_DOCUMENTS.map((document) => document.type), error };
  const accepted = new Map((data ?? []).map((item: { document_type: string; version: string }) => [item.document_type, item.version]));
  const missing = LEGAL_DOCUMENTS.filter((document) => accepted.get(document.type) !== document.version).map((document) => document.type);
  return { complete: missing.length === 0, missing, error: null };
}
