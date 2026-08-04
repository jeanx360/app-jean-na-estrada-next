import { Ban, CalendarClock, Copy, Save } from "lucide-react";
import {
  cancelDriverReservationAction,
  duplicateDriverReservationAction,
  rescheduleDriverReservationAction,
} from "@/app/motorista/reservas/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import type { DriverReservation } from "@/lib/driver-public";
import { formatBrazilDateTime } from "@/lib/date-time";

type Props = {
  reservation: DriverReservation;
  compact?: boolean;
};

export function DriverReservationManagementForms({ reservation, compact = false }: Props) {
  const terminal = ["completed", "cancelled", "declined"].includes(reservation.status);
  const cancelled = ["cancelled", "declined"].includes(reservation.status);

  return (
    <div className={`driver-reservation-tools${compact ? " driver-reservation-tools--compact" : ""}`}>
      {!terminal ? (
        <details>
          <summary><CalendarClock size={16} /> Remarcar</summary>
          <form action={rescheduleDriverReservationAction} className="driver-reservation-tool-form">
            <input type="hidden" name="reservationId" value={reservation.id} />
            <label>
              <span>Nova data</span>
              <input type="date" name="travelDate" lang="pt-BR" defaultValue={reservation.travel_date ?? ""} required />
            </label>
            <label>
              <span>Novo horário (24h)</span>
              <input type="time" name="travelTime" lang="pt-BR" defaultValue={reservation.travel_time?.slice(0, 5) ?? ""} />
            </label>
            {reservation.has_return ? <><label><span>Nova data da volta</span><input type="date" name="returnDate" lang="pt-BR" defaultValue={reservation.return_date ?? ""} required /></label><label><span>Novo horário da volta</span><input type="time" name="returnTime" lang="pt-BR" defaultValue={reservation.return_time?.slice(0, 5) ?? ""} required /></label></> : null}
            <label>
              <span>Duração prevista (min)</span>
              <input type="number" name="durationMinutes" min={15} max={720} step={15} defaultValue={reservation.duration_minutes || 60} required />
            </label>
            <button className="button button--primary button--compact" type="submit"><Save size={16} /> Salvar remarcação</button>
          </form>
        </details>
      ) : null}

      <form action={duplicateDriverReservationAction}>
        <input type="hidden" name="reservationId" value={reservation.id} />
        <ConfirmSubmitButton
          className="button button--secondary button--compact"
          message="Duplicar esta reserva para criar um novo atendimento com os mesmos dados?"
        >
          <Copy size={16} /> Duplicar
        </ConfirmSubmitButton>
      </form>

      {!terminal ? (
        <details className="driver-reservation-tool-cancel">
          <summary><Ban size={16} /> Cancelar ou recusar</summary>
          <form action={cancelDriverReservationAction} className="driver-reservation-tool-form">
            <input type="hidden" name="reservationId" value={reservation.id} />
            <label>
              <span>Ação</span>
              <select name="terminalStatus" defaultValue="cancelled">
                <option value="cancelled">Cancelar reserva</option>
                <option value="declined">Recusar solicitação</option>
              </select>
            </label>
            <label>
              <span>Motivo</span>
              <textarea name="reason" rows={3} minLength={3} maxLength={400} required placeholder="Explique o motivo para manter o histórico organizado." />
            </label>
            <ConfirmSubmitButton className="button button--danger button--compact" message="Confirmar o encerramento desta reserva?">
              <Ban size={16} /> Confirmar
            </ConfirmSubmitButton>
          </form>
        </details>
      ) : null}

      {cancelled ? (
        <div className="driver-reservation-cancellation-note">
          <strong>Motivo informado</strong>
          <p>{reservation.cancellation_reason || "Motivo não registrado."}</p>
          {reservation.cancelled_at ? <small>Encerrada em {formatBrazilDateTime(reservation.cancelled_at)}</small> : null}
        </div>
      ) : null}
    </div>
  );
}
