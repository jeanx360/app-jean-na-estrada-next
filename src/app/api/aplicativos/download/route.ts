import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) return noStore(NextResponse.json({ error: "Aplicativo não informado." }, { status: 400 }));

  const admin = createAdminClient();
  const { data: item, error } = await admin
    .from("public_contents")
    .select("id, content_type, external_url, metadata, is_published, published_at")
    .eq("id", id)
    .eq("content_type", "application")
    .maybeSingle();

  if (error || !item || !item.is_published) {
    return noStore(NextResponse.json({ error: "Aplicativo não encontrado." }, { status: 404 }));
  }
  if (item.published_at && new Date(item.published_at).getTime() > Date.now()) {
    return noStore(NextResponse.json({ error: "Aplicativo ainda não publicado." }, { status: 404 }));
  }

  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  const accessLevel = text(metadata.accessLevel) === "vip" ? "vip" : "public";
  const deliveryType = text(metadata.deliveryType) === "upload" ? "upload" : "external";

  if (accessLevel === "vip") {
    const auth = await getAuthContext();
    if (!auth.userId || !auth.profile || auth.profile.is_blocked || !["vip", "admin"].includes(auth.profile.role)) {
      const loginUrl = new URL("/entrar", request.url);
      loginUrl.searchParams.set("next", `/api/aplicativos/download?id=${id}`);
      return noStore(NextResponse.redirect(loginUrl, 303));
    }
  }

  if (deliveryType === "external" && item.external_url) {
    return noStore(NextResponse.redirect(item.external_url, 302));
  }

  const filePath = text(metadata.filePath);
  if (!filePath) {
    return noStore(NextResponse.json({ error: "Arquivo não disponível." }, { status: 404 }));
  }

  const { data: signed, error: signedError } = await admin.storage.from("app-files").createSignedUrl(filePath, 60);
  if (signedError || !signed?.signedUrl) {
    return noStore(NextResponse.json({ error: "Não foi possível gerar o download." }, { status: 500 }));
  }

  return noStore(NextResponse.redirect(signed.signedUrl, 302));
}
