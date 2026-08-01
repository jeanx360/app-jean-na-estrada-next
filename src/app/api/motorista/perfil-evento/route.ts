import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const allowedEvents = new Set(["profile_view", "whatsapp_click", "reservation_started", "reservation_submitted"]);
const allowedSources = new Set(["profile", "qr", "shared_link"]);

function visitorHash(request: Request, slug: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return createHash("sha256").update(`${forwarded}|${userAgent}|${slug}`).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { driverSlug?: string; eventType?: string; source?: string; packageId?: string | null };
    const slug = String(body.driverSlug || "").trim().toLowerCase();
    const eventType = String(body.eventType || "");
    const source = allowedSources.has(String(body.source)) ? String(body.source) : "profile";
    if (!slug || !allowedEvents.has(eventType)) return NextResponse.json({ ok: false }, { status: 400 });

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("driver_public_profiles")
      .select("user_id")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (!profile) return NextResponse.json({ ok: true });

    let packageId: string | null = null;
    if (body.packageId) {
      const { data: packageItem } = await supabase
        .from("driver_service_packages")
        .select("id")
        .eq("id", body.packageId)
        .eq("user_id", profile.user_id)
        .eq("is_active", true)
        .maybeSingle();
      packageId = packageItem?.id ?? null;
    }

    const hash = visitorHash(request, slug);
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("driver_profile_events")
      .select("id", { count: "exact", head: true })
      .eq("driver_user_id", profile.user_id)
      .eq("event_type", eventType)
      .eq("visitor_hash", hash)
      .gte("created_at", since);

    if (!count) {
      await supabase.from("driver_profile_events").insert({
        driver_user_id: profile.user_id,
        package_id: packageId,
        event_type: eventType,
        source,
        visitor_hash: hash,
      });
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }
}
