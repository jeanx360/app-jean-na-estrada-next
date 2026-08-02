"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function respondDriverQuoteAction(formData: FormData) {
  const token = readText(formData, "token");
  const decision = readText(formData, "decision");
  const message = readText(formData, "message");
  if (!token) throw new Error("Orçamento inválido.");
  if (!['accepted', 'declined'].includes(decision)) throw new Error("Resposta inválida.");
  if (message.length > 500) throw new Error("A mensagem pode ter no máximo 500 caracteres.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("respond_public_driver_quote", {
    quote_token: token,
    decision,
    passenger_message: message || null,
  });

  if (error) throw new Error(error.message);
  const result = data as { ok?: boolean; status?: string; error?: string } | null;
  if (!result?.ok) throw new Error(result?.error || "Não foi possível registrar sua resposta.");
  redirect(`/orcamento/${token}?resposta=${result.status || decision}`);
}
