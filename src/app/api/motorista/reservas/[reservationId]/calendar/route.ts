import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { googleMapsDirectionsUrl, googleMapsNavigationUrl } from "@/lib/map-links";
import type { DriverReservation } from "@/lib/driver-public";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ reservationId: string }> };

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function compactDate(date: string) {
  return date.replace(/-/g, "");
}

function compactTime(time: string) {
  return time.slice(0, 5).replace(":", "") + "00";
}

function addMinutes(date: string, time: string, minutes: number) {
  const value = new Date(`${date}T${time.slice(0, 5)}:00-03:00`);
  value.setMinutes(value.getMinutes() + minutes);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(value).map((part) => [part.type, part.value]));
  return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}00`;
}

export async function GET(request: Request, { params }: Props) {
  const { reservationId } = await params;
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId || !profile?.is_professional_driver || profile.is_blocked) {
    return NextResponse.json({ ok: false, error: "Acesso de motorista necessário." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("driver_reservations")
    .select("*")
    .eq("id", reservationId)
    .eq("driver_user_id", userId)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Reserva não encontrada." }, { status: 404 });
  }

  const reservation = data as DriverReservation;
  const url = new URL(request.url);
  const leg = url.searchParams.get("leg") === "return" ? "return" : "outbound";
  const allowedReminders = new Set([15, 30, 60, 120, 1440]);
  const requestedReminder = Number(url.searchParams.get("reminder") || 60);
  const reminderMinutes = allowedReminders.has(requestedReminder) ? requestedReminder : 60;

  const date = leg === "return" ? reservation.return_date : reservation.travel_date;
  const time = leg === "return" ? reservation.return_time : reservation.travel_time;
  if (!date || !time) {
    return NextResponse.json({ ok: false, error: "Esta etapa da corrida ainda não tem data e horário definidos." }, { status: 400 });
  }

  const origin = leg === "return"
    ? { label: reservation.destination, latitude: reservation.destination_latitude, longitude: reservation.destination_longitude }
    : { label: reservation.origin, latitude: reservation.origin_latitude, longitude: reservation.origin_longitude };
  const destination = leg === "return"
    ? { label: reservation.origin, latitude: reservation.origin_latitude, longitude: reservation.origin_longitude }
    : { label: reservation.destination, latitude: reservation.destination_latitude, longitude: reservation.destination_longitude };
  const durationMinutes = Math.max(
    15,
    Math.min(
      720,
      reservation.route_duration_seconds
        ? Math.ceil(reservation.route_duration_seconds / 60)
        : reservation.duration_minutes || 60,
    ),
  );
  const summary = `${leg === "return" ? "Volta" : "Corrida"} · ${reservation.passenger_name}`;
  const route = [origin.label, destination.label].filter(Boolean).join(" → ");
  const pickupUrl = googleMapsNavigationUrl(origin);
  const routeUrl = googleMapsDirectionsUrl(origin, destination);
  const description = [
    route,
    `Passageiro: ${reservation.passenger_name}`,
    `WhatsApp: ${reservation.passenger_phone}`,
    reservation.wait_at_destination ? `Espera prevista: ${reservation.wait_minutes} min` : "",
    reservation.notes || "",
    `Ir ao ponto de partida: ${pickupUrl}`,
    `Abrir trajeto completo: ${routeUrl}`,
  ].filter(Boolean).join("\n");
  const dtStart = `${compactDate(date)}T${compactTime(time)}`;
  const dtEnd = addMinutes(date, time, durationMinutes);
  const nowUtc = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JNE App//Agenda do Motorista//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:America/Sao_Paulo",
    "X-LIC-LOCATION:America/Sao_Paulo",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:-0300",
    "TZOFFSETTO:-0300",
    "TZNAME:BRT",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${reservation.id}-${leg}@jneapp.app`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART;TZID=America/Sao_Paulo:${dtStart}`,
    `DTEND;TZID=America/Sao_Paulo:${dtEnd}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `LOCATION:${escapeIcs(origin.label || route)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `URL:${pickupUrl}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    `TRIGGER:-PT${reminderMinutes}M`,
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs(`Lembrete da corrida de ${reservation.passenger_name}`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ];

  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="jne-corrida-${reservation.id}-${leg}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
