"use client";

import { useState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { asNumber, type DriverSettings } from "@/lib/driver";

type Props = {
  userId: string;
  initialSettings: DriverSettings;
  compact?: boolean;
};

function numeric(value: number) {
  return String(Number.isFinite(value) ? value : 0).replace(".", ",");
}

export function DriverSettingsForm({ userId, initialSettings, compact = false }: Props) {
  const router = useRouter();
  const [hourlyRate, setHourlyRate] = useState(numeric(initialSettings.hourly_rate));
  const [kmRate, setKmRate] = useState(numeric(initialSettings.km_rate));
  const [minimumFare, setMinimumFare] = useState(numeric(initialSettings.minimum_fare));
  const [waitingRate, setWaitingRate] = useState(numeric(initialSettings.waiting_hour_rate));
  const [reservePercent, setReservePercent] = useState(numeric(initialSettings.maintenance_reserve_percent));
  const [roundingStep, setRoundingStep] = useState(numeric(initialSettings.rounding_step));
  const [scheduleBuffer, setScheduleBuffer] = useState(numeric(initialSettings.schedule_buffer_minutes));
  const [defaultDuration, setDefaultDuration] = useState(numeric(initialSettings.default_reservation_duration_minutes));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const payload = {
      user_id: userId,
      hourly_rate: Math.max(0, asNumber(hourlyRate)),
      km_rate: Math.max(0, asNumber(kmRate)),
      minimum_fare: Math.max(0, asNumber(minimumFare)),
      waiting_hour_rate: Math.max(0, asNumber(waitingRate)),
      maintenance_reserve_percent: Math.min(100, Math.max(0, asNumber(reservePercent))),
      rounding_step: Math.max(0, asNumber(roundingStep)),
      schedule_buffer_minutes: Math.min(240, Math.max(0, Math.round(asNumber(scheduleBuffer)))),
      default_reservation_duration_minutes: Math.min(720, Math.max(15, Math.round(asNumber(defaultDuration)))),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("driver_settings").upsert(payload, { onConflict: "user_id" });
    if (error) setMessage(error.message);
    else {
      setMessage("Valores padrão salvos.");
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <section className={`driver-settings-form ${compact ? "driver-settings-form--compact" : ""}`}>
      <div className="driver-settings-form__heading">
        <div><span className="eyebrow">SEUS VALORES</span><h2>Parâmetros padrão</h2></div>
        <p>São apenas referências pessoais. Ajuste conforme veículo, região, custos e tipo de serviço.</p>
      </div>
      <div className="driver-settings-grid">
        <label><span>Valor por hora</span><input inputMode="decimal" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} /></label>
        <label><span>Valor por km</span><input inputMode="decimal" value={kmRate} onChange={(e) => setKmRate(e.target.value)} /></label>
        <label><span>Valor mínimo</span><input inputMode="decimal" value={minimumFare} onChange={(e) => setMinimumFare(e.target.value)} /></label>
        <label><span>Hora de espera</span><input inputMode="decimal" value={waitingRate} onChange={(e) => setWaitingRate(e.target.value)} /></label>
        <label><span>Reserva para manutenção (%)</span><input inputMode="decimal" value={reservePercent} onChange={(e) => setReservePercent(e.target.value)} /></label>
        <label><span>Arredondar para múltiplos de</span><input inputMode="decimal" value={roundingStep} onChange={(e) => setRoundingStep(e.target.value)} /></label>
        <label><span>Duração padrão da reserva (min)</span><input inputMode="numeric" value={defaultDuration} onChange={(e) => setDefaultDuration(e.target.value)} /></label>
        <label><span>Intervalo entre corridas (min)</span><input inputMode="numeric" value={scheduleBuffer} onChange={(e) => setScheduleBuffer(e.target.value)} /></label>
      </div>
      {message ? <p className="driver-form-message">{message}</p> : null}
      <button className="button button--primary" type="button" onClick={save} disabled={saving}>
        {saving ? <LoaderCircle className="auth-spinner" size={18} /> : <Save size={18} />}
        {saving ? "Salvando..." : "Salvar valores"}
      </button>
    </section>
  );
}
