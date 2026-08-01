"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { revalidateDriverData } from "@/lib/driver-client";
import { createClient } from "@/lib/supabase/client";

type Props = {
  kind: "trip" | "quote";
  recordId: string;
  userId: string;
  reservationId?: string | null;
  quoteId?: string | null;
  linkedTrip?: boolean;
  className?: string;
};

export function DriverRecordDeleteButton({
  kind,
  recordId,
  userId,
  reservationId,
  quoteId,
  linkedTrip = false,
  className = "",
}: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    const confirmation = kind === "trip"
      ? "Excluir esta viagem e todos os lançamentos financeiros vinculados? Esta ação não pode ser desfeita."
      : linkedTrip
        ? "Excluir este orçamento? A viagem registrada será mantida, mas perderá o vínculo com o orçamento. Esta ação não pode ser desfeita."
        : "Excluir este orçamento permanentemente? Esta ação não pode ser desfeita.";

    if (!window.confirm(confirmation)) return;

    setDeleting(true);
    const supabase = createClient();
    const table = kind === "trip" ? "driver_trips" : "driver_quotes";
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", recordId)
      .eq("user_id", userId);

    if (error) {
      window.alert(`Não foi possível excluir ${kind === "trip" ? "a viagem" : "o orçamento"}: ${error.message}`);
      setDeleting(false);
      return;
    }

    if (kind === "trip" && reservationId) {
      await supabase
        .from("driver_reservations")
        .update({
          status: quoteId ? "quoted" : "negotiating",
          updated_at: new Date().toISOString(),
        })
        .eq("id", reservationId)
        .eq("driver_user_id", userId);
    }

    await revalidateDriverData(kind === "trip" ? recordId : undefined);
    setDeleting(false);
    router.refresh();
  }

  const label = kind === "trip" ? "Excluir viagem" : "Excluir orçamento";

  return (
    <button
      className={`icon-button driver-list-delete ${className}`.trim()}
      type="button"
      onClick={() => void remove()}
      disabled={deleting}
      aria-label={label}
      title={label}
    >
      {deleting ? <LoaderCircle className="auth-spinner" size={17} /> : <Trash2 size={17} />}
    </button>
  );
}
