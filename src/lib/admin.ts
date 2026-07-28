import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";

export async function requireAdmin() {
  const context = await getAuthContext();

  if (!context.userId) {
    redirect("/entrar?next=/admin");
  }

  if (!context.profile || context.profile.is_blocked || context.profile.role !== "admin") {
    redirect("/membros");
  }

  return context;
}
