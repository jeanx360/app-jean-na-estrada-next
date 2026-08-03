"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ContactRound,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Route,
  Send,
} from "lucide-react";
import { TRIP_TYPE_LABELS, type DriverTripType } from "@/lib/driver";
import type { DriverMarketingSource } from "@/lib/driver-marketing";
import { type DriverServicePackage } from "@/lib/driver-public";

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
};

type FormState = {
  packageId: string;
  passengerName: string;
  passengerPhone: string;
  travelDate: string;
  travelTime: string;
  tripType: DriverTripType;
  passengers: string;
  luggage: string;
  notes: string;
  company: string;
};

type RoutePoint = {
  label: string;
  placeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type PlaceSuggestion = {
  placeId: string;
  label: string;
};

type RouteEstimate = {
  distanceMeters: number;
  durationSeconds: number;
  token: string;
};

function emptyPoint(): RoutePoint {
  return { label: "", placeId: null, latitude: null, longitude: null };
}

function pointSelected(point: RoutePoint) {
  return Boolean(point.placeId || (Number.isFinite(point.latitude) && Number.isFinite(point.longitude)));
}

function formatDistance(meters: number) {
  const kilometers = meters / 1000;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: kilometers < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(kilometers);
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${minutes} min`;
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
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
        const data = (await response.json()) as {
          ok?: boolean;
          configured?: boolean;
          items?: PlaceSuggestion[];
        };
        if (data.configured === false) {
          setConfigured(false);
          setItems([]);
          return;
        }
        setConfigured(true);
        setItems(response.ok && data.ok && Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setItems([]);
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
}: Props) {
  const initialForm = useMemo<FormState>(() => ({
    packageId: initialPackageId,
    passengerName: initialPassengerName,
    passengerPhone: initialPassengerPhone,
    travelDate: "",
    travelTime: "",
    tripType: "outbound",
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
  const started = useRef(false);
  const lastAutomaticRoute = useRef("");

  const originSearch = usePlaceSuggestions(origin.label, originFocused && !pointSelected(origin));
  const destinationSearch = usePlaceSuggestions(destination.label, destinationFocused && !pointSelected(destination));

  useEffect(() => {
    if (originSearch.configured === false || destinationSearch.configured === false) setMapsConfigured(false);
    if (originSearch.configured === true || destinationSearch.configured === true) setMapsConfigured(true);
  }, [destinationSearch.configured, originSearch.configured]);

  const minimumDate = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateOriginLabel(label: string) {
    setOrigin({ label, placeId: null, latitude: null, longitude: null });
    setRouteEstimate(null);
    setRouteMessage(null);
    lastAutomaticRoute.current = "";
  }

  function updateDestinationLabel(label: string) {
    setDestination({ label, placeId: null, latitude: null, longitude: null });
    setRouteEstimate(null);
    setRouteMessage(null);
    lastAutomaticRoute.current = "";
  }

  function selectOrigin(item: PlaceSuggestion) {
    setOrigin({ label: item.label, placeId: item.placeId, latitude: null, longitude: null });
    originSearch.setItems([]);
    setOriginFocused(false);
    setRouteEstimate(null);
  }

  function selectDestination(item: PlaceSuggestion) {
    setDestination({ label: item.label, placeId: item.placeId, latitude: null, longitude: null });
    destinationSearch.setItems([]);
    setDestinationFocused(false);
    setRouteEstimate(null);
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
      if (!automatic) setRouteMessage("Informe a origem e o destino para calcular a rota.");
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
        ok?: boolean;
        configured?: boolean;
        error?: string;
        distanceMeters?: number;
        durationSeconds?: number;
        token?: string;
      };
      if (data.configured === false) {
        setMapsConfigured(false);
        setRouteEstimate(null);
        if (!automatic) setRouteMessage("O cálculo automático ainda não está configurado. Você pode enviar os endereços normalmente.");
        return;
      }
      setMapsConfigured(true);
      if (!response.ok || !data.ok || !data.distanceMeters || !data.durationSeconds || !data.token) {
        throw new Error(data.error || "Não foi possível calcular a rota agora.");
      }
      setRouteEstimate({
        distanceMeters: data.distanceMeters,
        durationSeconds: data.durationSeconds,
        token: data.token,
      });
      setRouteMessage(null);
    } catch (error) {
      setRouteEstimate(null);
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
        try {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          const response = await fetch("/api/maps/reverse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude, longitude }),
          });
          const data = (await response.json()) as {
            ok?: boolean;
            configured?: boolean;
            error?: string;
            point?: RoutePoint;
          };
          if (data.configured === false) {
            setMapsConfigured(false);
            setOrigin({ label: `Localização atual (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`, latitude, longitude, placeId: null });
            setRouteMessage("Localização capturada. O endereço automático ainda não está configurado.");
            return;
          }
          setMapsConfigured(true);
          if (!response.ok || !data.ok || !data.point) throw new Error(data.error || "Não foi possível identificar sua localização.");
          setOrigin(data.point);
          setOriginFocused(false);
          setRouteEstimate(null);
        } catch (error) {
          setRouteMessage(error instanceof Error ? error.message : "Não foi possível identificar sua localização.");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        setRouteMessage(denied ? "Permita o acesso à localização ou digite o endereço de saída." : "Não foi possível obter sua localização. Digite o endereço de saída.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (form.passengerName.trim().length < 2) return setMessage("Informe seu nome.");
    if (form.passengerPhone.replace(/\D/g, "").length < 10) return setMessage("Informe um WhatsApp com DDD.");
    if (!origin.label.trim() && !destination.label.trim() && !form.packageId) return setMessage("Escolha uma rota frequente ou informe origem e destino.");
    if ((origin.label.trim() && !destination.label.trim()) || (!origin.label.trim() && destination.label.trim())) return setMessage("Informe origem e destino.");
    if (!form.travelDate) return setMessage("Escolha a data desejada.");

    setSending(true);
    try {
      const response = await fetch("/api/motorista/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverSlug,
          source,
          campaignCode,
          ...form,
          origin: origin.label,
          destination: destination.label,
          routeEstimateToken: routeEstimate?.token || "",
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível enviar a solicitação.");
      setSuccess(true);
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
        <h2>O motorista já foi avisado</h2>
        <p>Ele recebeu os dados da viagem e poderá entrar em contato pelo WhatsApp para confirmar detalhes e valor.</p>
        <div className="public-reservation-success__save">
          <strong>Não perca este contato</strong>
          <span>Salve {driverName} na agenda para suas próximas viagens.</span>
        </div>
        <div className="public-reservation-success__actions">
          <a className="button button--primary" href={contactUrl} data-driver-event="contact_save"><ContactRound size={18} /> Salvar motorista</a>
          <button className="button button--secondary" type="button" onClick={() => setSuccess(false)}>Fazer outra solicitação</button>
        </div>
      </section>
    );
  }

  return (
    <section className="public-reservation-card" id="reservar">
      <div className="public-reservation-card__heading"><CalendarDays size={25} /><div><span className="eyebrow">PEDIR ORÇAMENTO</span><h2>Para onde você vai?</h2><p>Informe a rota e a data. O motorista confirma disponibilidade e valor.</p></div></div>
      <form onSubmit={submit} onFocus={trackStarted}>
        <label className="public-reservation-honeypot" aria-hidden="true"><span>Empresa</span><input tabIndex={-1} autoComplete="off" value={form.company} onChange={(event) => update("company", event.target.value)} /></label>

        {packages.length ? (
          <label>
            <span>Rotas e serviços frequentes deste motorista</span>
            <select value={form.packageId} onChange={(event) => update("packageId", event.target.value)}>
              <option value="">Vou informar outra rota</option>
              {packages.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
        ) : null}

        <div className="public-route-fields">
          <div className="public-address-field">
            <label>
              <span>De onde você está saindo?</span>
              <div className="public-address-input">
                <MapPin size={18} />
                <input
                  maxLength={180}
                  autoComplete="off"
                  value={origin.label}
                  onFocus={() => setOriginFocused(true)}
                  onBlur={() => window.setTimeout(() => setOriginFocused(false), 180)}
                  onChange={(event) => updateOriginLabel(event.target.value)}
                  placeholder="Digite o endereço ou use sua localização"
                />
                {originSearch.loading ? <LoaderCircle className="auth-spinner" size={17} /> : null}
              </div>
            </label>
            <button className="public-location-button" type="button" onClick={useCurrentLocation} disabled={locating}>
              {locating ? <LoaderCircle className="auth-spinner" size={17} /> : <LocateFixed size={17} />}
              {locating ? "Localizando..." : "Usar minha localização atual"}
            </button>
            {originFocused && originSearch.items.length ? (
              <div className="public-address-suggestions" role="listbox">
                {originSearch.items.map((item) => <button type="button" key={item.placeId} onMouseDown={(event) => event.preventDefault()} onClick={() => selectOrigin(item)}><MapPin size={15} /><span>{item.label}</span></button>)}
              </div>
            ) : null}
          </div>

          <div className="public-address-field">
            <label>
              <span>Para onde você está indo?</span>
              <div className="public-address-input">
                <MapPin size={18} />
                <input
                  maxLength={180}
                  autoComplete="off"
                  value={destination.label}
                  onFocus={() => setDestinationFocused(true)}
                  onBlur={() => window.setTimeout(() => setDestinationFocused(false), 180)}
                  onChange={(event) => updateDestinationLabel(event.target.value)}
                  placeholder="Comece a digitar o destino"
                />
                {destinationSearch.loading ? <LoaderCircle className="auth-spinner" size={17} /> : null}
              </div>
            </label>
            {destinationFocused && destinationSearch.items.length ? (
              <div className="public-address-suggestions" role="listbox">
                {destinationSearch.items.map((item) => <button type="button" key={item.placeId} onMouseDown={(event) => event.preventDefault()} onClick={() => selectDestination(item)}><MapPin size={15} /><span>{item.label}</span></button>)}
              </div>
            ) : null}
          </div>
        </div>

        <div className="public-route-estimate">
          {routeEstimate ? (
            <div className="public-route-estimate__result">
              <Route size={21} />
              <div><strong>{formatDistance(routeEstimate.distanceMeters)} km</strong><span><Clock3 size={14} /> cerca de {formatDuration(routeEstimate.durationSeconds)}</span></div>
            </div>
          ) : (
            <button className="button button--secondary" type="button" onClick={() => void calculateRoute(false)} disabled={calculatingRoute || origin.label.trim().length < 3 || destination.label.trim().length < 3}>
              {calculatingRoute ? <LoaderCircle className="auth-spinner" size={18} /> : <Route size={18} />}
              {calculatingRoute ? "Calculando..." : "Calcular distância e tempo"}
            </button>
          )}
          {mapsConfigured === true ? <small className="public-google-attribution">Endereços e rota com <span translate="no">Google Maps</span></small> : null}
          {mapsConfigured === false ? <small>Você ainda pode digitar os endereços e enviar normalmente.</small> : null}
          {routeMessage ? <p className="public-route-message">{routeMessage}</p> : null}
        </div>

        <div className="public-reservation-grid public-reservation-grid--essential">
          <label><span>Data da viagem</span><input type="date" lang="pt-BR" min={minimumDate} value={form.travelDate} onChange={(event) => update("travelDate", event.target.value)} /></label>
          <label><span>Horário aproximado</span><input type="time" lang="pt-BR" step={60} value={form.travelTime} onChange={(event) => update("travelTime", event.target.value)} /></label>
          <label><span>Seu nome</span><input maxLength={80} autoComplete="name" value={form.passengerName} onChange={(event) => update("passengerName", event.target.value)} placeholder="Seu nome" /></label>
          <label><span>WhatsApp</span><input inputMode="tel" autoComplete="tel" maxLength={20} value={form.passengerPhone} onChange={(event) => update("passengerPhone", event.target.value)} placeholder="DDD + número" /></label>
        </div>

        <details className="public-reservation-details">
          <summary><ChevronDown size={18} /> Adicionar passageiros, bagagem ou observações</summary>
          <div className="public-reservation-details__content">
            <div className="public-reservation-grid">
              <label><span>Passageiros</span><input type="number" min={1} max={20} value={form.passengers} onChange={(event) => update("passengers", event.target.value)} /></label>
              <label><span>Bagagens</span><input maxLength={180} value={form.luggage} onChange={(event) => update("luggage", event.target.value)} placeholder="Ex.: 2 malas médias" /></label>
            </div>
            <fieldset className="public-trip-type"><legend>Tipo de viagem</legend><div>{(Object.keys(TRIP_TYPE_LABELS) as DriverTripType[]).map((type) => <label key={type} className={form.tripType === type ? "is-selected" : ""}><input type="radio" name="tripType" checked={form.tripType === type} onChange={() => update("tripType", type)} /><span>{TRIP_TYPE_LABELS[type]}</span></label>)}</div></fieldset>
            <label><span>Observações</span><textarea rows={3} maxLength={700} value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Paradas, necessidades especiais ou outra informação útil" /></label>
          </div>
        </details>

        {message ? <p className="auth-message auth-message--error">{message}</p> : null}
        <button className="button button--primary public-reservation-submit" type="submit" disabled={sending}>
          {sending ? <LoaderCircle className="auth-spinner" size={18} /> : <Send size={18} />}
          {sending ? "Enviando..." : "Enviar pedido ao motorista"}
        </button>
        <small className="public-reservation-consent">Ao enviar, você autoriza este motorista a entrar em contato sobre esta solicitação.</small>
      </form>
    </section>
  );
}
