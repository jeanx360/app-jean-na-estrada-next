import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NotificationPreferences, PushSubscriptionPayload } from "@/types/notification";

export const dynamic = "force-dynamic";

const defaultCategories = {
  general: true,
  videos: true,
  tutorials: true,
  apps: true,
  benefits: true,
};

function normalizeCategories(value: Partial<NotificationPreferences> | undefined) {
  return {
    general: value?.general !== false,
    videos: value?.videos !== false,
    tutorials: value?.tutorials !== false,
    apps: value?.apps !== false,
    benefits: value?.benefits !== false,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      subscription?: PushSubscriptionPayload;
      categories?: Partial<NotificationPreferences>;
    };
    const subscription = body.subscription;

    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ ok: false, error: "Assinatura push inválida." }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("save_push_subscription", {
      subscription_endpoint: subscription.endpoint,
      subscription_p256dh: subscription.keys.p256dh,
      subscription_auth_key: subscription.keys.auth,
      subscription_categories: normalizeCategories(body.categories) ?? defaultCategories,
      subscription_user_agent: request.headers.get("user-agent"),
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao salvar assinatura." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { endpoint?: string };
    if (!body.endpoint) {
      return NextResponse.json({ ok: false, error: "Endpoint não informado." }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("remove_push_subscription", {
      subscription_endpoint: body.endpoint,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao remover assinatura." },
      { status: 500 },
    );
  }
}
