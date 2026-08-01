import { formatBrazilDate } from "@/lib/date-time";

export type AdminTrafficPoint = {
  day: string;
  pageViews: number;
  uniqueVisitors: number;
};

type Props = {
  points: AdminTrafficPoint[];
};

export function AdminTrafficChart({ points }: Props) {
  if (!points.length) {
    return <div className="admin-chart-empty">Os acessos começarão a aparecer aqui após a instalação da migration e a navegação dos usuários.</div>;
  }

  const width = 920;
  const height = 310;
  const paddingX = 42;
  const paddingTop = 24;
  const paddingBottom = 46;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;
  const maximum = Math.max(1, ...points.map((point) => point.pageViews));
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;

  function coordinates(key: "pageViews" | "uniqueVisitors") {
    return points.map((point, index) => {
      const x = paddingX + index * stepX;
      const y = paddingTop + chartHeight - (point[key] / maximum) * chartHeight;
      return { x, y, value: point[key], day: point.day };
    });
  }

  const viewCoordinates = coordinates("pageViews");
  const visitorCoordinates = coordinates("uniqueVisitors");
  const viewLine = viewCoordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const visitorLine = visitorCoordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${paddingX},${paddingTop + chartHeight} ${viewLine} ${paddingX + chartWidth},${paddingTop + chartHeight}`;
  const labelIndexes = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]));

  return (
    <div className="admin-traffic-chart">
      <div className="admin-traffic-chart__legend" aria-hidden="true">
        <span><i className="is-views" /> Visualizações</span>
        <span><i className="is-visitors" /> Visitantes</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de acessos e visitantes dos últimos 30 dias">
        <defs>
          <linearGradient id="adminTrafficArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingTop + chartHeight - chartHeight * ratio;
          const value = Math.round(maximum * ratio);
          return (
            <g key={ratio}>
              <line className="admin-traffic-chart__grid" x1={paddingX} x2={paddingX + chartWidth} y1={y} y2={y} />
              <text className="admin-traffic-chart__axis" x={paddingX - 10} y={y + 4} textAnchor="end">{value}</text>
            </g>
          );
        })}

        <polygon className="admin-traffic-chart__area" points={area} />
        <polyline className="admin-traffic-chart__line admin-traffic-chart__line--views" points={viewLine} />
        <polyline className="admin-traffic-chart__line admin-traffic-chart__line--visitors" points={visitorLine} />

        {viewCoordinates.map((point) => (
          <circle className="admin-traffic-chart__point" cx={point.x} cy={point.y} r="3.4" key={point.day}>
            <title>{formatBrazilDate(point.day)}: {point.value} visualizações</title>
          </circle>
        ))}

        {labelIndexes.map((index) => {
          const point = points[index];
          const x = paddingX + index * stepX;
          return <text className="admin-traffic-chart__date" x={x} y={height - 14} textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"} key={point.day}>{formatBrazilDate(point.day)}</text>;
        })}
      </svg>
    </div>
  );
}
