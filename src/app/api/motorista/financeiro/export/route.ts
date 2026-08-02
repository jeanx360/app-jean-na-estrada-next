import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { accountHasFeature, getAccountPlan } from "@/lib/account-plan";
import {
  buildDriverFinanceWindow,
  filterEntriesByWindow,
  filterTripsByWindow,
} from "@/lib/driver-finance";
import {
  DRIVER_FINANCIAL_CATEGORY_LABELS,
  DRIVER_PAYMENT_METHOD_LABELS,
  DRIVER_PAYMENT_STATUS_LABELS,
  DRIVER_TRIP_STATUS_LABELS,
  type DriverFinancialEntry,
  type DriverTrip,
} from "@/lib/driver";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function money(value: number) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

export async function GET(request: Request) {
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Autenticacao necessaria." }, { status: 401 });
  }

  const accountPlan = await getAccountPlan(supabase, userId, profile?.role);
  if (!accountHasFeature(accountPlan, "exports")) {
    return NextResponse.json({ ok: false, error: "O plano Profissional e necessario para exportar dados." }, { status: 403 });
  }

  const url = new URL(request.url);
  const window = buildDriverFinanceWindow(url.searchParams.get("period"), url.searchParams.get("month"));
  const [tripsResult, entriesResult] = await Promise.all([
    supabase.from("driver_trips").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1200),
    supabase.from("driver_financial_entries").select("*").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(6000),
  ]);

  if (tripsResult.error || entriesResult.error) {
    return NextResponse.json({ ok: false, error: "Nao foi possivel gerar a exportacao." }, { status: 500 });
  }

  const trips = filterTripsByWindow((tripsResult.data ?? []) as DriverTrip[], window.startDate, window.endDate);
  const entries = filterEntriesByWindow((entriesResult.data ?? []) as DriverFinancialEntry[], window.startDate, window.endDate);
  const tripById = new Map(trips.map((trip) => [trip.id, trip]));
  const rows: unknown[][] = [
    [
      "tipo",
      "data",
      "cliente",
      "origem",
      "destino",
      "categoria",
      "descricao",
      "entrada",
      "saida",
      "resultado",
      "status_viagem",
      "status_pagamento",
      "forma_pagamento",
      "distancia_km",
      "minutos_trabalhados",
      "viagem_id",
    ],
  ];

  trips.forEach((trip) => {
    rows.push([
      "resumo_viagem",
      trip.travel_date || trip.created_at.slice(0, 10),
      trip.customer_name,
      trip.origin,
      trip.destination,
      "Viagem",
      trip.notes,
      money(trip.gross_revenue),
      money(trip.total_expenses),
      money(trip.net_result),
      DRIVER_TRIP_STATUS_LABELS[trip.status],
      DRIVER_PAYMENT_STATUS_LABELS[trip.payment_status],
      "",
      Number(trip.distance_km || 0).toFixed(1).replace(".", ","),
      Number(trip.worked_minutes || 0),
      trip.id,
    ]);
  });

  entries.forEach((entry) => {
    const trip = tripById.get(entry.trip_id);
    rows.push([
      entry.entry_type === "income" ? "receita" : "despesa",
      entry.occurred_at.slice(0, 10),
      trip?.customer_name,
      trip?.origin,
      trip?.destination,
      DRIVER_FINANCIAL_CATEGORY_LABELS[entry.category],
      entry.description,
      entry.entry_type === "income" ? money(entry.amount) : "",
      entry.entry_type === "expense" ? money(entry.amount) : "",
      "",
      trip ? DRIVER_TRIP_STATUS_LABELS[trip.status] : "",
      trip ? DRIVER_PAYMENT_STATUS_LABELS[trip.payment_status] : "",
      entry.payment_method ? DRIVER_PAYMENT_METHOD_LABELS[entry.payment_method] : "",
      "",
      "",
      entry.trip_id,
    ]);
  });

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  const fileKey = `${window.startDate}_${window.endDate}`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jne-financeiro-${fileKey}.csv"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
