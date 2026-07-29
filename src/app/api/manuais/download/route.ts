import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) return noStore(NextResponse.json({ error: "Documento não informado." }, { status: 400 }));

  const admin = createAdminClient();
  const { data: document, error } = await admin
    .from("vehicle_documents")
    .select("id, source_type, external_url, file_path, access_level, is_published, published_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !document || !document.is_published) {
    return noStore(NextResponse.json({ error: "Documento não encontrado." }, { status: 404 }));
  }
  if (document.published_at && new Date(document.published_at).getTime() > Date.now()) {
    return noStore(NextResponse.json({ error: "Documento ainda não publicado." }, { status: 404 }));
  }

  if (document.access_level === "vip") {
    const auth = await getAuthContext();
    if (!auth.userId || !auth.profile || auth.profile.is_blocked || !["vip", "admin"].includes(auth.profile.role)) {
      const loginUrl = new URL("/entrar", request.url);
      loginUrl.searchParams.set("next", `/api/manuais/download?id=${id}`);
      return noStore(NextResponse.redirect(loginUrl, 303));
    }
  }

  if (document.source_type === "external" && document.external_url) {
    return noStore(NextResponse.redirect(document.external_url, 302));
  }

  if (!document.file_path) {
    return noStore(NextResponse.json({ error: "Arquivo não disponível." }, { status: 404 }));
  }

  const { data: signed, error: signedError } = await admin.storage
    .from("vehicle-documents")
    .createSignedUrl(document.file_path, 60);

  if (signedError || !signed?.signedUrl) {
    return noStore(NextResponse.json({ error: "Não foi possível gerar o acesso ao documento." }, { status: 500 }));
  }

  return noStore(NextResponse.redirect(signed.signedUrl, 302));
}
