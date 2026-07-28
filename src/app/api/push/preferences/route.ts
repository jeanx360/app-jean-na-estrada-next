import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import type { NotificationPreferences } from "@/types/notification";

export const dynamic = "force-dynamic";

const defaults: NotificationPreferences = {
  pushEnabled: false,
  general: true,
  videos: true,
  tutorials: true,
  apps: true,
  benefits: true,
};

export async function GET() {
  const { userId, supabase } = await getAuthContext();
  if (!userId) {
    return NextResponse.json(
      { authenticated: false, preferences: defaults },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .select(
      "push_enabled, general_enabled, videos_enabled, tutorials_enabled, apps_enabled, benefits_enabled",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const preferences: NotificationPreferences = data
    ? {
        pushEnabled: data.push_enabled,
        general: data.general_enabled,
        videos: data.videos_enabled,
        tutorials: data.tutorials_enabled,
        apps: data.apps_enabled,
        benefits: data.benefits_enabled,
      }
    : defaults;

  return NextResponse.json(
    { authenticated: true, preferences },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function POST(request: Request) {
  const { userId, supabase } = await getAuthContext();
  if (!userId) {
    return NextResponse.json({ ok: true, authenticated: false });
  }

  const body = (await request.json()) as Partial<NotificationPreferences>;
  const preferences: NotificationPreferences = {
    pushEnabled: body.pushEnabled === true,
    general: body.general !== false,
    videos: body.videos !== false,
    tutorials: body.tutorials !== false,
    apps: body.apps !== false,
    benefits: body.benefits !== false,
  };

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: userId,
      push_enabled: preferences.pushEnabled,
      general_enabled: preferences.general,
      videos_enabled: preferences.videos,
      tutorials_enabled: preferences.tutorials,
      apps_enabled: preferences.apps,
      benefits_enabled: preferences.benefits,
    },
    { onConflict: "user_id" },
  );

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, authenticated: true });
}
