"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3, LoaderCircle, LocateFixed, MapPin, Route } from "lucide-react";
import { OpenStreetMapRoute } from "@/components/OpenStreetMapRoute";
import type { RouteCoordinate } from "@/lib/open-maps";
import {
  formatRouteDistance,
  formatRouteDuration,
} from "@/lib/map-links";

export type DriverRoutePoint = {
  label: string;
  placeId: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type DriverRouteDraft = {
  origin: DriverRoutePoint;
  destination: DriverRoutePoint;
  distanceMeters: number | null;
  durationSeconds: number | null;
};

type PlaceSuggestion = {
  placeId: string;
  label: string;
  latitude: number;
  longitude: number;
};

type Props = {
  value: DriverRouteDraft;
  onChange: (value: DriverRouteDraft) => void;
};

function selected(point: DriverRoutePoint) {
  return Boolean(point.placeId || (Number.isFinite(point.latitude) && Number.isFinite(point.longitude)));
}

function useSuggestions(query: string, enabled: boolean) {
  const [items, setItems] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const input = query.trim();
    if (!enabled || input.length < 3) {
      setItems([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/maps/autocomplete?input=${encodeURIComponent(input)}`, {
          cache: "no-store",
          signal: controller.signal,
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

export function DriverRoutePlanner({ value, onChange }: Props) {
  const [originFocused, setOriginFocused] = useState(false);
  const [destinationFocused, setDestinationFocused] = useState(false);
  const [locating, setLocating] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<RouteCoordinate[]>([]);
  const lastAutomaticRoute = useRef("");
  const originSearch = useSuggestions(value.origin.label, originFocused && !selected(value.origin));
  const destinationSearch = useSuggestions(value.destination.label, destinationFocused && !selected(value.destination));

  function setOrigin(origin: DriverRoutePoint) {
    onChange({ ...value, origin, distanceMeters: null, durationSeconds: null });
    setGeometry([]);
    lastAutomaticRoute.current = "";
  }

  function setDestination(destination: DriverRoutePoint) {
    onChange({ ...value, destination, distanceMeters: null, durationSeconds: null });
    setGeometry([]);
    lastAutomaticRoute.current = "";
  }

  const calculate = useCallback(async (automatic = false) => {
    if (value.origin.label.trim().length < 3 || value.destination.label.trim().length < 3) {
      if (!automatic) setMessage("Informe origem e destino para calcular a rota.");
      return;
    }
    setCalculating(true);
    setMessage(null);
    try {
      const response = await fetch("/api/maps/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: value.origin, destination: value.destination }),
      });
      const data = (await response.json()) as {
        configured?: boolean;
        error?: string;
        distanceMeters?: number;
        durationSeconds?: number;
        geometry?: RouteCoordinate[];
        origin?: DriverRoutePoint;
        destination?: DriverRoutePoint;
      };
      if (data.configured === false) {
        if (!automatic) setMessage("Configure a chave gratuita do openrouteservice para calcular a rota automaticamente.");
        return;
      }
      if (!response.ok || !data.distanceMeters || !data.durationSeconds) {
        throw new Error(data.error || "Não foi possível calcular a rota.");
      }
      onChange({
        ...value,
        origin: data.origin || value.origin,
        destination: data.destination || value.destination,
        distanceMeters: data.distanceMeters,
        durationSeconds: data.durationSeconds,
      });
      setGeometry(Array.isArray(data.geometry) ? data.geometry : []);
    } catch (error) {
      if (!automatic) setMessage(error instanceof Error ? error.message : "Não foi possível calcular a rota.");
    } finally {
      setCalculating(false);
    }
  }, [onChange, value]);

  useEffect(() => {
    if (!selected(value.origin) || !selected(value.destination) || calculating) return;
    const key = `${value.origin.placeId || `${value.origin.latitude},${value.origin.longitude}`}|${value.destination.placeId || `${value.destination.latitude},${value.destination.longitude}`}`;
    if (lastAutomaticRoute.current === key) return;
    lastAutomaticRoute.current = key;
    const timer = window.setTimeout(() => void calculate(true), 250);
    return () => window.clearTimeout(timer);
  }, [calculate, calculating, value.destination, value.origin]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("Este aparelho não disponibilizou a localização atual.");
      return;
    }
    setLocating(true);
    setMessage(null);
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
          const data = (await response.json()) as { configured?: boolean; point?: DriverRoutePoint; error?: string };
          if (data.configured === false) {
            setOrigin({ label: `Localização atual (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`, placeId: null, latitude, longitude });
            setMessage("Localização capturada. Configure o openrouteservice para identificar o endereço.");
          } else if (!response.ok || !data.point) {
            throw new Error(data.error || "Não foi possível identificar o endereço.");
          } else {
            setOrigin(data.point);
          }
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Não foi possível identificar o endereço.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setMessage("Permita a localização ou digite o endereço de saída.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  const mapsUnavailable = originSearch.configured === false || destinationSearch.configured === false;

  return (
    <div className="driver-route-planner">
      <div className="driver-route-planner__fields">
        <div className="public-address-field">
          <label>
            <span>Origem da rota</span>
            <div className="public-address-input">
              <MapPin size={18} />
              <input
                value={value.origin.label}
                maxLength={180}
                autoComplete="off"
                placeholder="Ex.: Aeroporto Salgado Filho"
                onFocus={() => setOriginFocused(true)}
                onBlur={() => window.setTimeout(() => setOriginFocused(false), 180)}
                onChange={(event) => setOrigin({ label: event.target.value, placeId: null, latitude: null, longitude: null })}
              />
              {originSearch.loading ? <LoaderCircle className="auth-spinner" size={17} /> : null}
            </div>
          </label>
          <button className="public-location-button" type="button" onClick={useCurrentLocation} disabled={locating}>
            {locating ? <LoaderCircle className="auth-spinner" size={17} /> : <LocateFixed size={17} />}
            {locating ? "Localizando..." : "Usar minha localização"}
          </button>
          {originFocused && originSearch.items.length ? (
            <div className="public-address-suggestions" role="listbox">
              {originSearch.items.map((item) => (
                <button key={item.placeId} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => {
                  setOrigin({ label: item.label, placeId: item.placeId, latitude: item.latitude, longitude: item.longitude });
                  originSearch.setItems([]);
                  setOriginFocused(false);
                }}><MapPin size={15} /><span>{item.label}</span></button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="public-address-field">
          <label>
            <span>Destino da rota</span>
            <div className="public-address-input">
              <MapPin size={18} />
              <input
                value={value.destination.label}
                maxLength={180}
                autoComplete="off"
                placeholder="Ex.: Centro de Gramado"
                onFocus={() => setDestinationFocused(true)}
                onBlur={() => window.setTimeout(() => setDestinationFocused(false), 180)}
                onChange={(event) => setDestination({ label: event.target.value, placeId: null, latitude: null, longitude: null })}
              />
              {destinationSearch.loading ? <LoaderCircle className="auth-spinner" size={17} /> : null}
            </div>
          </label>
          {destinationFocused && destinationSearch.items.length ? (
            <div className="public-address-suggestions" role="listbox">
              {destinationSearch.items.map((item) => (
                <button key={item.placeId} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => {
                  setDestination({ label: item.label, placeId: item.placeId, latitude: item.latitude, longitude: item.longitude });
                  destinationSearch.setItems([]);
                  setDestinationFocused(false);
                }}><MapPin size={15} /><span>{item.label}</span></button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="driver-route-planner__estimate">
        {value.distanceMeters && value.durationSeconds ? (
          <div><Route size={20} /><strong>{formatRouteDistance(value.distanceMeters)}</strong><span><Clock3 size={15} /> {formatRouteDuration(value.durationSeconds)}</span></div>
        ) : (
          <button className="button button--secondary button--compact" type="button" onClick={() => void calculate(false)} disabled={calculating}>
            {calculating ? <LoaderCircle className="auth-spinner" size={17} /> : <Route size={17} />}
            {calculating ? "Calculando..." : "Calcular distância e tempo"}
          </button>
        )}
        {mapsUnavailable ? <small>Sem mapas configurados, os endereços ainda podem ser salvos manualmente.</small> : null}
        {message ? <p className="public-route-message">{message}</p> : null}
      </div>

      <OpenStreetMapRoute
        className="driver-route-planner__map"
        title="Prévia da rota"
        origin={value.origin}
        destination={value.destination}
        geometry={geometry}
      />
      <small className="driver-route-planner__provider">Mapa © OpenStreetMap · rotas por HeiGIT openrouteservice</small>
    </div>
  );
}
