import { normalizeWhatsAppPhone } from "@/lib/driver-public";

export const DRIVER_NETWORK_SERVICE_TYPES = [
  "airport",
  "intercity",
  "events",
  "executive",
  "hourly",
  "tourism",
  "accessible",
  "pet",
  "other",
] as const;

export const DRIVER_NETWORK_ACCESSIBILITY_FEATURES = [
  "reduced_mobility",
  "wheelchair_support",
  "hearing_support",
  "visual_support",
  "child_seat",
] as const;

export type DriverNetworkServiceType = (typeof DRIVER_NETWORK_SERVICE_TYPES)[number];
export type DriverNetworkAccessibilityFeature = (typeof DRIVER_NETWORK_ACCESSIBILITY_FEATURES)[number];
export type DriverNetworkVerificationStatus = "pending" | "verified" | "rejected";
export type DriverReferralStatus = "pending" | "accepted" | "declined" | "cancelled";

export const DRIVER_NETWORK_SERVICE_LABELS: Record<DriverNetworkServiceType, string> = {
  airport: "Aeroportos",
  intercity: "Viagens intermunicipais",
  events: "Eventos",
  executive: "Atendimento executivo",
  hourly: "Motorista por hora",
  tourism: "Turismo",
  accessible: "Atendimento acessível",
  pet: "Transporte pet friendly",
  other: "Outros serviços",
};

export const DRIVER_NETWORK_ACCESSIBILITY_LABELS: Record<DriverNetworkAccessibilityFeature, string> = {
  reduced_mobility: "Apoio para mobilidade reduzida",
  wheelchair_support: "Apoio a passageiro com cadeira de rodas",
  hearing_support: "Atendimento a pessoa com deficiência auditiva",
  visual_support: "Atendimento a pessoa com deficiência visual",
  child_seat: "Cadeirinha infantil",
};

export const DRIVER_NETWORK_VERIFICATION_LABELS: Record<DriverNetworkVerificationStatus, string> = {
  pending: "Aguardando verificação",
  verified: "Motorista verificado",
  rejected: "Verificação recusada",
};

export const DRIVER_REFERRAL_STATUS_LABELS: Record<DriverReferralStatus, string> = {
  pending: "Aguardando resposta",
  accepted: "Aceita",
  declined: "Recusada",
  cancelled: "Cancelada",
};

export type DriverNetworkSettings = {
  user_id: string;
  opted_in: boolean;
  verification_status: DriverNetworkVerificationStatus;
  region: string | null;
  service_types: DriverNetworkServiceType[];
  accessibility_features: DriverNetworkAccessibilityFeature[];
  network_note: string | null;
  accepts_referrals: boolean;
  share_contact_with_network: boolean;
  verified_at: string | null;
  verified_by: string | null;
  verification_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DriverNetworkMember = {
  user_id: string;
  slug: string;
  display_name: string;
  headline: string | null;
  city: string | null;
  service_area: string | null;
  vehicle_name: string | null;
  vehicle_details: string | null;
  seats: number;
  amenities: string[];
  photo_url: string | null;
  theme: string;
  region: string | null;
  service_types: DriverNetworkServiceType[];
  accessibility_features: DriverNetworkAccessibilityFeature[];
  network_note: string | null;
  accepts_referrals: boolean;
  is_verified: boolean;
  whatsapp_phone?: string | null;
};

export type DriverReferral = {
  id: string;
  sender_user_id: string;
  recipient_user_id: string;
  reservation_id: string | null;
  accepted_reservation_id: string | null;
  sender_display_name: string;
  recipient_display_name: string;
  sender_whatsapp_phone: string | null;
  recipient_whatsapp_phone: string | null;
  passenger_name: string;
  passenger_phone: string;
  origin: string | null;
  destination: string | null;
  travel_date: string | null;
  travel_time: string | null;
  trip_type: "outbound" | "return" | "round_trip";
  passengers: number;
  luggage: string | null;
  notes: string | null;
  sender_message: string | null;
  recipient_message: string | null;
  passenger_contact_consent: boolean;
  status: DriverReferralStatus;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DriverNetworkMetrics = {
  directory_views: number;
  directory_contacts: number;
  referrals_sent: number;
  referrals_received: number;
  referrals_accepted: number;
};

export function normalizeNetworkPhone(value: string | null | undefined) {
  return normalizeWhatsAppPhone(value || "");
}

export function driverNetworkWhatsAppUrl(phone: string | null | undefined, driverName: string) {
  const normalized = normalizeNetworkPhone(phone);
  if (!normalized) return null;
  const text = `Olá, ${driverName}! Encontrei você na Rede de Motoristas do JNE App.`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export function referralWhatsAppUrl(referral: DriverReferral, currentUserId: string) {
  const isSender = referral.sender_user_id === currentUserId;
  const phone = isSender ? referral.recipient_whatsapp_phone : referral.sender_whatsapp_phone;
  const name = isSender ? referral.recipient_display_name : referral.sender_display_name;
  const normalized = normalizeNetworkPhone(phone);
  if (!normalized) return null;
  const route = [referral.origin, referral.destination].filter(Boolean).join(" → ");
  const lines = [
    `Olá, ${name}! Sobre a indicação enviada pela Rede de Motoristas do JNE App:`,
    route || "corrida particular",
    `Passageiro: ${referral.passenger_name}.`,
  ];
  return `https://wa.me/${normalized}?text=${encodeURIComponent(lines.join("\n"))}`;
}
