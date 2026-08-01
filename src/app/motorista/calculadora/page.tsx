import type { Metadata } from "next";
import { Calculator, Car } from "lucide-react";
import { DriverQuoteCalculator } from "@/components/DriverQuoteCalculator";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import { DEFAULT_DRIVER_SETTINGS, type DriverSettings, type DriverTripType } from "@/lib/driver";

export const metadata: Metadata = {
  title: "Calcular viagem particular",
  description: "Calcule um valor profissional para uma viagem particular usando quilômetros, horas e despesas.",
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
function valueOf(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }

export default async function DriverCalculatorPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, userId, profile } = await getAuthContext();
  let settings: DriverSettings = { user_id: userId ?? "guest", ...DEFAULT_DRIVER_SETTINGS };
  let reservationId: string | null = null;
  let initialInput = {
    customerName: valueOf(query.customerName),
    origin: valueOf(query.origin),
    destination: valueOf(query.destination),
    travelDate: valueOf(query.travelDate),
    tripType: (["outbound", "return", "round_trip"].includes(valueOf(query.tripType)) ? valueOf(query.tripType) : "outbound") as DriverTripType,
    notes: valueOf(query.notes),
  };

  if (userId) {
    const [{ data: settingsData }, reservationResult] = await Promise.all([
      supabase.from("driver_settings").select("*").eq("user_id", userId).maybeSingle(),
      valueOf(query.reservation)
        ? supabase.from("driver_reservations").select("id, passenger_name, origin, destination, travel_date, trip_type, notes").eq("id", valueOf(query.reservation)).eq("driver_user_id", userId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (settingsData) settings = settingsData as DriverSettings;
    if (reservationResult.data) {
      const item = reservationResult.data;
      reservationId = item.id;
      initialInput = {
        customerName: item.passenger_name ?? "",
        origin: item.origin ?? "",
        destination: item.destination ?? "",
        travelDate: item.travel_date ?? "",
        tripType: item.trip_type as DriverTripType,
        notes: item.notes ?? "",
      };
    }
  }

  return (
    <div className="page-stack driver-page">
      <PageHeader
        icon={<Calculator size={24} />}
        eyebrow={reservationId ? "RESERVA RECEBIDA" : "MOTORISTA PROFISSIONAL"}
        title={reservationId ? "Prepare o orçamento da solicitação" : "Quanto cobrar pela viagem?"}
        description={reservationId ? "Os dados enviados pelo passageiro já foram carregados. Complete distância, tempo e custos." : "Monte uma referência considerando distância, tempo trabalhado, espera, pedágios e custos extras."}
      />
      {!userId ? <div className="driver-public-notice"><Car size={20} /><div><strong>A calculadora é gratuita.</strong><p>Entre na conta para salvar seus valores padrão e manter um histórico de orçamentos.</p></div></div> : null}
      <DriverQuoteCalculator userId={userId} canSave={Boolean(userId && profile && !profile.is_blocked)} initialSettings={settings} initialInput={initialInput} reservationId={reservationId} />
    </div>
  );
}
