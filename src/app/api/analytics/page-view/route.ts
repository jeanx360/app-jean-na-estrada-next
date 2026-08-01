import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function normalizePath(value: unknown) {
  const raw = String(value || "").trim().split("?")[0].split("#")[0];
  if (!raw.startsWith("/") || raw.length > 180) return null;
  if (raw.startsWith("/admin") || raw.startsWith("/api") || raw.startsWith("/_next")) return null;
  return raw.replace(/\/{2,}/g, "/");
}

function visitorHash(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return createHash("sha256").update(`${forwarded}|${userAgent}`).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { path?: string };
    const path = normalizePath(body.path);
    if (!path) return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });

    const admin = createAdminClient();
    const hash = visitorHash(request);
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("site_page_views")
      .select("id", { count: "exact", head: true })
      .eq("path", path)
      .eq("visitor_hash", hash)
      .gte("created_at", since);

    if (!count) {
      await admin.from("site_page_views").insert({ path, visitor_hash: hash });
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }
}
