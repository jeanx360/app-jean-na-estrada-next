import { NextResponse } from "next/server";
import {
  buildAdminExecutivePeriod,
  normalizeAdminExecutivePeriodKey,
  parseAdminExecutiveDashboard,
} from "@/lib/admin-executive";
import { getAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) return NextResponse.json({ ok: false, error: "Autenticacao necessaria." }, { status: 401 });
  if (!profile || profile.is_blocked || profile.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Acesso administrativo necessario." }, { status: 403 });
  }

  const url = new URL(request.url);
  const periodKey = normalizeAdminExecutivePeriodKey(url.searchParams.get("period") ?? undefined);
  const period = buildAdminExecutivePeriod(periodKey);
  const { data, error } = await supabase.rpc("admin_executive_dashboard", {
    selected_start: period.start,
    selected_end: period.end,
  });
  const dashboard = parseAdminExecutiveDashboard(data);

  if (error || !dashboard) {
    return NextResponse.json({ ok: false, error: "Nao foi possivel gerar o relatorio executivo." }, { status: 500 });
  }

  const rows: unknown[][] = [["grupo", "indicador", "valor", "periodo"]];
  Object.entries(dashboard.platform).forEach(([indicator, value]) => rows.push(["plataforma", indicator, value, "atual"]));
  Object.entries(dashboard.plans).forEach(([indicator, value]) => rows.push(["planos", indicator, value, "atual"]));
  Object.entries(dashboard.current).forEach(([indicator, value]) => rows.push(["operacao", indicator, value, period.label]));
  Object.entries(dashboard.previous).forEach(([indicator, value]) => rows.push(["comparacao", indicator, value, "periodo anterior"]));
  Object.entries(dashboard.attention).forEach(([indicator, value]) => rows.push(["atencao", indicator, value, "atual"]));

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jne-painel-executivo-${periodKey}.csv"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
