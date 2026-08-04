import { createHmac, timingSafeEqual } from "node:crypto";

const GUEST_ACCESS_HEADER = "x-jne-guest-access";
const TOKEN_VERSION = 1;
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

type GuestAccessPayload = {
  version: number;
  driverSlug: string;
  expiresAt: number;
};

function signingSecret() {
  return process.env.ROUTE_ESTIMATE_SECRET?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || process.env.OPENROUTESERVICE_API_KEY?.trim()
    || "";
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48);
}

function encodePayload(payload: GuestAccessPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function sign(encoded: string) {
  const secret = signingSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(encoded).digest("base64url");
}

export function createPublicGuestAccessToken(driverSlug: string) {
  const normalizedSlug = normalizeSlug(driverSlug);
  if (!normalizedSlug || !signingSecret()) return "";
  const encoded = encodePayload({
    version: TOKEN_VERSION,
    driverSlug: normalizedSlug,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
  return `${encoded}.${sign(encoded)}`;
}

export function verifyPublicGuestAccessToken(token: string, expectedDriverSlug?: string) {
  const [encoded, providedSignature] = token.trim().split(".");
  if (!encoded || !providedSignature || !signingSecret()) return null;

  const expectedSignature = sign(encoded);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as GuestAccessPayload;
    const expectedSlug = expectedDriverSlug ? normalizeSlug(expectedDriverSlug) : "";
    if (
      payload.version !== TOKEN_VERSION
      || !payload.driverSlug
      || payload.driverSlug !== normalizeSlug(payload.driverSlug)
      || !Number.isFinite(payload.expiresAt)
      || payload.expiresAt < Date.now()
      || (expectedSlug && payload.driverSlug !== expectedSlug)
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readPublicGuestAccessToken(request: Request) {
  return request.headers.get(GUEST_ACCESS_HEADER)?.trim() || "";
}

export function publicGuestAccessHeaders(token: string) {
  return token ? { [GUEST_ACCESS_HEADER]: token } : {};
}
