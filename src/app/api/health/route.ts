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
    googleMapsConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY || process.env.MAPS_SERVER_API_KEY),
    guestAccessMode: "home-videos-news",
    vipMode: "manual-and-direct-subscription",
    communityMode: "vip-moderated",
    professionalDriverMode: "single-signup-profile-public-routes-reservations-quotes-finance-network-automations-and-executive-admin",
    executiveAdminDashboard: true,
    onboardingCenter: true,
    supportCenter: true,
    commercialLaunchCandidate: true,
    releaseChannel: "commercial-2.0",
    youtubeMembershipAutomation: "removed",
    timestamp: new Date().toISOString(),
  });
}
