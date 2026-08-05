import { createHmac, timingSafeEqual } from "node:crypto";

export type OpenRoutePoint = {
  label: string;
  placeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type OpenPlaceSuggestion = {
  placeId: string;
  label: string;
  latitude: number;
  longitude: number;
};

export type RouteCoordinate = [longitude: number, latitude: number];

export type OpenRouteEstimate = {
  distanceMeters: number;
  durationSeconds: number;
  token: string;
  geometry: RouteCoordinate[];
  origin: OpenRoutePoint;
  destination: OpenRoutePoint;
};

type SignedRoutePayload = {
  distanceMeters: number;
  durationSeconds: number;
  origin: string;
  destination: string;
  expiresAt: number;
};

type JsonRecord = Record<string, unknown>;

const DEFAULT_API_BASE = "https://api.heigit.org";

function apiKey() {
  return process.env.OPENROUTESERVICE_API_KEY?.trim()
    || process.env.HEIGIT_API_KEY?.trim()
    || "";
}

function apiBase() {
  return (process.env.OPEN_MAPS_API_BASE?.trim() || DEFAULT_API_BASE).replace(/\/$/, "");
}

function signingSecret() {
  return process.env.ROUTE_ESTIMATE_SECRET?.trim() || apiKey();
}

export function openMapsConfigured() {
  return Boolean(apiKey());
}

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 180);
}

function asFiniteCoordinate(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" ? value as JsonRecord : null;
}

async function fetchJson(url: string, init: RequestInit = {}) {
  const key = apiKey();
  if (!key) throw new Error("A integração de mapas abertos ainda não foi configurada.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json, application/geo+json",
        Authorization: key,
        ...(init.headers || {}),
      },
    });
    const data = await response.json().catch(() => null) as JsonRecord | null;
    if (!response.ok) {
      const nestedError = record(data?.error);
      const message = String(
        nestedError?.message
        || data?.message
        || data?.detail
        || "",
      );
      if (response.status === 429) throw new Error("O limite gratuito de mapas foi atingido. Tente novamente mais tarde.");
      throw new Error(message || `O serviço de mapas respondeu HTTP ${response.status}.`);
    }
    return data ?? {};
  } finally {
    clearTimeout(timeout);
  }
}

function featureToSuggestion(value: unknown): OpenPlaceSuggestion | null {
  const feature = record(value);
  const properties = record(feature?.properties);
  const geometry = record(feature?.geometry);
  const coordinates = Array.isArray(geometry?.coordinates) ? geometry.coordinates : [];
  const longitude = asFiniteCoordinate(coordinates[0], -180, 180);
  const latitude = asFiniteCoordinate(coordinates[1], -90, 90);
  const label = String(properties?.label || properties?.name || "").trim().slice(0, 180);
  const placeId = String(properties?.gid || properties?.id || `${latitude},${longitude}`).slice(0, 255);
  if (!label || latitude === null || longitude === null) return null;
  return { placeId, label, latitude, longitude };
}

