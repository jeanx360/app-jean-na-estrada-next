import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";

export const GOOGLE_YOUTUBE_MEMBER_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
export const GOOGLE_YOUTUBE_CREATOR_SCOPE =
  "https://www.googleapis.com/auth/youtube.channel-memberships.creator";

export type GoogleChannel = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} não configurada no servidor.`);
  return value;
}

export function getAppUrl() {
  return requiredEnvironment("NEXT_PUBLIC_APP_URL").replace(/\/+$/, "");
}

export function getGoogleOAuthConfig() {
  return {
    clientId: requiredEnvironment("GOOGLE_OAUTH_CLIENT_ID"),
    clientSecret: requiredEnvironment("GOOGLE_OAUTH_CLIENT_SECRET"),
  };
}

export function googleRedirectUri(mode: "admin" | "member") {
  return `${getAppUrl()}/api/youtube/${mode}/callback`;
}

export function createOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function safeStateEquals(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function buildGoogleAuthorizationUrl(options: {
  mode: "admin" | "member";
  state: string;
}) {
  const { clientId } = getGoogleOAuthConfig();
  const scopes =
    options.mode === "admin"
      ? ["openid", "email", GOOGLE_YOUTUBE_MEMBER_SCOPE, GOOGLE_YOUTUBE_CREATOR_SCOPE]
      : ["openid", "email", GOOGLE_YOUTUBE_MEMBER_SCOPE];

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", googleRedirectUri(options.mode));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", options.state);
  url.searchParams.set("include_granted_scopes", "true");

  if (options.mode === "admin") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  } else {
    url.searchParams.set("access_type", "online");
    url.searchParams.set("prompt", "select_account");
  }

  return url;
}

export async function exchangeGoogleAuthorizationCode(options: {
  code: string;
  mode: "admin" | "member";
}) {
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const body = new URLSearchParams({
    code: options.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: googleRedirectUri(options.mode),
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const payload = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Falha ao autorizar a conta Google.");
  }

  return payload;
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const payload = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Não foi possível renovar a autorização Google.");
  }

  return payload.access_token;
}

export async function fetchGoogleYouTubeChannels(accessToken: string): Promise<GoogleChannel[]> {
  const url = new URL(`${YOUTUBE_API_URL}/channels`);
  url.searchParams.set("part", "id,snippet");
  url.searchParams.set("mine", "true");
  url.searchParams.set("maxResults", "50");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    items?: Array<{
      id?: string;
      snippet?: {
        title?: string;
        thumbnails?: { default?: { url?: string }; medium?: { url?: string } };
      };
    }>;
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || `YouTube respondeu HTTP ${response.status}.`);
  }

  return (payload.items ?? [])
    .filter((item): item is typeof item & { id: string } => Boolean(item.id))
    .map((item) => ({
      id: item.id,
      title: item.snippet?.title || "Canal do YouTube",
      thumbnailUrl:
        item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || null,
    }));
}

function encryptionKey() {
  const raw = requiredEnvironment("GOOGLE_TOKEN_ENCRYPTION_KEY");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY precisa ser uma chave Base64 de 32 bytes.");
  }
  return key;
}

export function encryptRefreshToken(refreshToken: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptRefreshToken(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Token Google armazenado em formato inválido.");
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function googleOAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY &&
      process.env.NEXT_PUBLIC_APP_URL,
  );
}
