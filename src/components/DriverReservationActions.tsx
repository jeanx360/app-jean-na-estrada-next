"use client";

import { useState, type ChangeEvent } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DRIVER_RESERVATION_STATUS_LABELS, type DriverReservation, type DriverReservationStatus } from "@/lib/driver-public";

type Props = { reservation: DriverReservation; hasQuote?: boolean; hasTrip?: boolean };

function suggestedNext(status: DriverReservationStatus, hasQuote: boolean, hasTrip: boolean): { status: DriverReservationStatus; label: string } | null {
  if (status === "new") return { status: "negotiating", label: "Iniciar atendimento" };
  if (status === "negotiating" && hasQuote) return { status: "quoted", label: "Marcar orçamento enviado" };
  if (status === "quoted") return { status: "confirmed", label: "Confirmar corrida" };
  if (status === "confirmed") return { status: "in_progress", label: "Iniciar corrida" };
  if (status === "in_progress" && hasTrip) return { status: "completed", label: "Marcar como concluída" };
  return null;
}

export function DriverReservationActions({ reservation, hasQuote = false, hasTrip = false }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<DriverReservationStatus>(reservation.status);
  const [selectedStatus, setSelectedStatus] = useState<DriverReservationStatus>(["cancelled", "declined"].includes(reservation.status) ? "negotiating" : reservation.status);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const next = suggestedNext(status, hasQuote, hasTrip);
  const manualStatuses = (Object.keys(DRIVER_RESERVATION_STATUS_LABELS) as DriverReservationStatus[]).filter((item) => !["cancelled", "declined"].includes(item));

  async function updateStatus(nextStatus: DriverReservationStatus) {
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.from("driver_reservations").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", reservation.id).eq("driver_user_id", reservation.driver_user_id);
    if (error) setMessage(error.message);
    else {
      setStatus(nextStatus);
      setSelectedStatus(nextStatus);
      setMessage(`Situação atualizada para “${DRIVER_RESERVATION_STATUS_LABELS[nextStatus]}”.`);
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <section className="driver-reservation-actions">
      <div><span className="eyebrow">PRÓXIMO PASSO</span><h2>Organize o atendimento</h2><p>Use o botão sugerido ou escolha outra situação abaixo.</p></div>

      {next ? (
        <button className="button button--primary" type="button" onClick={() => void updateStatus(next.status)} disabled={saving}>
          {saving ? <LoaderCircle className="auth-spinner" size={18} /> : next.status === "completed" || next.status === "confirmed" ? <CheckCircle2 size={18} /> : <ArrowRight size={18} />}
          {next.label}
        </button>
      ) : status === "completed" ? <div className="driver-reservation-action-complete"><CheckCircle2 size={22} /><span>Atendimento concluído</span></div> : null}

      <div className="driver-reservation-manual-status">
        <label><span>Outra situação</span><select value={selectedStatus} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedStatus(event.target.value as DriverReservationStatus)}>{manualStatuses.map((item) => <option key={item} value={item}>{DRIVER_RESERVATION_STATUS_LABELS[item]}</option>)}</select></label>
        <button className="button button--secondary" type="button" onClick={() => void updateStatus(selectedStatus)} disabled={saving || selectedStatus === status}><Save size={17} /> Salvar</button>
      </div>

      {saving ? <p className="driver-form-message"><LoaderCircle className="auth-spinner" size={16} /> Atualizando...</p> : message ? <p className="driver-form-message">{message}</p> : null}
    </section>
  );
}
