import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SESSION_CACHE_CONTROL = "private, no-store, no-cache, max-age=0, must-revalidate";

const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/videos",
  "/noticias",
  "/entrar",
  "/cadastro",
  "/comecar",
  "/motoristas",
  "/recuperar-senha",
  "/atualizar-senha",
  "/termos",
  "/privacidade",
  "/suporte",
  "/offline.html",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/icon.png",
  "/apple-icon.png",
]);

const PUBLIC_PAGE_PREFIXES = ["/auth/", "/m/"];
const PUBLIC_API_EXACT_PATHS = new Set([
  "/api/motorista/perfil-evento",
  "/api/motorista/reservas",
]);

const PUBLIC_API_PREFIXES = [
  "/api/health",
  "/api/news",
  "/api/analytics/page-view",
  "/api/maps/",
  "/api/motorista/contato/",
  "/api/cron/",
  "/api/automacoes/run",
];

function applySessionSafetyHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", SESSION_CACHE_CONTROL);
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "no-store");

  const varyValues = new Set(
    (response.headers.get("Vary") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  ["Cookie", "RSC", "Next-Router-State-Tree", "Next-Router-Prefetch", "Next-Url"].forEach(
    (value) => varyValues.add(value),
  );

  response.headers.set("Vary", Array.from(varyValues).join(", "));
  return response;
}

function isPublicPath(pathname: string) {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true;
  return PUBLIC_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isPublicApi(pathname: string) {
  if (PUBLIC_API_EXACT_PATHS.has(pathname)) return true;
  return PUBLIC_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

function copyResponseCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export async function updateSession(request: NextRequest) {
  let response = applySessionSafetyHeaders(NextResponse.next({ request }));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });

          applySessionSafetyHeaders(response);
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  const pathname = request.nextUrl.pathname;

  if (!userId && pathname.startsWith("/api/") && !isPublicApi(pathname)) {
    return applySessionSafetyHeaders(
      copyResponseCookies(
        response,
        NextResponse.json(
          { ok: false, error: "Faça um cadastro gratuito para continuar." },
          { status: 401 },
        ),
      ),
    );
  }

  if (!userId && !pathname.startsWith("/api/") && !isPublicPath(pathname)) {
    const nextPath = `${pathname}${request.nextUrl.search}`;
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/entrar";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", nextPath);
    loginUrl.searchParams.set("motivo", "cadastro");
    return applySessionSafetyHeaders(
      copyResponseCookies(response, NextResponse.redirect(loginUrl)),
    );
  }

  return applySessionSafetyHeaders(response);
}
