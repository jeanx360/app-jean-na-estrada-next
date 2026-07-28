import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { getLegalAcceptanceStatus } from "@/lib/legal";

export async function requireAdmin() {
  const context = await getAuthContext();

  if (!context.userId) {
    redirect("/entrar?next=/admin");
  }

  if (!context.profile || context.profile.is_blocked || context.profile.role !== "admin") {
    redirect("/membros");
  }

  const legal = await getLegalAcceptanceStatus(context.supabase, context.userId);
  if (!legal.complete) {
    redirect("/aceite?next=/admin");
  }

  return context;
}
