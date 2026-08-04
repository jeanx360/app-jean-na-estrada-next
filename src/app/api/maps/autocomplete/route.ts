import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readPublicGuestAccessToken, verifyPublicGuestAccessToken } from "@/lib/public-guest-access";
import { autocompleteOpenPlaces, openMapsConfigured } from "@/lib/open-maps";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  const guestAccess = verifyPublicGuestAccessToken(readPublicGuestAccessToken(request));
  if (!userId && !guestAccess) {
    return NextResponse.json({ ok: false, error: "Acesso público inválido ou expirado." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (!openMapsConfigured()) {
    return NextResponse.json({ ok: false, configured: false, items: [] }, { status: 503 });
  }

  const url = new URL(request.url);
  const latitudeParam = url.searchParams.get("lat");
  const longitudeParam = url.searchParams.get("lng");
  try {
    const items = await autocompleteOpenPlaces(url.searchParams.get("input") || "", {
      latitude: latitudeParam === null ? null : Number(latitudeParam),
      longitude: longitudeParam === null ? null : Number(longitudeParam),
    });
    return NextResponse.json({ ok: true, configured: true, provider: "heigit-openrouteservice", items }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.warn("Falha no autocomplete de mapas abertos:", error);
    return NextResponse.json({ ok: false, configured: true, items: [], error: "Não foi possível buscar endereços agora." }, { status: 502 });
  }
}
