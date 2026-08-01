"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { revalidateDriverData } from "@/lib/driver-client";
import { DRIVER_TRIP_STATUS_LABELS, type DriverTripStatus } from "@/lib/driver";

type Props = {
  tripId: string;
  initialStatus: DriverTripStatus;
  reservationId?: string | null;
  quoteId?: string | null;
};

export function DriverTripActions({ tripId, initialStatus, reservationId, quoteId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.from("driver_trips").update({ status, updated_at: new Date().toISOString() }).eq("id", tripId);
    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    if (reservationId) {
      const reservationStatus = status === "completed" ? "completed" : status === "cancelled" ? "cancelled" : "confirmed";
      await supabase.from("driver_reservations").update({ status: reservationStatus, updated_at: new Date().toISOString() }).eq("id", reservationId);
    }
    if (quoteId) {
      const quoteStatus = status === "completed" ? "completed" : status === "cancelled" ? "cancelled" : "accepted";
      await supabase.from("driver_quotes").update({ status: quoteStatus, updated_at: new Date().toISOString() }).eq("id", quoteId);
    }

    await revalidateDriverData(tripId);
    setMessage(status === "completed" ? "Viagem concluída, reserva e resumo mensal atualizados." : "Status atualizado.");
    setSaving(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("Excluir a viagem e todos os lançamentos financeiros?")) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("driver_trips").delete().eq("id", tripId);
    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }
    if (reservationId) {
      await supabase.from("driver_reservations").update({ status: quoteId ? "quoted" : "negotiating", updated_at: new Date().toISOString() }).eq("id", reservationId);
    }
    await revalidateDriverData(tripId);
    router.push("/motorista/financeiro");
    router.refresh();
  }

  return (
    <section className="driver-trip-actions">
      <label><span>Status da viagem</span><select value={status} onChange={(e) => setStatus(e.target.value as DriverTripStatus)}>{(Object.keys(DRIVER_TRIP_STATUS_LABELS) as DriverTripStatus[]).map((item) => <option key={item} value={item}>{DRIVER_TRIP_STATUS_LABELS[item]}</option>)}</select></label>
      <button className="button button--secondary" type="button" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="auth-spinner" size={17} /> : <Save size={17} />}Salvar status</button>
      <button className="button button--ghost driver-danger-button" type="button" onClick={remove} disabled={saving}><Trash2 size={17} />Excluir viagem</button>
      {message ? <p className="driver-form-message">{message}</p> : null}
    </section>
  );
}
