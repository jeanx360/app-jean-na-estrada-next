import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "jne-app",
    version: "1.2.0",
    supabaseConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    serviceRoleConfigured: Boolean(
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    pushConfigured: Boolean(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
        process.env.VAPID_PRIVATE_KEY &&
        process.env.VAPID_SUBJECT,
    ),
    cronConfigured: Boolean(process.env.CRON_SECRET),
    publicUrlConfigured: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    googleOAuthConfigured: Boolean(
      process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    ),
    googleTokenEncryptionConfigured: Boolean(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY),
    youtubeChannelConfigured: Boolean(process.env.YOUTUBE_CHANNEL_ID),
    timestamp: new Date().toISOString(),
  });
}
