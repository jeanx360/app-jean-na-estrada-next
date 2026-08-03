import type { Metadata } from "next";
import { FilePlus2 } from "lucide-react";
import { redirect } from "next/navigation";
import { DriverProfessionalQuoteForm } from "@/components/DriverProfessionalQuoteForm";
import { PageHeader } from "@/components/PageHeader";
import { SmartBackButton } from "@/components/SmartBackButton";
import { requireDriverFeature } from "@/lib/account-plan";
import { DEFAULT_DRIVER_SETTINGS, type DriverSettings } from "@/lib/driver";
import { driverCustomerName, type DriverCustomer } from "@/lib/driver-crm";
import type { DriverReservation } from "@/lib/driver-public";

export const metadata: Metadata = { title: "Novo orçamento profissional" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ customer?: string; reservation?: string }> };

export default async function NewDriverQuotePage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, userId } = await requireDriverFeature("quotes", "/motorista/orcamentos/novo");

  const [{ data: settingsData }, { data: customerData }, { data: reservationData }] = await Promise.all([
    supabase.from("driver_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("driver_customers").select("*").eq("user_id", userId).eq("is_archived", false).order("last_contact_at", { ascending: false }).limit(300),
    query.reservation
      ? supabase.from("driver_reservations").select("*").eq("id", query.reservation).eq("driver_user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const settings = (settingsData as DriverSettings | null) ?? { user_id: userId, ...DEFAULT_DRIVER_SETTINGS };
  const customers = ((customerData ?? []) as DriverCustomer[]).map((customer) => ({
    id: customer.id,
    name: driverCustomerName(customer),
    phone: customer.phone,
  }));
  const selectedCustomer = ((customerData ?? []) as DriverCustomer[]).find((customer) => customer.id === query.customer) ?? null;
  const reservation = reservationData as DriverReservation | null;

  return (
    <div className="page-stack driver-page">
      <SmartBackButton className="text-link driver-back-link" fallbackHref="/motorista/orcamentos" label="Voltar aos orçamentos" />
      <PageHeader icon={<FilePlus2 size={24} />} eyebrow="PROPOSTA PROFISSIONAL" title="Novo orçamento" description="Monte a proposta, defina a validade e gere um link para o passageiro aceitar ou recusar pelo celular." />
      <DriverProfessionalQuoteForm
        settings={settings}
        customers={customers}
        initial={{
          customerId: selectedCustomer?.id || reservation?.customer_id || "",
          reservationId: reservation?.id || "",
          customerName: selectedCustomer ? driverCustomerName(selectedCustomer) : reservation?.passenger_name || "",
          customerPhone: selectedCustomer?.phone || reservation?.passenger_phone || "",
          origin: reservation?.origin || "",
          destination: reservation?.destination || "",
          travelDate: reservation?.travel_date || "",
          travelTime: reservation?.travel_time || "",
          tripType: reservation?.trip_type || "outbound",
          notes: reservation?.notes || "",
        }}
      />
    </div>
  );
}
