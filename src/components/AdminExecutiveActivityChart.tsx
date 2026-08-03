import type { AdminExecutiveActivityPoint } from "@/lib/admin-executive";

function numberValue(value: number | string) {
  return Number(value || 0);
}

function bucketLabel(value: string, total: number) {
  const date = new Date(`${value}T12:00:00-03:00`);
  return new Intl.DateTimeFormat("pt-BR", total > 20 ? { day: "2-digit", month: "2-digit" } : { month: "short", year: "2-digit" }).format(date);
}

export function AdminExecutiveActivityChart({ points }: { points: AdminExecutiveActivityPoint[] }) {
  const normalized = points.map((point) => ({
    ...point,
    accounts: numberValue(point.accounts),
    reservations: numberValue(point.reservations),
    quotes: numberValue(point.quotes),
    trips: numberValue(point.trips),
  }));
  const maximum = Math.max(1, ...normalized.flatMap((point) => [point.accounts, point.reservations, point.quotes, point.trips]));

  if (!normalized.length) {
    return <div className="admin-executive-chart__empty">Ainda não existem movimentos nesse período.</div>;
  }

  return (
    <div className="admin-executive-chart" role="img" aria-label="Evolução de contas, reservas, orçamentos e viagens no período">
      <div className="admin-executive-chart__legend">
        <span><i className="is-accounts" /> Contas</span>
        <span><i className="is-reservations" /> Reservas</span>
        <span><i className="is-quotes" /> Orçamentos</span>
        <span><i className="is-trips" /> Viagens</span>
      </div>
      <div className="admin-executive-chart__viewport">
        <div className="admin-executive-chart__plot" style={{ minWidth: `${Math.max(620, normalized.length * 52)}px` }}>
          {normalized.map((point) => (
            <div className="admin-executive-chart__bucket" key={point.bucket_start}>
              <div className="admin-executive-chart__bars">
                <i className="is-accounts" style={{ height: `${Math.max(3, point.accounts / maximum * 100)}%` }} title={`${point.accounts} contas`} />
                <i className="is-reservations" style={{ height: `${Math.max(3, point.reservations / maximum * 100)}%` }} title={`${point.reservations} reservas`} />
                <i className="is-quotes" style={{ height: `${Math.max(3, point.quotes / maximum * 100)}%` }} title={`${point.quotes} orçamentos`} />
                <i className="is-trips" style={{ height: `${Math.max(3, point.trips / maximum * 100)}%` }} title={`${point.trips} viagens`} />
              </div>
              <small>{bucketLabel(point.bucket_start, normalized.length)}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
