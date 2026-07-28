import { getAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: NO_STORE_HEADERS });
}

export async function GET(request: Request) {
  const { userId, profile, supabase } = await getAuthContext();
  const allowed =
    Boolean(userId) &&
    !profile?.is_blocked &&
    (profile?.role === "vip" || profile?.role === "admin");

  if (!allowed) return jsonError("Acesso VIP necessário.", 403);

  const url = new URL(request.url);
  const contentId = url.searchParams.get("id");
  if (!contentId) return jsonError("Conteúdo não informado.", 400);

  const { data: item, error } = await supabase
    .from("vip_content")
    .select("file_path")
    .eq("id", contentId)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !item?.file_path) return jsonError("Arquivo não encontrado.", 404);

  const { data, error: signedError } = await supabase.storage
    .from("vip-files")
    .createSignedUrl(item.file_path, 60);

  if (signedError || !data?.signedUrl) {
    return jsonError("Não foi possível liberar o arquivo.", 500);
  }

  return new Response(null, {
    status: 302,
    headers: {
      ...NO_STORE_HEADERS,
      Location: data.signedUrl,
    },
  });
}
