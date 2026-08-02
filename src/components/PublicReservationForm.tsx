"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { TRIP_TYPE_LABELS, type DriverTripType } from "@/lib/driver";
import type { DriverMarketingSource } from "@/lib/driver-marketing";
import { type DriverServicePackage } from "@/lib/driver-public";

type Props = {
  driverSlug: string;
  packages: DriverServicePackage[];
  initialPackageId?: string;
  source?: DriverMarketingSource;
  campaignCode?: string;
};

type FormState = {
  packageId: string;
  passengerName: string;
  passengerPhone: string;
  origin: string;
  destination: string;
  travelDate: string;
  travelTime: string;
  tripType: DriverTripType;
  passengers: string;
  luggage: string;
  notes: string;
  company: string;
};

const initialForm: FormState = {
  packageId: "",
  passengerName: "",
  passengerPhone: "",
  origin: "",
  destination: "",
  travelDate: "",
  travelTime: "",
  tripType: "outbound",
  passengers: "1",
  luggage: "",
  notes: "",
  company: "",
};

export function PublicReservationForm({ driverSlug, packages, initialPackageId = "", source = "profile", campaignCode = "" }: Props) {
  const [form, setForm] = useState<FormState>({ ...initialForm, packageId: initialPackageId });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);

  const minimumDate = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function trackStarted() {
    if (started.current) return;
    started.current = true;
    void fetch("/api/motorista/perfil-evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverSlug, eventType: "reservation_started", source, campaignCode, packageId: form.packageId || null }),
      keepalive: true,
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (form.passengerName.trim().length < 2) return setMessage("Informe seu nome.");
    if (form.passengerPhone.replace(/\D/g, "").length < 10) return setMessage("Informe um WhatsApp com DDD.");
    if (!form.origin.trim() && !form.destination.trim() && !form.packageId) return setMessage("Escolha um serviço ou informe origem e destino.");
    if (!form.travelDate) return setMessage("Escolha a data desejada.");

    setSending(true);
    try {
      const response = await fetch("/api/motorista/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverSlug, source, campaignCode, ...form }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível enviar a solicitação.");
      setSuccess(true);
      setForm(initialForm);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar a solicitação.");
    } finally {
      setSending(false);
    }
  }

  if (success) {
    return (
      <section className="public-reservation-success" id="reservar">
        <CheckCircle2 size={44} />
        <span className="eyebrow">SOLICITAÇÃO ENVIADA</span>
        <h2>O motorista já foi avisado</h2>
        <p>Ele recebeu os dados da viagem e poderá entrar em contato pelo WhatsApp para confirmar detalhes e valor.</p>
        <button className="button button--secondary" type="button" onClick={() => setSuccess(false)}>Fazer outra solicitação</button>
      </section>
    );
  }

  return (
    <section className="public-reservation-card" id="reservar">
      <div className="public-reservation-card__heading"><CalendarDays size={25} /><div><span className="eyebrow">RESERVA</span><h2>Solicitar uma corrida</h2><p>Leva menos de um minuto. O envio não confirma automaticamente a viagem.</p></div></div>
      <form onSubmit={submit} onFocus={trackStarted}>
        <label className="public-reservation-honeypot" aria-hidden="true"><span>Empresa</span><input tabIndex={-1} autoComplete="off" value={form.company} onChange={(event) => update("company", event.target.value)} /></label>
        {packages.length ? <label><span>Serviço desejado</span><select value={form.packageId} onChange={(event) => update("packageId", event.target.value)}><option value="">Outro serviço ou rota</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label> : null}
        <div className="public-reservation-grid">
          <label><span>Seu nome</span><input maxLength={80} autoComplete="name" value={form.passengerName} onChange={(event) => update("passengerName", event.target.value)} placeholder="Como o motorista deve chamar você?" /></label>
          <label><span>WhatsApp</span><input inputMode="tel" autoComplete="tel" maxLength={20} value={form.passengerPhone} onChange={(event) => update("passengerPhone", event.target.value)} placeholder="DDD + número" /><small>Para números do Brasil, adicionamos +55 automaticamente.</small></label>
          <label><span>Origem</span><input maxLength={180} value={form.origin} onChange={(event) => update("origin", event.target.value)} placeholder="Bairro, cidade ou endereço" /></label>
          <label><span>Destino</span><input maxLength={180} value={form.destination} onChange={(event) => update("destination", event.target.value)} placeholder="Bairro, cidade ou endereço" /></label>
          <label><span>Data (dd/mm/aaaa)</span><input type="date" lang="pt-BR" min={minimumDate} value={form.travelDate} onChange={(event) => update("travelDate", event.target.value)} /></label>
          <label><span>Horário aproximado (24h)</span><input type="time" lang="pt-BR" step={60} value={form.travelTime} onChange={(event) => update("travelTime", event.target.value)} /><small>Use o formato 00:00 a 23:59.</small></label>
          <label><span>Passageiros</span><input type="number" min={1} max={20} value={form.passengers} onChange={(event) => update("passengers", event.target.value)} /></label>
          <label><span>Bagagens</span><input maxLength={180} value={form.luggage} onChange={(event) => update("luggage", event.target.value)} placeholder="Ex.: 2 malas médias" /></label>
        </div>
        <fieldset className="public-trip-type"><legend>Tipo de viagem</legend><div>{(Object.keys(TRIP_TYPE_LABELS) as DriverTripType[]).map((type) => <label key={type} className={form.tripType === type ? "is-selected" : ""}><input type="radio" name="tripType" checked={form.tripType === type} onChange={() => update("tripType", type)} /><span>{TRIP_TYPE_LABELS[type]}</span></label>)}</div></fieldset>
        <label><span>Observações</span><textarea rows={3} maxLength={700} value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Crianças, acessibilidade, parada extra ou qualquer detalhe importante." /></label>
        <label className="public-consent"><input type="checkbox" required defaultChecked /><span>Autorizo o motorista a entrar em contato sobre esta solicitação.</span></label>
        {message ? <p className="auth-message auth-message--error">{message}</p> : null}
        <button className="button button--primary public-reservation-submit" type="submit" disabled={sending}>{sending ? <LoaderCircle className="auth-spinner" size={19} /> : <Send size={19} />}{sending ? "Enviando..." : "Enviar solicitação"}</button>
      </form>
    </section>
  );
}
