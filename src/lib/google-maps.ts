import { createHmac, timingSafeEqual } from "node:crypto";

export type GoogleRoutePoint = {
  label: string;
  placeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type GooglePlaceSuggestion = {
  placeId: string;
  label: string;
};

export type GoogleRouteEstimate = {
  distanceMeters: number;
  durationSeconds: number;
  token: string;
};

type SignedRoutePayload = {
  distanceMeters: number;
  durationSeconds: number;
  origin: string;
  destination: string;
  expiresAt: number;
};

function mapsApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY?.trim() || process.env.MAPS_SERVER_API_KEY?.trim() || "";
}

function signingSecret() {
  return process.env.ROUTE_ESTIMATE_SECRET?.trim() || mapsApiKey();
}

export function googleMapsConfigured() {
  return Boolean(mapsApiKey());
}

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 180);
}

function asFiniteCoordinate(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

async function fetchGoogle(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      const message = typeof data?.error === "object" && data?.error
        ? String((data.error as Record<string, unknown>).message || "")
        : "";
      throw new Error(message || `Google Maps respondeu HTTP ${response.status}.`);
    }
    return data ?? {};
  } finally {
    clearTimeout(timeout);
  }
}

export async function autocompleteGooglePlaces(
  input: string,
  bias?: { latitude?: number | null; longitude?: number | null },
): Promise<GooglePlaceSuggestion[]> {
  const key = mapsApiKey();
  if (!key) throw new Error("A integração de mapas ainda não foi configurada.");

  const normalizedInput = input.trim().slice(0, 120);
  if (normalizedInput.length < 3) return [];

  const latitude = asFiniteCoordinate(bias?.latitude, -90, 90);
  const longitude = asFiniteCoordinate(bias?.longitude, -180, 180);
  const body: Record<string, unknown> = {
    input: normalizedInput,
    languageCode: "pt-BR",
    regionCode: "br",
    includedRegionCodes: ["br"],
  };

  if (latitude !== null && longitude !== null) {
    body.locationBias = {
      circle: {
        center: { latitude, longitude },
        radius: 50000,
      },
    };
  }

  const data = await fetchGoogle("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
    },
    body: JSON.stringify(body),
  });

  const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
  return suggestions
    .map((item) => {
      const prediction = typeof item === "object" && item
        ? (item as Record<string, unknown>).placePrediction
        : null;
      if (!prediction || typeof prediction !== "object") return null;
      const record = prediction as Record<string, unknown>;
      const text = typeof record.text === "object" && record.text
        ? String((record.text as Record<string, unknown>).text || "")
        : "";
      const placeId = String(record.placeId || "");
      return placeId && text ? { placeId, label: text.slice(0, 180) } : null;
    })
    .filter((item): item is GooglePlaceSuggestion => Boolean(item))
    .slice(0, 5);
}

export async function reverseGoogleGeocode(latitudeInput: unknown, longitudeInput: unknown) {
  const key = mapsApiKey();
  if (!key) throw new Error("A integração de mapas ainda não foi configurada.");
  const latitude = asFiniteCoordinate(latitudeInput, -90, 90);
  const longitude = asFiniteCoordinate(longitudeInput, -180, 180);
  if (latitude === null || longitude === null) throw new Error("Localização inválida.");

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${latitude},${longitude}`);
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("region", "br");
  url.searchParams.set("key", key);

  const data = await fetchGoogle(url.toString(), { method: "GET" });
  const results = Array.isArray(data.results) ? data.results : [];
  const first = results[0];
  if (!first || typeof first !== "object") {
    return { label: "Localização atual", latitude, longitude };
  }
  const record = first as Record<string, unknown>;
  return {
    label: String(record.formatted_address || "Localização atual").slice(0, 180),
    placeId: String(record.place_id || "") || null,
    latitude,
    longitude,
  };
}

function waypoint(point: GoogleRoutePoint) {
  const placeId = point.placeId?.trim();
  if (placeId) return { placeId };
  const latitude = asFiniteCoordinate(point.latitude, -90, 90);
  const longitude = asFiniteCoordinate(point.longitude, -180, 180);
  if (latitude !== null && longitude !== null) {
    return { location: { latLng: { latitude, longitude } } };
  }
  const address = point.label.trim().slice(0, 180);
  if (address.length >= 3) return { address };
  throw new Error("Informe origem e destino válidos.");
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

export function verifyGoogleRouteToken(
  token: string,
  origin: string,
  destination: string,
): SignedRoutePayload | null {
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
      || payload.distanceMeters > 5000000
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

export async function computeGoogleDrivingRoute(
  origin: GoogleRoutePoint,
  destination: GoogleRoutePoint,
): Promise<GoogleRouteEstimate> {
  const key = mapsApiKey();
  if (!key) throw new Error("A integração de mapas ainda não foi configurada.");

  const data = await fetchGoogle("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
    },
    body: JSON.stringify({
      origin: waypoint(origin),
      destination: waypoint(destination),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
      languageCode: "pt-BR",
      units: "METRIC",
    }),
  });

  const routes = Array.isArray(data.routes) ? data.routes : [];
  const first = routes[0];
  if (!first || typeof first !== "object") throw new Error("Não encontramos uma rota de carro entre os endereços.");
  const record = first as Record<string, unknown>;
  const distanceMeters = Math.round(Number(record.distanceMeters || 0));
  const durationMatch = String(record.duration || "").match(/^([0-9]+(?:\.[0-9]+)?)s$/);
  const durationSeconds = durationMatch ? Math.round(Number(durationMatch[1])) : 0;
  if (distanceMeters <= 0 || durationSeconds <= 0) throw new Error("A rota não retornou distância e tempo válidos.");

  const payload: SignedRoutePayload = {
    distanceMeters,
    durationSeconds,
    origin: normalizeLabel(origin.label),
    destination: normalizeLabel(destination.label),
    expiresAt: Date.now() + 30 * 60 * 1000,
  };

  return { distanceMeters, durationSeconds, token: createRouteToken(payload) };
}
