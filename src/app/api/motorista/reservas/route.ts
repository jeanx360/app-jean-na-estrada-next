import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { formatBrazilDate, formatBrazilTime } from "@/lib/date-time";
import {
  normalizeDriverCampaignCode,
  normalizeDriverMarketingSource,
  type DriverMarketingSource,
} from "@/lib/driver-marketing";
import { normalizeWhatsAppPhone } from "@/lib/driver-public";
import { sendPushNotification } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (clean(body.company, 80)) return NextResponse.json({ ok: true });

    const driverSlug = clean(body.driverSlug, 48).toLowerCase();
    const passengerName = clean(body.passengerName, 80);
    const passengerPhone = normalizeWhatsAppPhone(clean(body.passengerPhone, 30));
    const origin = clean(body.origin, 180);
    const destination = clean(body.destination, 180);
    const travelDate = clean(body.travelDate, 10);
    const travelTime = clean(body.travelTime, 5);
    const tripType = ["outbound", "return", "round_trip"].includes(String(body.tripType)) ? String(body.tripType) : "outbound";
    const passengers = Math.min(20, Math.max(1, Number(body.passengers) || 1));
    const luggage = clean(body.luggage, 180);
    const notes = clean(body.notes, 700);
    const packageId = clean(body.packageId, 64) || null;
    const refererMarketing = marketingFromRequest(request);
    const bodySource = clean(body.source, 30);
    let reservationSource = bodySource ? normalizeDriverMarketingSource(bodySource) : refererMarketing.source;
    const campaignCode = normalizeDriverCampaignCode(clean(body.campaignCode, 48) || refererMarketing.campaignCode);

    if (!driverSlug || passengerName.length < 2 || passengerPhone.length < 10 || !travelDate) {
      return NextResponse.json({ ok: false, error: "Confira nome, WhatsApp e data da viagem." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(travelDate) || (travelTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(travelTime))) {
      return NextResponse.json({ ok: false, error: "Informe uma data e um horário válidos." }, { status: 400 });
    }
    const requestedDay = new Date(`${travelDate}T12:00:00`);
    const todayInSaoPaulo = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    if (!Number.isFinite(requestedDay.getTime()) || travelDate < todayInSaoPaulo) {
      return NextResponse.json({ ok: false, error: "Escolha uma data de hoje em diante." }, { status: 400 });
    }
    if (!origin && !destination && !packageId) {
      return NextResponse.json({ ok: false, error: "Escolha um serviço ou informe origem e destino." }, { status: 400 });
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

    let selectedPackage: { id: string; title: string } | null = null;
    if (packageId) {
      const { data } = await supabase
        .from("driver_service_packages")
        .select("id, title")
        .eq("id", packageId)
        .eq("user_id", profile.user_id)
        .eq("is_active", true)
        .maybeSingle();
      if (!data) return NextResponse.json({ ok: false, error: "O serviço escolhido não está mais disponível." }, { status: 400 });
      selectedPackage = data;
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
        package_id: selectedPackage?.id ?? null,
        campaign_id: campaignId,
        passenger_name: passengerName,
        passenger_phone: passengerPhone,
        origin: origin || null,
        destination: destination || null,
        travel_date: travelDate,
        travel_time: travelTime || null,
        trip_type: tripType,
        passengers,
        luggage: luggage || null,
        notes: notes || null,
        source: reservationSource,
        request_fingerprint_hash: requestHash,
        contact_consent: true,
      })
      .select("id, created_at")
      .single();

    if (insertError || !reservation) {
      return NextResponse.json({ ok: false, error: "Não foi possível registrar a solicitação." }, { status: 500 });
    }

    const route = [origin, destination].filter(Boolean).join(" → ");
    const dateLabel = formatBrazilDate(travelDate);
    const title = "🚨 Nova solicitação de corrida";
    const message = `${passengerName}${selectedPackage ? ` pediu “${selectedPackage.title}”` : route ? ` pediu ${route}` : " enviou uma reserva"} para ${dateLabel}${travelTime ? ` às ${formatBrazilTime(travelTime)}` : ""}.`;

    const { data: notification } = await supabase
      .from("notifications")
      .insert({
        title,
        message,
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
          message,
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
