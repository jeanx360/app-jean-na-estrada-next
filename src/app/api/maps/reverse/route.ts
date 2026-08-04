import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readPublicGuestAccessToken, verifyPublicGuestAccessToken } from "@/lib/public-guest-access";
import { openMapsConfigured, reverseOpenGeocode } from "@/lib/open-maps";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  const guestAccess = verifyPublicGuestAccessToken(readPublicGuestAccessToken(request));
  if (!userId && !guestAccess) {
    return NextResponse.json({ ok: false, error: "Acesso público inválido ou expirado." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (!openMapsConfigured()) {
    return NextResponse.json({ ok: false, configured: false, error: "Mapas abertos não configurados." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { latitude?: number; longitude?: number };
    const point = await reverseOpenGeocode(body.latitude, body.longitude);
    return NextResponse.json({ ok: true, configured: true, provider: "heigit-openrouteservice", point }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.warn("Falha na geocodificação reversa:", error);
    return NextResponse.json({ ok: false, configured: true, error: "Não foi possível identificar este endereço." }, { status: 502 });
  }
}
