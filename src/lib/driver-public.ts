import { formatCurrency, type DriverTripType } from "@/lib/driver";

export type DriverProfileTheme = "dark" | "blue" | "green";
export type DriverPricingType = "fixed" | "starting_at" | "hourly" | "consult";
export type DriverReservationStatus =
  | "new"
  | "negotiating"
  | "quoted"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "declined";

export type DriverPublicProfile = {
  user_id: string;
  slug: string;
  display_name: string;
  headline: string | null;
  description: string | null;
  city: string | null;
  service_area: string | null;
  whatsapp_phone: string;
  vehicle_name: string | null;
  vehicle_details: string | null;
  seats: number;
  luggage_note: string | null;
  amenities: string[];
  availability_note: string | null;
  photo_url: string | null;
  theme: DriverProfileTheme;
  is_published: boolean;
  accepts_reservations: boolean;
  created_at: string;
  updated_at: string;
};

export type DriverServicePackage = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  pricing_type: DriverPricingType;
  price: number | null;
  route_summary: string | null;
  duration_label: string | null;
  includes: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DriverReservation = {
  id: string;
  driver_user_id: string;
  package_id: string | null;
  passenger_name: string;
  passenger_phone: string;
  origin: string | null;
  destination: string | null;
  travel_date: string | null;
  travel_time: string | null;
  trip_type: DriverTripType;
  passengers: number;
  luggage: string | null;
  notes: string | null;
  status: DriverReservationStatus;
  source: "profile" | "qr" | "whatsapp";
  quote_id: string | null;
  request_fingerprint_hash: string | null;
  contact_consent: boolean;
  created_at: string;
  updated_at: string;
  driver_service_packages?: Pick<DriverServicePackage, "id" | "title" | "pricing_type" | "price"> | null;
};

export const DRIVER_AMENITIES = [
  "Ar-condicionado",
  "Água",
  "Carregador USB",
  "Wi-Fi",
  "Cadeirinha infantil",
  "Pet friendly",
  "Bagageiro amplo",
  "Atendimento executivo",
] as const;

export const DRIVER_PRICING_LABELS: Record<DriverPricingType, string> = {
  fixed: "Preço fixo",
  starting_at: "A partir de",
  hourly: "Por hora",
  consult: "Sob consulta",
};

export const DRIVER_RESERVATION_STATUS_LABELS: Record<DriverReservationStatus, string> = {
  new: "Nova solicitação",
  negotiating: "Em negociação",
  quoted: "Orçamento enviado",
  confirmed: "Confirmada",
  completed: "Concluída",
  cancelled: "Cancelada",
  declined: "Recusada",
};

export function normalizeDriverSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 15);
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function formatDriverPackagePrice(item: Pick<DriverServicePackage, "pricing_type" | "price">) {
  if (item.pricing_type === "consult" || item.price === null) return "Solicite um orçamento";
  const price = formatCurrency(Number(item.price));
  if (item.pricing_type === "starting_at") return `A partir de ${price}`;
  if (item.pricing_type === "hourly") return `${price} por hora`;
  return price;
}

export function publicDriverUrl(slug: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/m/${slug}`;
}

export function reservationWhatsAppUrl(reservation: Pick<DriverReservation, "passenger_phone" | "passenger_name" | "origin" | "destination" | "travel_date" | "travel_time">) {
  const route = [reservation.origin, reservation.destination].filter(Boolean).join(" → ");
  const lines = [
    `Olá, ${reservation.passenger_name}! Aqui é o motorista do JNE App.`,
    route ? `Viagem solicitada: ${route}.` : "Recebi sua solicitação de corrida.",
    reservation.travel_date ? `Data: ${new Date(`${reservation.travel_date}T12:00:00`).toLocaleDateString("pt-BR")}.` : null,
    reservation.travel_time ? `Horário: ${reservation.travel_time.slice(0, 5)}.` : null,
    "Podemos confirmar os detalhes?",
  ].filter(Boolean).join("\n");
  return `https://wa.me/${normalizeWhatsAppPhone(reservation.passenger_phone)}?text=${encodeURIComponent(lines)}`;
}
