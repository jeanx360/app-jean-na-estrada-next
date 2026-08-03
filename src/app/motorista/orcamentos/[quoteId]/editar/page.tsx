import type { Metadata } from "next";
import { PencilLine } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { DriverProfessionalQuoteForm } from "@/components/DriverProfessionalQuoteForm";
import { PageHeader } from "@/components/PageHeader";
import { SmartBackButton } from "@/components/SmartBackButton";
import { requireDriverFeature } from "@/lib/account-plan";
import { DEFAULT_DRIVER_SETTINGS, type DriverQuote, type DriverSettings } from "@/lib/driver";
import { driverCustomerName, type DriverCustomer } from "@/lib/driver-crm";
import { normalizeQuoteLineItems } from "@/lib/driver-quote";

export const metadata: Metadata = { title: "Editar orçamento" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ quoteId: string }> };

export default async function EditDriverQuotePage({ params }: Props) {
  const { quoteId } = await params;
  const { supabase, userId } = await requireDriverFeature("quotes", `/motorista/orcamentos/${quoteId}/editar`);

  const [{ data: quoteData }, { data: settingsData }, { data: customerData }] = await Promise.all([
    supabase.from("driver_quotes").select("*").eq("id", quoteId).eq("user_id", userId).maybeSingle(),
    supabase.from("driver_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("driver_customers").select("*").eq("user_id", userId).eq("is_archived", false).order("last_contact_at", { ascending: false }).limit(300),
  ]);
  if (!quoteData) notFound();

  const quote = quoteData as DriverQuote;
  if (!["draft", "sent", "viewed", "expired"].includes(quote.status)) redirect(`/motorista/orcamentos/${quote.id}`);
  const settings = (settingsData as DriverSettings | null) ?? { user_id: userId, ...DEFAULT_DRIVER_SETTINGS };
  const customers = ((customerData ?? []) as DriverCustomer[]).map((customer) => ({ id: customer.id, name: driverCustomerName(customer), phone: customer.phone }));
  const items = normalizeQuoteLineItems(quote.line_items);
  const itemAmount = (kind: string) => items.filter((item) => item.kind === kind).reduce((total, item) => total + Math.max(0, Number(item.amount || 0)), 0);
  const otherItem = items.find((item) => item.kind === "other");
  const validDays = Math.max(1, Math.ceil((new Date(quote.valid_until).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

  return (
    <div className="page-stack driver-page">
      <SmartBackButton className="text-link driver-back-link" fallbackHref={`/motorista/orcamentos/${quote.id}`} label="Voltar ao orçamento" />
      <PageHeader icon={<PencilLine size={24} />} eyebrow="PROPOSTA PROFISSIONAL" title="Editar orçamento" description="A edição cria uma nova versão no histórico e mantém o mesmo link público." />
      <DriverProfessionalQuoteForm
        quoteId={quote.id}
        settings={settings}
        customers={customers}
        initial={{
          customerId: quote.customer_id || "",
          reservationId: quote.reservation_id || "",
          customerName: quote.customer_name || "",
          customerPhone: quote.customer_phone || "",
          origin: quote.origin || "",
          destination: quote.destination || "",
          travelDate: quote.travel_date || "",
          travelTime: quote.travel_time || "",
          tripType: quote.trip_type,
          distancePerLegKm: Number(quote.distance_per_leg_km || 0),
          durationPerLegMinutes: Number(quote.duration_per_leg_minutes || 0),
          waitingMinutes: Number(quote.waiting_minutes || 0),
          tolls: itemAmount("toll") || Number(quote.tolls || 0),
          parking: itemAmount("parking") || Number(quote.parking || 0),
          nightSurcharge: itemAmount("night"),
          extraStops: itemAmount("stops"),
          returnService: itemAmount("return_service"),
          luggageService: itemAmount("luggage"),
          otherCosts: itemAmount("other"),
          otherCostsLabel: otherItem?.label || "Outros custos",
          discount: Number(quote.discount || 0),
          kmRate: Number(quote.km_rate || 0),
          hourlyRate: Number(quote.hourly_rate || 0),
          waitingRate: Number(quote.waiting_hour_rate || 0),
          minimumFare: Number(quote.minimum_fare || 0),
          reservePercent: Number(quote.maintenance_reserve_percent || 0),
          roundingStep: Number(quote.rounding_step || 0),
          validDays,
          notes: quote.notes || "",
          conditions: quote.conditions || "",
        }}
      />
    </div>
  );
}
