import { normalizeWhatsAppPhone } from "@/lib/driver-public";

export type DriverCustomerTag = "frequent" | "airport" | "corporate" | "vip" | "long_trip";

export type DriverCustomer = {
  id: string;
  user_id: string;
  display_name: string;
  custom_name: string | null;
  phone: string;
  phone_normalized: string;
  tags: DriverCustomerTag[];
  private_notes: string | null;
  contact_consent: boolean;
  is_archived: boolean;
  first_contact_at: string;
  last_contact_at: string;
  created_at: string;
  updated_at: string;
};

export type DriverCustomerOverview = DriverCustomer & {
  reservations_total: number;
  completed_reservations: number;
  completed_trips: number;
  total_revenue: number;
  last_service_at: string | null;
};

export const DRIVER_CUSTOMER_TAG_LABELS: Record<DriverCustomerTag, string> = {
  frequent: "Frequente",
  airport: "Aeroporto",
  corporate: "Corporativo",
  vip: "VIP",
  long_trip: "Viagem longa",
};

export const DRIVER_CUSTOMER_TAGS = Object.keys(DRIVER_CUSTOMER_TAG_LABELS) as DriverCustomerTag[];

export function driverCustomerName(customer: Pick<DriverCustomer, "custom_name" | "display_name">) {
  return customer.custom_name?.trim() || customer.display_name;
}

export function driverCustomerWhatsAppUrl(customer: Pick<DriverCustomer, "custom_name" | "display_name" | "phone">) {
  const name = driverCustomerName(customer).split(" ")[0] || "tudo bem";
  const message = `Olá, ${name}! Aqui é o motorista que você encontrou pelo JNE App. Como posso ajudar?`;
  return `https://wa.me/${normalizeWhatsAppPhone(customer.phone)}?text=${encodeURIComponent(message)}`;
}

export function formatDriverCustomerPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return value;
}

export function isDriverCustomerInactive(customer: Pick<DriverCustomer, "last_contact_at" | "is_archived">, reference = Date.now()) {
  if (customer.is_archived) return false;
  const lastContact = new Date(customer.last_contact_at).getTime();
  if (!Number.isFinite(lastContact)) return false;
  return lastContact < reference - 90 * 24 * 60 * 60 * 1000;
}
