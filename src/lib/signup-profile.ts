import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeDriverSlug, normalizeWhatsAppPhone } from "@/lib/driver-public";

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function booleanValue(value: unknown) {
  return value === true || value === "true" || value === "yes" || value === "1";
}

function driverSlug(name: string, userId: string) {
  const base = normalizeDriverSlug(name).slice(0, 35) || "motorista";
  return `${base}-${userId.replace(/-/g, "").slice(0, 8)}`.slice(0, 48);
}

export async function bootstrapSignupProfile(supabase: SupabaseClient) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return;

  const user = userData.user;
  const metadata = user.user_metadata ?? {};
  if (metadata.signup_profile_bootstrapped_at) return;

  const isProfessionalDriver = booleanValue(metadata.is_professional_driver);
  if (isProfessionalDriver) {
    const fullName = text(metadata.full_name, 80) || "Motorista JNE";
    const phone = normalizeWhatsAppPhone(text(metadata.phone, 20));
    const vehicleModel = text(metadata.vehicle_model, 100);

    const { error: preferenceError } = await supabase.rpc("update_driver_profile_preferences", {
      new_is_professional_driver: true,
      new_preferred_home: "driver",
    });
    if (preferenceError) throw preferenceError;

    if (phone.length >= 10) {
      const { data: existing, error: existingError } = await supabase
        .from("driver_public_profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existingError) throw existingError;

      if (!existing) {
        const { error: publicProfileError } = await supabase
          .from("driver_public_profiles")
          .insert({
            user_id: user.id,
            slug: driverSlug(fullName, user.id),
            display_name: fullName,
            headline: "Motorista particular",
            whatsapp_phone: phone,
            vehicle_name: vehicleModel || null,
            photo_url: null,
            is_published: false,
            accepts_reservations: true,
          });
        if (publicProfileError) throw publicProfileError;
      }
    }

    const { error: settingsError } = await supabase
      .from("driver_settings")
      .upsert({ user_id: user.id }, { onConflict: "user_id" });
    if (settingsError) throw settingsError;
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      ...metadata,
      signup_profile_bootstrapped_at: new Date().toISOString(),
    },
  });
  if (metadataError) throw metadataError;
}
