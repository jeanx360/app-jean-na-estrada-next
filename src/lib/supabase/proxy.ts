import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SESSION_CACHE_CONTROL = "private, no-store, no-cache, max-age=0, must-revalidate";

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

  // Valida ou renova a sessão dentro do contexto de cookies desta requisição.
  // O cabeçalho no-store impede que respostas com Set-Cookie sejam reutilizadas
  // pelo CDN para outro navegador ou outra sessão.
  await supabase.auth.getClaims();

  return applySessionSafetyHeaders(response);
}
