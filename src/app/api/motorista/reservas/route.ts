import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { formatBrazilDate, formatBrazilTime } from "@/lib/date-time";
import {
  normalizeDriverCampaignCode,
  normalizeDriverMarketingSource,
  type DriverMarketingSource,
} from "@/lib/driver-marketing";
import { normalizeWhatsAppPhone } from "@/lib/driver-public";
import { verifyOpenRouteToken } from "@/lib/open-maps";
import { sendPushNotification } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function coordinate(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function truthy(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function normalizeRouteLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

function fingerprint(request: Request, driverUserId: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const agent = request.headers.get("user-agent") || "unknown";
  return createHash("sha256").update(`${ip}|${agent}|${driverUserId}`).digest("hex");
}

function marketingFromRequest(request: Request): { source: DriverMarketingSource; campaignCode: string } {
  try {
    const referer = request.headers.get("referer");
    if (!referer) return { source: "profile", campaignCode: "" };
    const url = new URL(referer);
    return {
      source: normalizeDriverMarketingSource(url.searchParams.get("src")),
      campaignCode: normalizeDriverCampaignCode(url.searchParams.get("cmp")),
    };
  } catch {
    return { source: "profile", campaignCode: "" };
  }
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function scheduleTimestamp(date: string, time: string) {
  return new Date(`${date}T${time}:00-03:00`).getTime();
}

async function hasScheduleConflict(
  supabase: ReturnType<typeof createAdminClient>,
  driverUserId: string,
  date: string,
  time: string,
  durationMinutes: number,
) {
  const { data, error } = await supabase.rpc("driver_schedule_conflicts", {
    p_driver_user_id: driverUserId,
    p_travel_date: date,
    p_travel_time: time,
    p_duration_minutes: durationMinutes,
    p_exclude_reservation_id: null,
  });
  if (error) throw new Error(`SCHEDULE_CHECK:${error.message}`);
  return Array.isArray(data) && data.length > 0;
}

type SelectedPackage = {
  id: string;
  title: string;
  origin_label: string | null;
  origin_place_id: string | null;
  origin_latitude: number | null;
  origin_longitude: number | null;
  destination_label: string | null;
  destination_place_id: string | null;
  destination_latitude: number | null;
  destination_longitude: number | null;
  route_distance_meters: number | null;
  route_duration_seconds: number | null;
  default_wait_minutes: number;
  allows_return: boolean;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (clean(body.company, 80)) return NextResponse.json({ ok: true });

    const { supabase: authSupabase, userId, profile: passengerProfile } = await getAuthContext();
    if (!userId || passengerProfile?.is_blocked) {
      return NextResponse.json({ ok: false, error: "Faça login para solicitar uma corrida." }, { status: 401 });
    }
    const { data: authData } = await authSupabase.auth.getUser();
    const passengerMetadata = authData.user?.user_metadata ?? {};
    const accountName = passengerProfile?.full_name || (typeof passengerMetadata.full_name === "string" ? passengerMetadata.full_name : "");
    const accountPhone = typeof passengerMetadata.phone === "string" ? passengerMetadata.phone : "";

    const driverSlug = clean(body.driverSlug, 48).toLowerCase();
    const passengerName = clean(body.passengerName, 80) || clean(accountName, 80);
    const passengerPhone = normalizeWhatsAppPhone(clean(body.passengerPhone, 30) || clean(accountPhone, 30));
    const origin = clean(body.origin, 180);
    const destination = clean(body.destination, 180);
    const originPlaceId = clean(body.originPlaceId, 255) || null;
    const destinationPlaceId = clean(body.destinationPlaceId, 255) || null;
    const originLatitude = coordinate(body.originLatitude, -90, 90);
    const originLongitude = coordinate(body.originLongitude, -180, 180);
    const destinationLatitude = coordinate(body.destinationLatitude, -90, 90);
    const destinationLongitude = coordinate(body.destinationLongitude, -180, 180);
    const travelDate = clean(body.travelDate, 10);
    const travelTime = clean(body.travelTime, 5);
    const hasReturn = truthy(body.hasReturn);
    const returnDate = hasReturn ? clean(body.returnDate, 10) : "";
    const returnTime = hasReturn ? clean(body.returnTime, 5) : "";
    const waitAtDestination = truthy(body.waitAtDestination);
    const waitMinutes = waitAtDestination ? Math.max(15, Math.min(1440, Number(body.waitMinutes) || 0)) : 0;
    const tripType = hasReturn ? "round_trip" : "outbound";
    const passengers = Math.min(20, Math.max(1, Number(body.passengers) || 1));
    const luggage = clean(body.luggage, 180);
    const userNotes = clean(body.notes, 700);
    const routeEstimateToken = clean(body.routeEstimateToken, 1400);
    const packageId = clean(body.packageId, 64) || null;
    const refererMarketing = marketingFromRequest(request);
    const bodySource = clean(body.source, 30);
    let reservationSource = bodySource ? normalizeDriverMarketingSource(bodySource) : refererMarketing.source;
    const campaignCode = normalizeDriverCampaignCode(clean(body.campaignCode, 48) || refererMarketing.campaignCode);

    if (!driverSlug || passengerName.length < 2 || passengerPhone.length < 10) {
      return NextResponse.json({ ok: false, error: "Confira seu nome e WhatsApp." }, { status: 400 });
    }
    if (!origin || !destination) {
      return NextResponse.json({ ok: false, error: "Informe a origem e o destino." }, { status: 400 });
    }
    if (!validDate(travelDate) || !validTime(travelTime)) {
      return NextResponse.json({ ok: false, error: "Informe data e horário válidos para a ida." }, { status: 400 });
    }
    if (hasReturn && (!validDate(returnDate) || !validTime(returnTime))) {
      return NextResponse.json({ ok: false, error: "Informe data e horário válidos para a volta." }, { status: 400 });
    }

    const todayInSaoPaulo = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    if (travelDate < todayInSaoPaulo) {
      return NextResponse.json({ ok: false, error: "Escolha uma data de hoje em diante." }, { status: 400 });
    }
    if (hasReturn && scheduleTimestamp(returnDate, returnTime) <= scheduleTimestamp(travelDate, travelTime)) {
      return NextResponse.json({ ok: false, error: "A volta precisa acontecer depois da ida." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: profile, error: profileError } = await supabase
      .from("driver_public_profiles")
      .select("user_id, display_name, accepts_reservations")
      .eq("slug", driverSlug)
      .eq("is_published", true)
      .maybeSingle();

    if (profileError || !profile || !profile.accepts_reservations) {
      return NextResponse.json({ ok: false, error: "Este motorista não está recebendo solicitações agora." }, { status: 404 });
    }

    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("is_professional_driver, is_blocked")
      .eq("id", profile.user_id)
      .maybeSingle();
    if (!ownerProfile?.is_professional_driver || ownerProfile.is_blocked) {
      return NextResponse.json({ ok: false, error: "Este perfil não está disponível agora." }, { status: 404 });
    }

    let campaignId: string | null = null;
    if (campaignCode) {
      const { data: campaign } = await supabase
        .from("driver_marketing_campaigns")
        .select("id, source")
        .eq("user_id", profile.user_id)
        .eq("code", campaignCode)
        .eq("is_active", true)
        .maybeSingle();
      if (campaign) {
        campaignId = campaign.id;
        reservationSource = normalizeDriverMarketingSource(campaign.source);
      }
    }

    let selectedPackage: SelectedPackage | null = null;
    if (packageId) {
      const { data } = await supabase
        .from("driver_service_packages")
        .select("id,title,origin_label,origin_place_id,origin_latitude,origin_longitude,destination_label,destination_place_id,destination_latitude,destination_longitude,route_distance_meters,route_duration_seconds,default_wait_minutes,allows_return")
        .eq("id", packageId)
        .eq("user_id", profile.user_id)
        .eq("is_active", true)
        .maybeSingle();
      if (!data) return NextResponse.json({ ok: false, error: "A rota escolhida não está mais disponível." }, { status: 400 });
      selectedPackage = data as SelectedPackage;
      if (hasReturn && !selectedPackage.allows_return) {
        return NextResponse.json({ ok: false, error: "Esta rota não está configurada para pedidos de volta." }, { status: 400 });
      }
    }

    const verifiedRoute = routeEstimateToken ? verifyOpenRouteToken(routeEstimateToken, origin, destination) : null;
    const catalogRouteMatches = Boolean(
      selectedPackage?.origin_label
      && selectedPackage.destination_label
      && normalizeRouteLabel(selectedPackage.origin_label) === normalizeRouteLabel(origin)
      && normalizeRouteLabel(selectedPackage.destination_label) === normalizeRouteLabel(destination),
    );
    const routeDistanceMeters = verifiedRoute?.distanceMeters
      ?? (catalogRouteMatches ? selectedPackage?.route_distance_meters : null)
      ?? null;
    const routeDurationSeconds = verifiedRoute?.durationSeconds
      ?? (catalogRouteMatches ? selectedPackage?.route_duration_seconds : null)
      ?? null;
    const routeDurationMinutes = routeDurationSeconds ? Math.max(1, Math.round(routeDurationSeconds / 60)) : null;

    if (hasReturn && routeDurationMinutes) {
      const minimumReturnTimestamp = scheduleTimestamp(travelDate, travelTime)
        + (routeDurationMinutes + (waitAtDestination ? waitMinutes : 0)) * 60_000;
      if (scheduleTimestamp(returnDate, returnTime) < minimumReturnTimestamp) {
        return NextResponse.json({
          ok: false,
          error: "O horário da volta precisa considerar o trajeto de ida e o tempo de espera.",
        }, { status: 400 });
      }
    }

    const routeEstimateLine = routeDistanceMeters && routeDurationMinutes
      ? `Rota estimada: ${(routeDistanceMeters / 1000).toLocaleString("pt-BR", { minimumFractionDigits: routeDistanceMeters < 10000 ? 1 : 0, maximumFractionDigits: 1 })} km, ${routeDurationMinutes} min na ida.`
      : "";
    const returnLine = hasReturn ? `Volta: ${formatBrazilDate(returnDate)} às ${formatBrazilTime(returnTime)}.` : "";
    const waitLine = waitAtDestination ? `Espera solicitada no local: ${waitMinutes} min.` : "";
    const notes = [routeEstimateLine, returnLine, waitLine, userNotes].filter(Boolean).join("\n").slice(0, 700);

    const { data: driverSettings } = await supabase
      .from("driver_settings")
      .select("default_reservation_duration_minutes")
      .eq("user_id", profile.user_id)
      .maybeSingle();
    const defaultDurationMinutes = Math.max(15, Math.min(720, Number(driverSettings?.default_reservation_duration_minutes || 60)));
    let durationMinutes = routeDurationMinutes
      ? Math.max(15, Math.min(720, routeDurationMinutes))
      : defaultDurationMinutes;

    if (waitAtDestination && hasReturn && returnDate === travelDate) {
      const continuousMinutes = Math.ceil((scheduleTimestamp(returnDate, returnTime) - scheduleTimestamp(travelDate, travelTime)) / 60000)
        + (routeDurationMinutes || defaultDurationMinutes);
      durationMinutes = Math.max(durationMinutes, Math.min(720, continuousMinutes));
    } else if (waitAtDestination) {
      durationMinutes = Math.min(720, durationMinutes + waitMinutes);
    }

    try {
      if (await hasScheduleConflict(supabase, profile.user_id, travelDate, travelTime, durationMinutes)) {
        return NextResponse.json({ ok: false, error: "O horário da ida não está disponível. Escolha outro." }, { status: 409 });
      }
      if (hasReturn && await hasScheduleConflict(
        supabase,
        profile.user_id,
        returnDate,
        returnTime,
        Math.max(15, Math.min(720, routeDurationMinutes || defaultDurationMinutes)),
      )) {
        return NextResponse.json({ ok: false, error: "O horário da volta não está disponível. Escolha outro." }, { status: 409 });
      }
    } catch (error) {
      console.warn("Falha ao validar agenda:", error);
      return NextResponse.json({ ok: false, error: "Não foi possível validar os horários agora." }, { status: 503 });
    }

    const requestHash = fingerprint(request, profile.user_id);
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("driver_reservations")
      .select("id", { count: "exact", head: true })
      .eq("request_fingerprint_hash", requestHash)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) {
      return NextResponse.json({ ok: false, error: "Muitas solicitações em pouco tempo. Aguarde alguns minutos." }, { status: 429 });
    }

    const { data: reservation, error: insertError } = await supabase
      .from("driver_reservations")
      .insert({
        driver_user_id: profile.user_id,
        passenger_user_id: userId,
        package_id: selectedPackage?.id ?? null,
        campaign_id: campaignId,
        passenger_name: passengerName,
        passenger_phone: passengerPhone,
        origin,
        destination,
        origin_place_id: (catalogRouteMatches ? (selectedPackage?.origin_place_id ?? originPlaceId) : originPlaceId) || null,
        origin_latitude: catalogRouteMatches ? (selectedPackage?.origin_latitude ?? originLatitude) : originLatitude,
        origin_longitude: catalogRouteMatches ? (selectedPackage?.origin_longitude ?? originLongitude) : originLongitude,
        destination_place_id: (catalogRouteMatches ? (selectedPackage?.destination_place_id ?? destinationPlaceId) : destinationPlaceId) || null,
        destination_latitude: catalogRouteMatches ? (selectedPackage?.destination_latitude ?? destinationLatitude) : destinationLatitude,
        destination_longitude: catalogRouteMatches ? (selectedPackage?.destination_longitude ?? destinationLongitude) : destinationLongitude,
        route_distance_meters: routeDistanceMeters,
        route_duration_seconds: routeDurationSeconds,
        travel_date: travelDate,
        travel_time: travelTime,
        trip_type: tripType,
        has_return: hasReturn,
        return_date: hasReturn ? returnDate : null,
        return_time: hasReturn ? returnTime : null,
        wait_at_destination: waitAtDestination,
        wait_minutes: waitMinutes,
        passengers,
        luggage: luggage || null,
        notes: notes || null,
        duration_minutes: durationMinutes,
        source: reservationSource,
        request_fingerprint_hash: requestHash,
        contact_consent: true,
      })
      .select("id, created_at")
      .single();

    if (insertError || !reservation) {
      if (insertError?.message?.includes("AGENDA_CONFLICT")) {
        return NextResponse.json({ ok: false, error: "Um dos horários acabou de ficar indisponível. Escolha outro." }, { status: 409 });
      }
      if (insertError?.message?.includes("RETURN_BEFORE_OUTBOUND")) {
        return NextResponse.json({ ok: false, error: "A volta precisa acontecer depois da ida." }, { status: 400 });
      }
      if (insertError?.message?.includes("RETURN_BEFORE_EXPECTED_TIME")) {
        return NextResponse.json({
          ok: false,
          error: "O horário da volta precisa considerar o trajeto de ida e o tempo de espera.",
        }, { status: 400 });
      }
      console.error("Falha ao inserir reserva:", insertError);
      return NextResponse.json({ ok: false, error: "Não foi possível registrar a solicitação." }, { status: 500 });
    }

    const route = `${origin} → ${destination}`;
    const title = "🚨 Nova solicitação de corrida";
    const details = [
      `${passengerName} pediu ${selectedPackage ? `“${selectedPackage.title}”` : route}`,
      `para ${formatBrazilDate(travelDate)} às ${formatBrazilTime(travelTime)}`,
      hasReturn ? `com volta em ${formatBrazilDate(returnDate)} às ${formatBrazilTime(returnTime)}` : "",
      waitAtDestination ? `e ${waitMinutes} min de espera` : "",
    ].filter(Boolean).join(" ");
    const notificationMessage = `${details}.`;

    const { data: notification } = await supabase
      .from("notifications")
      .insert({
        title,
        message: notificationMessage,
        audience: "member",
        category: "reservations",
        action_url: `/motorista/reservas/${reservation.id}`,
        is_published: true,
        is_featured: true,
        published_at: new Date().toISOString(),
        push_requested: true,
        source_key: `driver-reservation:${reservation.id}`,
        target_user_id: profile.user_id,
      })
      .select("id")
      .single();

    if (notification?.id) {
      try {
        const pushResult = await sendPushNotification({
          id: notification.id,
          title,
          message: notificationMessage,
          audience: "member",
          category: "reservations",
          actionUrl: `/motorista/reservas/${reservation.id}`,
          targetUserId: profile.user_id,
        });
        await supabase.from("notifications").update({
          push_sent_at: pushResult.configured ? new Date().toISOString() : null,
          push_success_count: pushResult.successCount,
          push_failure_count: pushResult.failureCount,
        }).eq("id", notification.id);
      } catch (pushError) {
        console.warn("Push da reserva não enviado:", pushError);
      }
    }

    await supabase.from("driver_profile_events").insert({
      driver_user_id: profile.user_id,
      package_id: selectedPackage?.id ?? null,
      campaign_id: campaignId,
      event_type: "reservation_submitted",
      source: reservationSource,
      visitor_hash: requestHash,
    });

    return NextResponse.json({ ok: true, reservationId: reservation.id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Falha ao criar reserva:", error);
    return NextResponse.json({ ok: false, error: "Não foi possível enviar a solicitação agora." }, { status: 500 });
  }
}
