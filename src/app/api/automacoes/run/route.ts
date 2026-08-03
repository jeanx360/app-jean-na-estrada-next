import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { runDriverNotificationAutomations } from "@/lib/driver-automation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function secureEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}

function authorized(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const acceptedSecrets = [process.env.CRON_SECRET, process.env.AUTOMATION_CRON_SECRET]
    .filter((value): value is string => Boolean(value));
  return acceptedSecrets.some((secret) => secureEqual(authorization, `Bearer ${secret}`));
}

async function execute(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDriverNotificationAutomations(createAdminClient(), "cron");
    return Response.json(result, {
      status: result.ok ? 200 : 500,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return execute(request);
}

export async function POST(request: NextRequest) {
  return execute(request);
}
