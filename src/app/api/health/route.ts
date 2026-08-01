import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "jne-app",
    version: "1.7.2",
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    serviceRoleConfigured: Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    pushConfigured: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT),
    cronConfigured: Boolean(process.env.CRON_SECRET),
    publicUrlConfigured: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    vipMode: "manual-and-direct-subscription",
    communityMode: "vip-moderated",
    professionalDriverMode: "public-profile-reservations-quotes-and-financial-control",
    youtubeMembershipAutomation: "removed",
    timestamp: new Date().toISOString(),
  });
}
