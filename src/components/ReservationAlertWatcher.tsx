"use client";

import Link from "next/link";
import { CalendarCheck2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "jne-latest-reservation-alert";

type AlertReservation = { id: string; passenger_name: string; origin: string | null; destination: string | null; created_at: string };

function playReservationTone() {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const now = context.currentTime;
    [740, 880, 1040].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.18, now + index * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.18 + 0.14);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + index * 0.18);
      oscillator.stop(now + index * 0.18 + 0.16);
    });
    window.setTimeout(() => void context.close(), 1000);
  } catch {
    // Navegadores podem bloquear áudio sem interação prévia.
  }
}

export function ReservationAlertWatcher() {
  const initialized = useRef(false);
  const [reservation, setReservation] = useState<AlertReservation | null>(null);

  const check = useCallback(async () => {
    try {
      const response = await fetch("/api/motorista/reservas/alerta", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { reservation?: AlertReservation | null };
      const latest = data.reservation ?? null;
      if (!latest) return;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!initialized.current) {
        initialized.current = true;
        const recent = Date.now() - new Date(latest.created_at).getTime() < 15 * 60 * 1000;
        if (stored !== latest.id) {
          localStorage.setItem(STORAGE_KEY, latest.id);
          if (Boolean(stored) || recent) {
            setReservation(latest);
            playReservationTone();
            navigator.vibrate?.([180, 90, 180]);
            window.dispatchEvent(new Event("jne-notifications-updated"));
          }
        }
        return;
      }
      if (stored !== latest.id) {
        localStorage.setItem(STORAGE_KEY, latest.id);
        setReservation(latest);
        playReservationTone();
        navigator.vibrate?.([180, 90, 180]);
        window.dispatchEvent(new Event("jne-notifications-updated"));
      }
    } catch {
      // O alerta não deve interromper o uso do app.
    }
  }, []);

  useEffect(() => {
    void check();
    const interval = window.setInterval(() => void check(), 30000);
    return () => window.clearInterval(interval);
  }, [check]);

  if (!reservation) return null;
  const route = [reservation.origin, reservation.destination].filter(Boolean).join(" → ");
  return (
    <aside className="reservation-live-alert" role="status" aria-live="assertive">
      <span className="reservation-live-alert__icon"><CalendarCheck2 size={24} /></span>
      <div><strong>Nova solicitação de corrida</strong><p>{reservation.passenger_name}{route ? ` · ${route}` : " quer reservar uma viagem"}</p><Link href={`/motorista/reservas/${reservation.id}`} onClick={() => setReservation(null)}>Ver solicitação</Link></div>
      <button className="icon-button" type="button" onClick={() => setReservation(null)} aria-label="Fechar alerta"><X size={18} /></button>
    </aside>
  );
}
