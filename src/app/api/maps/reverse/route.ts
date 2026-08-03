import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { googleMapsConfigured, reverseGoogleGeocode } from "@/lib/google-maps";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Faça login para usar a localização atual." }, { status: 401 });
  }
  if (!googleMapsConfigured()) {
    return NextResponse.json({ ok: false, configured: false, error: "Mapas não configurados." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { latitude?: number; longitude?: number };
    const point = await reverseGoogleGeocode(body.latitude, body.longitude);
    return NextResponse.json({ ok: true, configured: true, point }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.warn("Falha na geocodificação reversa:", error);
    return NextResponse.json({ ok: false, configured: true, error: "Não foi possível identificar este endereço." }, { status: 502 });
  }
}
