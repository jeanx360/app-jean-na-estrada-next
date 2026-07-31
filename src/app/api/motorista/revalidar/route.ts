import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { userId } = await getAuthContext();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Sessão não encontrada." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { tripId?: string };

  revalidatePath("/motorista");
  revalidatePath("/motorista/financeiro");
  revalidatePath("/motorista/orcamentos");
  if (body.tripId) revalidatePath(`/motorista/financeiro/${body.tripId}`);

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
