"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ContactRound,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Route,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import type { DriverMarketingSource } from "@/lib/driver-marketing";
import type { DriverServicePackage } from "@/lib/driver-public";
import {
  formatRouteDistance,
  formatRouteDuration,
  googleMapsEmbedDirectionsUrl,
} from "@/lib/map-links";

type Props = {
  driverSlug: string;
  driverName: string;
  contactUrl: string;
  packages: DriverServicePackage[];
  initialPackageId?: string;
  initialPassengerName?: string;
  initialPassengerPhone?: string;
  source?: DriverMarketingSource;
  campaignCode?: string;
  mapsEmbedKey?: string;
};

type FormState = {
  packageId: string;
  passengerName: string;
  passengerPhone: string;
  travelDate: string;
  travelTime: string;
  hasReturn: boolean;
  returnDate: string;
  returnTime: string;
  waitAtDestination: boolean;
  waitMinutes: string;
  passengers: string;
  luggage: string;
  notes: string;
  company: string;
};

type RoutePoint = {
  label: string;
  placeId: string | null;
  latitude: number | null;
  longitude: number | null;
};

type PlaceSuggestion = { placeId: string; label: string };
type RouteEstimate = { distanceMeters: number; durationSeconds: number; token: string };

const STEP_TITLES = ["Seus dados", "Destino", "Saída", "Quando", "Detalhes", "Conferir"];

function emptyPoint(): RoutePoint {
  return { label: "", placeId: null, latitude: null, longitude: null };
}

function pointSelected(point: RoutePoint) {
  return Boolean(point.placeId || (Number.isFinite(point.latitude) && Number.isFinite(point.longitude)));
}

function packagePoint(item: DriverServicePackage, kind: "origin" | "destination"): RoutePoint {
  return {
    label: kind === "origin" ? item.origin_label || "" : item.destination_label || "",
    placeId: kind === "origin" ? item.origin_place_id : item.destination_place_id,
    latitude: kind === "origin" ? item.origin_latitude : item.destination_latitude,
    longitude: kind === "origin" ? item.origin_longitude : item.destination_longitude,
  };
}

