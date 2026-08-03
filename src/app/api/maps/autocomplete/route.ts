import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { autocompleteGooglePlaces, googleMapsConfigured } from "@/lib/google-maps";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Faça login para buscar endereços." }, { status: 401 });
  }
  if (!googleMapsConfigured()) {
    return NextResponse.json({ ok: false, configured: false, items: [] }, { status: 503 });
  }

  const url = new URL(request.url);
  const latitudeParam = url.searchParams.get("lat");
  const longitudeParam = url.searchParams.get("lng");
  try {
    const items = await autocompleteGooglePlaces(url.searchParams.get("input") || "", {
      latitude: latitudeParam === null ? null : Number(latitudeParam),
      longitude: longitudeParam === null ? null : Number(longitudeParam),
    });
    return NextResponse.json({ ok: true, configured: true, items }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.warn("Falha no autocomplete do Google Maps:", error);
    return NextResponse.json({ ok: false, configured: true, items: [], error: "Não foi possível buscar endereços agora." }, { status: 502 });
  }
}
