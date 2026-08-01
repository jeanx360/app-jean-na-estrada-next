import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { DriverTripForm } from "@/components/DriverTripForm";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import type { DriverQuote } from "@/lib/driver";

export const metadata: Metadata = { title: "Registrar viagem" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ quote?: string; reservation?: string }> };

export default async function NewDriverTripPage({ searchParams }: Props) {
  const { quote: quoteParam, reservation: reservationParam } = await searchParams;
  const { supabase, userId } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista/financeiro/nova");

  let reservationId = reservationParam ?? null;
  let quoteId = quoteParam ?? null;

  if (reservationId) {
    const { data: reservation } = await supabase
      .from("driver_reservations")
      .select("id,quote_id")
      .eq("id", reservationId)
      .eq("driver_user_id", userId)
      .maybeSingle();
    if (!reservation) reservationId = null;
    else if (!quoteId && reservation.quote_id) quoteId = reservation.quote_id;
  }

  let quote: DriverQuote | null = null;
  if (quoteId) {
    const { data } = await supabase.from("driver_quotes").select("*").eq("id", quoteId).eq("user_id", userId).maybeSingle();
    quote = data ? data as DriverQuote : null;
  }

  return (
    <div className="page-stack driver-page">
      <PageHeader
        icon={<Plus size={24} />}
        eyebrow={reservationId ? "RESERVA CONFIRMADA" : "CONTROLE FINANCEIRO"}
        title="Registrar viagem"
        description={reservationId ? "Os dados do orçamento já foram carregados. Confirme o valor combinado e salve a viagem." : "Informe o valor combinado, o que já recebeu e as despesas para acompanhar o resultado real."}
      />
      <DriverTripForm userId={userId} quote={quote} reservationId={reservationId} />
    </div>
  );
}
