import { Check } from "lucide-react";
import type { DriverReservationStatus } from "@/lib/driver-public";

const stages: Array<{ status: DriverReservationStatus; label: string }> = [
  { status: "new", label: "Recebida" },
  { status: "negotiating", label: "Negociação" },
  { status: "quoted", label: "Orçamento" },
  { status: "confirmed", label: "Confirmada" },
  { status: "completed", label: "Concluída" },
];

const stageIndex: Record<DriverReservationStatus, number> = {
  new: 0,
  negotiating: 1,
  quoted: 2,
  confirmed: 3,
  completed: 4,
  cancelled: -1,
  declined: -1,
};

export function DriverReservationProgress({ status }: { status: DriverReservationStatus }) {
  if (status === "cancelled" || status === "declined") {
    return <div className={`driver-reservation-terminal driver-reservation-terminal--${status}`}>{status === "cancelled" ? "Reserva cancelada" : "Solicitação recusada"}</div>;
  }

  const current = stageIndex[status];
  return (
    <ol className="driver-reservation-progress" aria-label="Andamento da reserva">
      {stages.map((stage, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={stage.status} className={done ? "is-done" : active ? "is-active" : ""}>
            <span>{done ? <Check size={15} /> : index + 1}</span>
            <small>{stage.label}</small>
          </li>
        );
      })}
    </ol>
  );
}
