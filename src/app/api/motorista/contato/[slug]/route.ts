import { NextResponse } from "next/server";
import {
  driverMarketingUrl,
  normalizeDriverCampaignCode,
  normalizeDriverMarketingSource,
} from "@/lib/driver-marketing";
import { normalizeWhatsAppPhone } from "@/lib/driver-public";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function escapeVCard(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "motorista";
}

export async function GET(request: Request, { params }: RouteContext) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim().toLowerCase().slice(0, 48);
  if (!slug) return new NextResponse("Contato não encontrado.", { status: 404 });

  const url = new URL(request.url);
  const source = normalizeDriverMarketingSource(url.searchParams.get("src"));
  const campaignCode = normalizeDriverCampaignCode(url.searchParams.get("cmp"));
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("driver_public_profiles")
    .select("slug, display_name, headline, city, service_area, whatsapp_phone, vehicle_name, photo_url")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!profile) return new NextResponse("Contato não encontrado.", { status: 404 });

  const phone = normalizeWhatsAppPhone(profile.whatsapp_phone || "");
  const profileUrl = driverMarketingUrl(profile.slug, source, campaignCode);
  const notes = [
    profile.headline || "Motorista particular",
    profile.service_area || profile.city || null,
    profile.vehicle_name ? `Veículo: ${profile.vehicle_name}` : null,
    "Contato profissional salvo pelo JNE App.",
  ].filter(Boolean).join(" | ");

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(profile.display_name)}`,
    `N:;${escapeVCard(profile.display_name)};;;`,
    "ORG:JNE App",
    `TITLE:${escapeVCard(profile.headline || "Motorista particular")}`,
    phone ? `TEL;TYPE=CELL,VOICE:+${phone}` : null,
    `URL:${escapeVCard(profileUrl)}`,
    profile.city ? `ADR;TYPE=WORK:;;;${escapeVCard(profile.city)};;;Brasil` : null,
    profile.photo_url ? `PHOTO;VALUE=URI:${escapeVCard(profile.photo_url)}` : null,
    `NOTE:${escapeVCard(notes)}`,
    "END:VCARD",
  ].filter(Boolean);

  const body = `${lines.join("\r\n")}\r\n`;
  const filename = `${safeFileName(profile.display_name)}-motorista.vcf`;

  return new NextResponse(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/vcard; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
