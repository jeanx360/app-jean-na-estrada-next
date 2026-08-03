export const DRIVER_MARKETING_SOURCES = [
  "profile",
  "qr",
  "qr_car",
  "qr_card",
  "instagram",
  "youtube",
  "tiktok",
  "whatsapp",
  "shared_link",
  "network",
  "other",
] as const;

export type DriverMarketingSource = (typeof DRIVER_MARKETING_SOURCES)[number];

export const DRIVER_PUBLIC_EVENT_TYPES = [
  "profile_view",
  "whatsapp_click",
  "reservation_cta",
  "reservation_started",
  "reservation_submitted",
  "contact_save",
  "profile_share",
] as const;

export type DriverPublicEventType = (typeof DRIVER_PUBLIC_EVENT_TYPES)[number];

export type DriverMarketingCampaign = {
  id: string;
  user_id: string;
  name: string;
  code: string;
  source: DriverMarketingSource;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const DRIVER_MARKETING_SOURCE_LABELS: Record<DriverMarketingSource, string> = {
  profile: "Acesso direto",
  qr: "QR Code antigo",
  qr_car: "QR no veículo",
  qr_card: "Cartão impresso",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  shared_link: "Link compartilhado",
  network: "Rede de motoristas",
  other: "Outra origem",
};

export const DRIVER_CAMPAIGN_SOURCE_OPTIONS = [
  "qr_car",
  "qr_card",
  "instagram",
  "youtube",
  "tiktok",
  "whatsapp",
  "shared_link",
  "other",
] as const satisfies readonly DriverMarketingSource[];

export function normalizeDriverMarketingSource(value: unknown): DriverMarketingSource {
  const source = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (DRIVER_MARKETING_SOURCES as readonly string[]).includes(source)
    ? (source as DriverMarketingSource)
    : "profile";
}

export function normalizeDriverCampaignCode(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function driverMarketingUrl(
  slug: string,
  source: DriverMarketingSource,
  campaignCode = "",
  serviceId = "",
) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const params = new URLSearchParams();
  params.set("src", source);
  const normalizedCampaign = normalizeDriverCampaignCode(campaignCode);
  if (normalizedCampaign) params.set("cmp", normalizedCampaign);
  if (serviceId) params.set("servico", serviceId);
  return `${base}/m/${encodeURIComponent(slug)}?${params.toString()}`;
}

export function driverMarketingRelativeUrl(
  slug: string,
  source: DriverMarketingSource,
  campaignCode = "",
  serviceId = "",
) {
  const absolute = driverMarketingUrl(slug, source, campaignCode, serviceId);
  const parsed = new URL(absolute);
  return `${parsed.pathname}${parsed.search}`;
}

export function driverContactUrl(
  slug: string,
  source: DriverMarketingSource,
  campaignCode = "",
) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const params = new URLSearchParams();
  params.set("src", source);
  const normalizedCampaign = normalizeDriverCampaignCode(campaignCode);
  if (normalizedCampaign) params.set("cmp", normalizedCampaign);
  return `${base}/api/motorista/contato/${encodeURIComponent(slug)}?${params.toString()}`;
}

export function driverContactRelativeUrl(
  slug: string,
  source: DriverMarketingSource,
  campaignCode = "",
) {
  const absolute = driverContactUrl(slug, source, campaignCode);
  const parsed = new URL(absolute);
  return `${parsed.pathname}${parsed.search}`;
}