function peliasUrl(path: "autocomplete" | "search" | "reverse") {
  const url = new URL(`${apiBase()}/pelias/v1/${path}`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("lang", "pt");
  return url;
}

export async function autocompleteOpenPlaces(
  input: string,
  bias?: { latitude?: number | null; longitude?: number | null },
): Promise<OpenPlaceSuggestion[]> {
  const normalizedInput = input.trim().slice(0, 120);
  if (normalizedInput.length < 3) return [];

  const url = peliasUrl("autocomplete");
  url.searchParams.set("text", normalizedInput);
  url.searchParams.set("size", "5");
  url.searchParams.set("boundary.country", "BRA");

  const latitude = asFiniteCoordinate(bias?.latitude, -90, 90);
  const longitude = asFiniteCoordinate(bias?.longitude, -180, 180);
  if (latitude !== null && longitude !== null) {
    url.searchParams.set("focus.point.lat", String(latitude));
    url.searchParams.set("focus.point.lon", String(longitude));
  }

  const data = await fetchJson(url.toString());
  return (Array.isArray(data.features) ? data.features : [])
    .map(featureToSuggestion)
    .filter((item): item is OpenPlaceSuggestion => Boolean(item))
    .slice(0, 5);
}

export async function reverseOpenGeocode(latitudeInput: unknown, longitudeInput: unknown): Promise<OpenRoutePoint> {
  const latitude = asFiniteCoordinate(latitudeInput, -90, 90);
  const longitude = asFiniteCoordinate(longitudeInput, -180, 180);
  if (latitude === null || longitude === null) throw new Error("Localização inválida.");

  const url = peliasUrl("reverse");
  url.searchParams.set("point.lat", String(latitude));
  url.searchParams.set("point.lon", String(longitude));
  url.searchParams.set("size", "1");

  const data = await fetchJson(url.toString());
  const suggestion = (Array.isArray(data.features) ? data.features : [])
    .map(featureToSuggestion)
    .find(Boolean);

  return suggestion
    ? { ...suggestion }
    : { label: "Localização atual", placeId: null, latitude, longitude };
}

async function forwardOpenGeocode(label: string): Promise<OpenRoutePoint> {
  const address = label.trim().slice(0, 180);
  if (address.length < 3) throw new Error("Informe um endereço válido.");

  const url = peliasUrl("search");
  url.searchParams.set("text", address);
  url.searchParams.set("size", "1");
  url.searchParams.set("boundary.country", "BRA");

  const data = await fetchJson(url.toString());
  const suggestion = (Array.isArray(data.features) ? data.features : [])
    .map(featureToSuggestion)
    .find(Boolean);
  if (!suggestion) throw new Error(`Não encontramos o endereço: ${address}`);
  return suggestion;
}

async function resolvePoint(point: OpenRoutePoint): Promise<OpenRoutePoint> {
  const latitude = asFiniteCoordinate(point.latitude, -90, 90);
  const longitude = asFiniteCoordinate(point.longitude, -180, 180);
  if (latitude !== null && longitude !== null) {
    return {
      label: point.label.trim().slice(0, 180),
      placeId: point.placeId?.trim().slice(0, 255) || null,
      latitude,
      longitude,
    };
  }
  return forwardOpenGeocode(point.label);
}

function simplifyGeometry(coordinates: RouteCoordinate[], limit = 360) {
  if (coordinates.length <= limit) return coordinates;
  const step = Math.ceil(coordinates.length / limit);
  const simplified = coordinates.filter((_, index) => index === 0 || index === coordinates.length - 1 || index % step === 0);
  return simplified.slice(0, limit);
}

function encodePayload(payload: SignedRoutePayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signPayload(encoded: string) {
  const secret = signingSecret();
  if (!secret) throw new Error("Assinatura da rota não configurada.");
  return createHmac("sha256", secret).update(encoded).digest("base64url");
}

function createRouteToken(payload: SignedRoutePayload) {
  const encoded = encodePayload(payload);
  return `${encoded}.${signPayload(encoded)}`;
}

export function verifyOpenRouteToken(token: string, origin: string, destination: string): SignedRoutePayload | null {
  const [encoded, providedSignature] = token.split(".");
  if (!encoded || !providedSignature || !signingSecret()) return null;

  const expectedSignature = signPayload(encoded);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SignedRoutePayload;
    if (
      !Number.isFinite(payload.distanceMeters)
      || !Number.isFinite(payload.durationSeconds)
      || payload.distanceMeters <= 0
      || payload.distanceMeters > 5_000_000
      || payload.durationSeconds <= 0
      || payload.durationSeconds > 7 * 24 * 60 * 60
      || payload.expiresAt < Date.now()
      || payload.origin !== normalizeLabel(origin)
      || payload.destination !== normalizeLabel(destination)
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

const ROUTABLE_POINT_RADII_METERS = [1_500, 5_000] as const;

function isRoutablePointError(error: unknown) {
  return error instanceof Error
    && /could not find routable point|within a radius of/i.test(error.message);
}

async function requestOpenDrivingRoute(
  coordinates: [RouteCoordinate, RouteCoordinate],
  radiusMeters: number,
) {
  return fetchJson(`${apiBase()}/openrouteservice/v2/directions/driving-car/geojson`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      coordinates,
      radiuses: [radiusMeters, radiusMeters],
      language: "pt",
      instructions: false,
    }),
  });
}

export async function computeOpenDrivingRoute(originInput: OpenRoutePoint, destinationInput: OpenRoutePoint): Promise<OpenRouteEstimate> {
  const origin = await resolvePoint(originInput);
  const destination = await resolvePoint(destinationInput);
  const originLongitude = asFiniteCoordinate(origin.longitude, -180, 180);
  const originLatitude = asFiniteCoordinate(origin.latitude, -90, 90);
  const destinationLongitude = asFiniteCoordinate(destination.longitude, -180, 180);
  const destinationLatitude = asFiniteCoordinate(destination.latitude, -90, 90);
  if (originLongitude === null || originLatitude === null || destinationLongitude === null || destinationLatitude === null) {
    throw new Error("Não foi possível localizar a origem ou o destino.");
  }

  const coordinates: [RouteCoordinate, RouteCoordinate] = [
    [originLongitude, originLatitude],
    [destinationLongitude, destinationLatitude],
  ];

  let data: JsonRecord;
  try {
    data = await requestOpenDrivingRoute(coordinates, ROUTABLE_POINT_RADII_METERS[0]);
  } catch (error) {
    if (!isRoutablePointError(error)) throw error;

    try {
      data = await requestOpenDrivingRoute(coordinates, ROUTABLE_POINT_RADII_METERS[1]);
    } catch (retryError) {
      if (isRoutablePointError(retryError)) {
        throw new Error(
          "Não foi possível ligar a origem ou o destino a uma via para carros. Escolha um endereço mais específico ou um ponto próximo da rua.",
        );
      }
      throw retryError;
    }
  }

  const firstFeature = Array.isArray(data.features) ? record(data.features[0]) : null;
  const properties = record(firstFeature?.properties);
  const summary = record(properties?.summary);
  const geometryRecord = record(firstFeature?.geometry);
  const rawCoordinates = Array.isArray(geometryRecord?.coordinates) ? geometryRecord.coordinates : [];
  const geometry = rawCoordinates
    .map((coordinate) => Array.isArray(coordinate)
      ? [asFiniteCoordinate(coordinate[0], -180, 180), asFiniteCoordinate(coordinate[1], -90, 90)]
      : [null, null])
    .filter((coordinate): coordinate is RouteCoordinate => coordinate[0] !== null && coordinate[1] !== null);
  const distanceMeters = Math.round(Number(summary?.distance || 0));
  const durationSeconds = Math.round(Number(summary?.duration || 0));
  if (distanceMeters <= 0 || durationSeconds <= 0 || geometry.length < 2) {
    throw new Error("Não encontramos uma rota de carro entre os endereços.");
  }

  const payload: SignedRoutePayload = {
    distanceMeters,
    durationSeconds,
    origin: normalizeLabel(originInput.label),
    destination: normalizeLabel(destinationInput.label),
    expiresAt: Date.now() + 30 * 60 * 1000,
  };

  return {
    distanceMeters,
    durationSeconds,
    geometry: simplifyGeometry(geometry),
    origin,
    destination,
    token: createRouteToken(payload),
  };
}
