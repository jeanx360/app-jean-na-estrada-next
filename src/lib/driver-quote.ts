import { formatCurrency, type DriverQuote, type DriverQuoteStatus } from "@/lib/driver";
import { normalizeWhatsAppPhone } from "@/lib/driver-public";

export type DriverQuoteLineItemKind =
  | "distance"
  | "travel_time"
  | "waiting"
  | "maintenance"
  | "toll"
  | "parking"
  | "night"
  | "stops"
  | "return_service"
  | "luggage"
  | "other"
  | "discount";

export type DriverQuoteLineItem = {
  kind: DriverQuoteLineItemKind;
  label: string;
  amount: number;
};

export type DriverQuoteEvent = {
  id: string;
  quote_id: string;
  driver_user_id: string;
  actor_type: "driver" | "passenger" | "system";
  event_type: string;
  previous_status: DriverQuoteStatus | null;
  new_status: DriverQuoteStatus | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PublicDriverQuotePayload = {
  id: string;
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
  travel_date: string | null;
  travel_time: string | null;
  trip_type: DriverQuote["trip_type"];
  total_distance_km: number;
  billable_hours: number;
  rounded_total: number;
  discount: number;
  status: DriverQuoteStatus;
  notes: string | null;
  conditions: string | null;
  line_items: DriverQuoteLineItem[];
  valid_until: string;
  view_count: number;
  created_at: string;
  responded_at: string | null;
  response_message: string | null;
  driver: {
    display_name: string;
    slug: string | null;
    headline: string | null;
    city: string | null;
    service_area: string | null;
    whatsapp_phone: string | null;
    vehicle_name: string | null;
    vehicle_details: string | null;
    photo_url: string | null;
  };
};

export const DRIVER_QUOTE_STATUS_LABELS: Record<DriverQuoteStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  viewed: "Visualizado",
  accepted: "Aceito",
  declined: "Recusado",
  expired: "Expirado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const DRIVER_QUOTE_ACTIVE_STATUSES: DriverQuoteStatus[] = ["sent", "viewed"];
export const DRIVER_QUOTE_EDITABLE_STATUSES: DriverQuoteStatus[] = ["draft", "sent", "viewed"];

export function driverQuotePublicUrl(token: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/orcamento/${token}`;
}

export function driverQuoteRoute(quote: Pick<DriverQuote, "origin" | "destination">) {
  return [quote.origin, quote.destination].filter(Boolean).join(" → ") || "Serviço particular";
}

export function driverQuoteIsExpired(quote: Pick<DriverQuote, "status" | "valid_until">, reference = Date.now()) {
  if (["accepted", "declined", "completed", "cancelled", "expired"].includes(quote.status)) {
    return quote.status === "expired";
  }
  return new Date(quote.valid_until).getTime() < reference;
}

export function driverQuoteWhatsAppUrl(
  quote: Pick<DriverQuote, "public_token" | "customer_phone" | "customer_name" | "origin" | "destination" | "rounded_total" | "valid_until">,
) {
  const url = driverQuotePublicUrl(quote.public_token);
  const route = driverQuoteRoute(quote);
  const firstName = quote.customer_name?.trim().split(" ")[0] || "tudo bem";
  const expiration = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(quote.valid_until));
  const text = [
    `Olá, ${firstName}! Preparei seu orçamento de transporte particular.`,
    `Rota/serviço: ${route}.`,
    `Valor proposto: ${formatCurrency(Number(quote.rounded_total || 0))}.`,
    `Válido até ${expiration}.`,
    `Veja os detalhes e responda por este link: ${url}`,
  ].join("\n");
  const phone = normalizeWhatsAppPhone(quote.customer_phone || "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function normalizeQuoteLineItems(value: unknown): DriverQuoteLineItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      kind: typeof item.kind === "string" ? item.kind as DriverQuoteLineItemKind : "other",
      label: typeof item.label === "string" ? item.label.slice(0, 100) : "Item",
      amount: Number(item.amount || 0),
    }))
    .filter((item) => Number.isFinite(item.amount) && Math.abs(item.amount) >= 0.005 && item.label.trim().length > 0)
    .slice(0, 30);
}
