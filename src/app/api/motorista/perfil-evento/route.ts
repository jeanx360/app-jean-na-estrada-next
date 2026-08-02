import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  normalizeDriverCampaignCode,
  normalizeDriverMarketingSource,
} from "@/lib/driver-marketing";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const allowedEvents = new Set(["profile_view", "whatsapp_click", "reservation_started", "reservation_submitted"]);

function visitorHash(request: Request, slug: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return createHash("sha256").update(`${forwarded}|${userAgent}|${slug}`).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      driverSlug?: string;
      eventType?: string;
      source?: string;
      campaignCode?: string;
      packageId?: string | null;
    };
    const slug = String(body.driverSlug || "").trim().toLowerCase();
    const eventType = String(body.eventType || "");
    let source = normalizeDriverMarketingSource(body.source);
    const campaignCode = normalizeDriverCampaignCode(body.campaignCode);
    if (!slug || !allowedEvents.has(eventType)) return NextResponse.json({ ok: false }, { status: 400 });

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from("driver_public_profiles")
      .select("user_id")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (!profile) return NextResponse.json({ ok: true });

    let campaignId: string | null = null;
    if (campaignCode) {
      const { data: campaign } = await supabase
        .from("driver_marketing_campaigns")
        .select("id, source")
        .eq("user_id", profile.user_id)
        .eq("code", campaignCode)
        .eq("is_active", true)
        .maybeSingle();
      if (campaign) {
        campaignId = campaign.id;
        source = normalizeDriverMarketingSource(campaign.source);
      }
    }

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
    let duplicateQuery = supabase
      .from("driver_profile_events")
      .select("id", { count: "exact", head: true })
      .eq("driver_user_id", profile.user_id)
      .eq("event_type", eventType)
      .eq("source", source)
      .eq("visitor_hash", hash)
      .gte("created_at", since);

    duplicateQuery = campaignId
      ? duplicateQuery.eq("campaign_id", campaignId)
      : duplicateQuery.is("campaign_id", null);

    const { count } = await duplicateQuery;

    if (!count) {
      await supabase.from("driver_profile_events").insert({
        driver_user_id: profile.user_id,
        package_id: packageId,
        campaign_id: campaignId,
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
