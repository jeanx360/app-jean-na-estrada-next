import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeGoogleDrivingRoute, googleMapsConfigured, type GoogleRoutePoint } from "@/lib/google-maps";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Faça login para calcular a rota." }, { status: 401 });
  }
  if (!googleMapsConfigured()) {
    return NextResponse.json({ ok: false, configured: false, error: "Mapas não configurados." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { origin?: GoogleRoutePoint; destination?: GoogleRoutePoint };
    if (!body.origin || !body.destination) {
      return NextResponse.json({ ok: false, error: "Informe origem e destino." }, { status: 400 });
    }
    const estimate = await computeGoogleDrivingRoute(body.origin, body.destination);
    return NextResponse.json({ ok: true, configured: true, ...estimate }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.warn("Falha no cálculo de rota:", error);
    return NextResponse.json({ ok: false, configured: true, error: error instanceof Error ? error.message : "Não foi possível calcular a rota." }, { status: 502 });
  }
}
