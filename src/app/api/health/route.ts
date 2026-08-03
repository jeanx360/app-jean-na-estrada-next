import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/app-version";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "jne-app",
    version: APP_VERSION,
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    serviceRoleConfigured: Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
    pushConfigured: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT),
    cronConfigured: Boolean(process.env.CRON_SECRET),
    automationCronConfigured: Boolean(process.env.AUTOMATION_CRON_SECRET || process.env.CRON_SECRET),
    publicUrlConfigured: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    vipMode: "manual-and-direct-subscription",
    communityMode: "vip-moderated",
    professionalDriverMode: "public-profile-reservations-quotes-finance-network-and-internal-automations",
    youtubeMembershipAutomation: "removed",
    timestamp: new Date().toISOString(),
  });
}