function usePlaceSuggestions(query: string, enabled: boolean) {
  const [items, setItems] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const input = query.trim();
    if (!enabled || input.length < 3) {
      setItems([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/maps/autocomplete?input=${encodeURIComponent(input)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await response.json()) as { configured?: boolean; items?: PlaceSuggestion[] };
        setConfigured(data.configured !== false);
        setItems(response.ok && Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setItems([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, query]);

  return { items, setItems, loading, configured };
}

function todayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(value: string) {
  if (!value) return "A combinar";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function PublicReservationForm({
  driverSlug,
  driverName,
  contactUrl,
  packages,
  initialPackageId = "",
  initialPassengerName = "",
  initialPassengerPhone = "",
  source = "profile",
  campaignCode = "",
  mapsEmbedKey = "",
}: Props) {
  const initialForm = useMemo<FormState>(() => ({
    packageId: initialPackageId,
    passengerName: initialPassengerName,
    passengerPhone: initialPassengerPhone,
    travelDate: "",
    travelTime: "",
    hasReturn: false,
    returnDate: "",
    returnTime: "",
    waitAtDestination: false,
    waitMinutes: "0",
    passengers: "1",
    luggage: "",
    notes: "",
    company: "",
  }), [initialPackageId, initialPassengerName, initialPassengerPhone]);

  const [form, setForm] = useState<FormState>(initialForm);
  const [origin, setOrigin] = useState<RoutePoint>(emptyPoint);
  const [destination, setDestination] = useState<RoutePoint>(emptyPoint);
  const [originFocused, setOriginFocused] = useState(false);
  const [destinationFocused, setDestinationFocused] = useState(false);
  const [routeEstimate, setRouteEstimate] = useState<RouteEstimate | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapsConfigured, setMapsConfigured] = useState<boolean | null>(null);
  const [routeMessage, setRouteMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(Boolean(initialPackageId));
  const [step, setStep] = useState(0);
  const started = useRef(false);
  const lastAutomaticRoute = useRef("");

  const originSearch = usePlaceSuggestions(origin.label, originFocused && !pointSelected(origin));
  const destinationSearch = usePlaceSuggestions(destination.label, destinationFocused && !pointSelected(destination));
  const selectedPackage = packages.find((item) => item.id === form.packageId) || null;

  useEffect(() => {
    if (originSearch.configured === false || destinationSearch.configured === false) setMapsConfigured(false);
    if (originSearch.configured === true || destinationSearch.configured === true) setMapsConfigured(true);
  }, [destinationSearch.configured, originSearch.configured]);

  useEffect(() => {
    if (window.location.hash === "#reservar") {
      setOpen(true);
      window.setTimeout(() => document.getElementById("reservar")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, []);

  useEffect(() => {
    if (!initialPackageId) return;
    const item = packages.find((value) => value.id === initialPackageId);
    if (!item) return;
    setOrigin(packagePoint(item, "origin"));
    setDestination(packagePoint(item, "destination"));
    if (item.route_distance_meters && item.route_duration_seconds) {
      setRouteEstimate({ distanceMeters: item.route_distance_meters, durationSeconds: item.route_duration_seconds, token: "" });
    }
    setForm((current) => ({
      ...current,
      packageId: item.id,
      waitAtDestination: item.default_wait_minutes > 0,
      waitMinutes: String(item.default_wait_minutes || 0),
    }));
  }, [initialPackageId, packages]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetRouteEstimate() {
    setRouteEstimate(null);
    setRouteMessage(null);
    lastAutomaticRoute.current = "";
  }

  function selectPackage(packageId: string) {
    const item = packages.find((value) => value.id === packageId);
    update("packageId", packageId);
    if (!item) return;
    const nextOrigin = packagePoint(item, "origin");
    const nextDestination = packagePoint(item, "destination");
    if (nextOrigin.label) setOrigin(nextOrigin);
    if (nextDestination.label) setDestination(nextDestination);
    setForm((current) => ({
      ...current,
      packageId,
      waitAtDestination: item.default_wait_minutes > 0,
      waitMinutes: String(item.default_wait_minutes || 0),
      hasReturn: item.allows_return ? current.hasReturn : false,
      returnDate: item.allows_return ? current.returnDate : "",
      returnTime: item.allows_return ? current.returnTime : "",
    }));
    setRouteEstimate(item.route_distance_meters && item.route_duration_seconds
      ? { distanceMeters: item.route_distance_meters, durationSeconds: item.route_duration_seconds, token: "" }
      : null);
  }

  function trackStarted() {
    if (started.current) return;
    started.current = true;
    void fetch("/api/motorista/perfil-evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverSlug, eventType: "reservation_started", source, campaignCode, packageId: form.packageId || null }),
      keepalive: true,
    });
  }

  const calculateRoute = useCallback(async (automatic = false) => {
    if (origin.label.trim().length < 3 || destination.label.trim().length < 3) {
      if (!automatic) setRouteMessage("Informe origem e destino para calcular a rota.");
      return;
    }
    setCalculatingRoute(true);
    setRouteMessage(null);
    try {
      const response = await fetch("/api/maps/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination }),
      });
      const data = (await response.json()) as {
        configured?: boolean;
        error?: string;
        distanceMeters?: number;
        durationSeconds?: number;
        token?: string;
      };
      if (data.configured === false) {
        setMapsConfigured(false);
        if (!automatic) setRouteMessage("O cálculo automático ainda não está configurado. Os endereços podem ser enviados normalmente.");
        return;
      }
      setMapsConfigured(true);
      if (!response.ok || !data.distanceMeters || !data.durationSeconds || !data.token) {
        throw new Error(data.error || "Não foi possível calcular a rota agora.");
      }
      setRouteEstimate({ distanceMeters: data.distanceMeters, durationSeconds: data.durationSeconds, token: data.token });
    } catch (error) {
      if (!automatic) setRouteMessage(error instanceof Error ? error.message : "Não foi possível calcular a rota agora.");
    } finally {
      setCalculatingRoute(false);
    }
  }, [destination, origin]);

  useEffect(() => {
    if (!pointSelected(origin) || !pointSelected(destination) || calculatingRoute) return;
    const routeKey = `${origin.placeId || `${origin.latitude},${origin.longitude}`}|${destination.placeId || `${destination.latitude},${destination.longitude}`}`;
    if (lastAutomaticRoute.current === routeKey) return;
    lastAutomaticRoute.current = routeKey;
    const timer = window.setTimeout(() => void calculateRoute(true), 250);
    return () => window.clearTimeout(timer);
  }, [calculateRoute, calculatingRoute, destination, origin]);

  function useCurrentLocation() {
    setRouteMessage(null);
    if (!navigator.geolocation) {
      setRouteMessage("Este aparelho não disponibilizou a localização atual.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        try {
          const response = await fetch("/api/maps/reverse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude, longitude }),
          });
          const data = (await response.json()) as { configured?: boolean; error?: string; point?: RoutePoint };
          if (data.configured === false) {
            setMapsConfigured(false);
            setOrigin({ label: `Localização atual (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`, latitude, longitude, placeId: null });
            setRouteMessage("Localização capturada. O endereço automático ainda não está configurado.");
          } else if (!response.ok || !data.point) {
            throw new Error(data.error || "Não foi possível identificar sua localização.");
          } else {
            setMapsConfigured(true);
            setOrigin(data.point);
            setOriginFocused(false);
            resetRouteEstimate();
          }
        } catch (error) {
          setRouteMessage(error instanceof Error ? error.message : "Não foi possível identificar sua localização.");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setRouteMessage(error.code === error.PERMISSION_DENIED
          ? "Permita o acesso à localização ou digite o endereço de saída."
          : "Não foi possível obter sua localização. Digite o endereço de saída.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  function validateStep(targetStep: number) {
    setMessage(null);
    if (targetStep === 0) {
      if (form.passengerName.trim().length < 2) return "Informe seu nome.";
      if (form.passengerPhone.replace(/\D/g, "").length < 10) return "Informe um WhatsApp com DDD.";
    }
    if (targetStep === 1 && destination.label.trim().length < 3) return "Informe para onde você quer ir.";
    if (targetStep === 2 && origin.label.trim().length < 3) return "Informe de onde você vai sair.";
    if (targetStep === 3) {
      if (!form.travelDate) return "Escolha a data da viagem.";
      if (!form.travelTime) return "Escolha o horário da viagem.";
      if (form.hasReturn) {
        if (!form.returnDate || !form.returnTime) return "Informe a data e o horário da volta.";
        if (`${form.returnDate}T${form.returnTime}` <= `${form.travelDate}T${form.travelTime}`) return "A volta precisa acontecer depois da ida.";
      }
      if (form.waitAtDestination && Number(form.waitMinutes) < 15) return "Informe pelo menos 15 minutos de espera.";
    }
    return null;
  }

  function next() {
    const error = validateStep(step);
    if (error) {
      setMessage(error);
      return;
    }
    setMessage(null);
    setStep((current) => Math.min(STEP_TITLES.length - 1, current + 1));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const errors = [0, 1, 2, 3].map(validateStep).filter(Boolean);
    if (errors.length) {
      setMessage(errors[0]);
      return;
    }
    setSending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/motorista/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverSlug,
          source,
          campaignCode,
          ...form,
          tripType: form.hasReturn ? "round_trip" : "outbound",
          origin: origin.label,
          originPlaceId: origin.placeId,
          originLatitude: origin.latitude,
          originLongitude: origin.longitude,
          destination: destination.label,
          destinationPlaceId: destination.placeId,
          destinationLatitude: destination.latitude,
          destinationLongitude: destination.longitude,
          routeEstimateToken: routeEstimate?.token || "",
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível enviar a solicitação.");
      setSuccess(true);
      setStep(0);
      setForm(initialForm);
      setOrigin(emptyPoint());
      setDestination(emptyPoint());
      setRouteEstimate(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar a solicitação.");
    } finally {
      setSending(false);
    }
  }

  if (success) {
    return (
      <section className="public-reservation-success" id="reservar">
        <CheckCircle2 size={44} />
        <span className="eyebrow">SOLICITAÇÃO ENVIADA</span>
        <h2>{driverName} já foi avisado</h2>
        <p>O passageiro foi registrado no CRM, a solicitação entrou na agenda e o motorista recebeu uma notificação privada.</p>
        <div className="public-reservation-success__save"><strong>Não perca este contato</strong><span>Salve o motorista para suas próximas viagens.</span></div>
        <div className="public-reservation-success__actions">
          <a className="button button--primary" href={contactUrl} data-driver-event="contact_save"><ContactRound size={18} /> Salvar motorista</a>
          <button className="button button--secondary" type="button" onClick={() => { setSuccess(false); setOpen(false); }}>Fechar</button>
        </div>
      </section>
    );
  }

  if (!open) {
    return (
      <section className="public-reservation-launcher" id="reservar">
        <div><span className="eyebrow">CORRIDA PARTICULAR</span><h2>Solicite seu orçamento em poucos passos</h2><p>Informe destino, saída e horário. O motorista recebe tudo organizado.</p></div>
        <button className="button button--primary" type="button" onClick={() => { setOpen(true); trackStarted(); }}><CalendarDays size={19} /> Solicitar orçamento</button>
      </section>
    );
  }

  const mapUrl = googleMapsEmbedDirectionsUrl(mapsEmbedKey, origin, destination);

  return (
    <section className="public-reservation-wizard" id="reservar">
      <header className="public-reservation-wizard__header">
        <div><span className="eyebrow">SOLICITAR ORÇAMENTO</span><h2>{STEP_TITLES[step]}</h2><p>Etapa {step + 1} de {STEP_TITLES.length}</p></div>
        <button type="button" className="public-reservation-wizard__close" onClick={() => { setOpen(false); setStep(0); setMessage(null); }}>Fechar</button>
      </header>
      <div className="public-reservation-wizard__progress" aria-label={`Etapa ${step + 1} de ${STEP_TITLES.length}`}><span style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }} /></div>

      <form onSubmit={submit} onFocus={trackStarted}>
        <label className="public-reservation-honeypot" aria-hidden="true"><span>Empresa</span><input tabIndex={-1} autoComplete="off" value={form.company} onChange={(event) => update("company", event.target.value)} /></label>

        {step === 0 ? (
          <div className="public-reservation-step">
            <div className="public-reservation-step__icon"><ContactRound size={28} /></div>
            <h3>Como o motorista pode falar com você?</h3>
            <p>Esses dados ficam no CRM particular deste motorista para organizar o atendimento.</p>
            <label><span>Seu nome</span><input autoFocus maxLength={80} autoComplete="name" value={form.passengerName} onChange={(event) => update("passengerName", event.target.value)} placeholder="Nome completo" /></label>
            <label><span>WhatsApp</span><input inputMode="tel" autoComplete="tel" maxLength={20} value={form.passengerPhone} onChange={(event) => update("passengerPhone", event.target.value)} placeholder="DDD + número" /></label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="public-reservation-step">
            <div className="public-reservation-step__icon"><MapPin size={28} /></div>
            <h3>Para onde você quer ir?</h3>
            {packages.length ? (
              <div className="public-route-catalog">
                <span>Rotas frequentes deste motorista</span>
                <div>
                  {packages.map((item) => (
                    <button key={item.id} type="button" className={form.packageId === item.id ? "is-selected" : ""} onClick={() => selectPackage(item.id)}>
                      <strong>{item.title}</strong>
                      <small>{item.origin_label && item.destination_label ? `${item.origin_label} → ${item.destination_label}` : item.route_summary || "Rota pronta"}</small>
                      {item.route_distance_meters ? <em>{formatRouteDistance(item.route_distance_meters)}</em> : null}
                    </button>
                  ))}
                  <button type="button" className={!form.packageId ? "is-selected" : ""} onClick={() => { update("packageId", ""); setDestination(emptyPoint()); resetRouteEstimate(); }}><strong>Outro destino</strong><small>Digite o endereço</small></button>
                </div>
              </div>
            ) : null}
            <div className="public-address-field">
              <label><span>Destino</span><div className="public-address-input"><MapPin size={18} /><input autoFocus maxLength={180} autoComplete="off" value={destination.label} onFocus={() => setDestinationFocused(true)} onBlur={() => window.setTimeout(() => setDestinationFocused(false), 180)} onChange={(event) => { setDestination({ label: event.target.value, placeId: null, latitude: null, longitude: null }); update("packageId", ""); resetRouteEstimate(); }} placeholder="Comece a digitar o endereço" />{destinationSearch.loading ? <LoaderCircle className="auth-spinner" size={17} /> : null}</div></label>
              {destinationFocused && destinationSearch.items.length ? <div className="public-address-suggestions" role="listbox">{destinationSearch.items.map((item) => <button type="button" key={item.placeId} onMouseDown={(event) => event.preventDefault()} onClick={() => { setDestination({ label: item.label, placeId: item.placeId, latitude: null, longitude: null }); destinationSearch.setItems([]); setDestinationFocused(false); resetRouteEstimate(); }}><MapPin size={15} /><span>{item.label}</span></button>)}</div> : null}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="public-reservation-step">
            <div className="public-reservation-step__icon"><LocateFixed size={28} /></div>
            <h3>De onde você vai sair?</h3>
            <button className="public-location-button public-location-button--large" type="button" onClick={useCurrentLocation} disabled={locating}>{locating ? <LoaderCircle className="auth-spinner" size={18} /> : <LocateFixed size={18} />}{locating ? "Localizando..." : "Usar minha localização atual"}</button>
            <div className="public-address-field">
              <label><span>Ou digite o endereço de saída</span><div className="public-address-input"><MapPin size={18} /><input autoFocus maxLength={180} autoComplete="off" value={origin.label} onFocus={() => setOriginFocused(true)} onBlur={() => window.setTimeout(() => setOriginFocused(false), 180)} onChange={(event) => { setOrigin({ label: event.target.value, placeId: null, latitude: null, longitude: null }); update("packageId", ""); resetRouteEstimate(); }} placeholder="Rua, número, bairro ou local" />{originSearch.loading ? <LoaderCircle className="auth-spinner" size={17} /> : null}</div></label>
              {originFocused && originSearch.items.length ? <div className="public-address-suggestions" role="listbox">{originSearch.items.map((item) => <button type="button" key={item.placeId} onMouseDown={(event) => event.preventDefault()} onClick={() => { setOrigin({ label: item.label, placeId: item.placeId, latitude: null, longitude: null }); originSearch.setItems([]); setOriginFocused(false); resetRouteEstimate(); }}><MapPin size={15} /><span>{item.label}</span></button>)}</div> : null}
            </div>
            {routeMessage ? <p className="public-route-message">{routeMessage}</p> : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="public-reservation-step">
            <div className="public-reservation-step__icon"><CalendarDays size={28} /></div>
            <h3>Quando será a viagem?</h3>
            <div className="public-reservation-grid">
              <label><span>Data da ida</span><input type="date" min={todayKey()} lang="pt-BR" value={form.travelDate} onChange={(event) => update("travelDate", event.target.value)} /></label>
              <label><span>Horário da ida</span><input type="time" step={60} lang="pt-BR" value={form.travelTime} onChange={(event) => update("travelTime", event.target.value)} /></label>
            </div>
            {selectedPackage?.allows_return === false ? null : (
              <label className="public-choice-toggle"><input type="checkbox" checked={form.hasReturn} onChange={(event) => update("hasReturn", event.target.checked)} /><span><strong>Também preciso da volta</strong><small>Pode ser no mesmo dia ou em outra data.</small></span></label>
            )}
            {form.hasReturn ? <div className="public-reservation-grid"><label><span>Data da volta</span><input type="date" min={form.travelDate || todayKey()} lang="pt-BR" value={form.returnDate} onChange={(event) => update("returnDate", event.target.value)} /></label><label><span>Horário da volta</span><input type="time" step={60} lang="pt-BR" value={form.returnTime} onChange={(event) => update("returnTime", event.target.value)} /></label></div> : null}
            <label className="public-choice-toggle"><input type="checkbox" checked={form.waitAtDestination} onChange={(event) => update("waitAtDestination", event.target.checked)} /><span><strong>O motorista deve esperar no local</strong><small>Informe abaixo o tempo aproximado.</small></span></label>
            {form.waitAtDestination ? <label><span>Tempo de espera</span><select value={form.waitMinutes} onChange={(event) => update("waitMinutes", event.target.value)}><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="60">1 hora</option><option value="120">2 horas</option><option value="180">3 horas</option><option value="240">4 horas</option><option value="480">8 horas</option></select></label> : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="public-reservation-step">
            <div className="public-reservation-step__icon"><Users size={28} /></div>
            <h3>Mais algum detalhe?</h3>
            <div className="public-reservation-grid"><label><span>Passageiros</span><input type="number" min={1} max={20} value={form.passengers} onChange={(event) => update("passengers", event.target.value)} /></label><label><span>Bagagens</span><input maxLength={180} value={form.luggage} onChange={(event) => update("luggage", event.target.value)} placeholder="Ex.: 2 malas médias" /></label></div>
            <label><span>Observações opcionais</span><textarea rows={4} maxLength={700} value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Cadeirinha, paradas, acessibilidade ou outra informação útil" /></label>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="public-reservation-step public-reservation-review">
            <div className="public-reservation-step__icon"><Sparkles size={28} /></div>
            <h3>Confira antes de enviar</h3>
            {routeEstimate ? <div className="public-route-estimate__result"><Route size={22} /><div><strong>{formatRouteDistance(routeEstimate.distanceMeters)}</strong><span><Clock3 size={15} /> cerca de {formatRouteDuration(routeEstimate.durationSeconds)} na ida</span></div></div> : <button className="button button--secondary" type="button" onClick={() => void calculateRoute(false)} disabled={calculatingRoute}>{calculatingRoute ? <LoaderCircle className="auth-spinner" size={18} /> : <Route size={18} />}{calculatingRoute ? "Calculando..." : "Calcular distância e tempo"}</button>}
            {mapUrl ? <iframe className="public-reservation-review__map" title="Mapa da rota" src={mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : null}
            <dl className="public-reservation-review__summary">
              <div><dt>Passageiro</dt><dd>{form.passengerName} · {form.passengerPhone}</dd></div>
              <div><dt>Rota</dt><dd>{origin.label} → {destination.label}</dd></div>
              <div><dt>Ida</dt><dd>{displayDate(form.travelDate)} às {form.travelTime}</dd></div>
              {form.hasReturn ? <div><dt>Volta</dt><dd>{displayDate(form.returnDate)} às {form.returnTime}</dd></div> : null}
              {form.waitAtDestination ? <div><dt>Espera</dt><dd>{form.waitMinutes} minutos</dd></div> : null}
              <div><dt>Passageiros</dt><dd>{form.passengers}</dd></div>
              {form.luggage ? <div><dt>Bagagens</dt><dd>{form.luggage}</dd></div> : null}
            </dl>
            {mapsConfigured === true ? <small className="public-google-attribution">Endereços e rota com <span translate="no">Google Maps</span></small> : null}
            {mapsConfigured === false ? <small>A rota será enviada com os endereços, mesmo sem cálculo automático.</small> : null}
          </div>
        ) : null}

        {message ? <p className="auth-message auth-message--error">{message}</p> : null}
        <div className="public-reservation-wizard__actions">
          {step > 0 ? <button className="button button--secondary" type="button" onClick={() => { setMessage(null); setStep((current) => current - 1); }}><ArrowLeft size={18} /> Voltar</button> : <span />}
          {step < STEP_TITLES.length - 1 ? <button className="button button--primary" type="button" onClick={next}>Continuar <ArrowRight size={18} /></button> : <button className="button button--primary" type="submit" disabled={sending}>{sending ? <LoaderCircle className="auth-spinner" size={18} /> : <Send size={18} />}{sending ? "Enviando..." : "Enviar ao motorista"}</button>}
        </div>
        <small className="public-reservation-consent">Ao enviar, você autoriza o motorista a usar estes dados para atender esta solicitação.</small>
      </form>
    </section>
  );
}
