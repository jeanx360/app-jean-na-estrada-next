import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { DriverTripForm } from "@/components/DriverTripForm";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import type { DriverQuote } from "@/lib/driver";

export const metadata: Metadata = { title: "Registrar viagem" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ quote?: string }> };

export default async function NewDriverTripPage({ searchParams }: Props) {
  const { quote: quoteId } = await searchParams;
  const { supabase, userId } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista/financeiro/nova");

  let quote: DriverQuote | null = null;
  if (quoteId) {
    const { data } = await supabase.from("driver_quotes").select("*").eq("id", quoteId).eq("user_id", userId).maybeSingle();
    quote = data ? data as DriverQuote : null;
  }

  return (
    <div className="page-stack driver-page">
      <PageHeader icon={<Plus size={24} />} eyebrow="CONTROLE FINANCEIRO" title="Registrar viagem" description="Informe o valor combinado, o que já recebeu e as despesas para acompanhar o resultado real." />
      <DriverTripForm userId={userId} quote={quote} />
    </div>
  );
}
