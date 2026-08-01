"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Clipboard, LoaderCircle, Save, Send, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  asNumber,
  formatCurrency,
  TRIP_TYPE_LABELS,
  type DriverSettings,
  type DriverTripType,
} from "@/lib/driver";

type InputState = {
  customerName: string;
  origin: string;
  destination: string;
  travelDate: string;
  tripType: DriverTripType;
  distancePerLeg: string;
  durationHours: string;
  durationMinutes: string;
  waitingMinutes: string;
  tolls: string;
  parking: string;
  otherCosts: string;
  discount: string;
  kmRate: string;
  hourlyRate: string;
  waitingRate: string;
  minimumFare: string;
  reservePercent: string;
  roundingStep: string;
  notes: string;
};

type Props = {
  userId: string | null;
  canSave: boolean;
  initialSettings: DriverSettings;
  initialInput?: Partial<InputState>;
  reservationId?: string | null;
};

function inputValue(value: number) {
  return String(value).replace(".", ",");
}

export function DriverQuoteCalculator({ userId, canSave, initialSettings, initialInput, reservationId }: Props) {
  const [inputs, setInputs] = useState<InputState>({
    customerName: initialInput?.customerName ?? "",
    origin: initialInput?.origin ?? "",
    destination: initialInput?.destination ?? "",
    travelDate: initialInput?.travelDate ?? "",
    tripType: initialInput?.tripType ?? "outbound",
    distancePerLeg: "",
    durationHours: "",
    durationMinutes: "",
    waitingMinutes: "",
    tolls: "",
    parking: "",
    otherCosts: "",
    discount: "",
    kmRate: inputValue(initialSettings.km_rate),
    hourlyRate: inputValue(initialSettings.hourly_rate),
    waitingRate: inputValue(initialSettings.waiting_hour_rate),
    minimumFare: inputValue(initialSettings.minimum_fare),
    reservePercent: inputValue(initialSettings.maintenance_reserve_percent),
    roundingStep: inputValue(initialSettings.rounding_step),
    notes: initialInput?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function set<K extends keyof InputState>(key: K, value: InputState[K]) {
    setInputs((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setSavedQuoteId(null);
  }

  const result = useMemo(() => {
    const multiplier = inputs.tripType === "round_trip" ? 2 : 1;
    const distancePerLeg = Math.max(0, asNumber(inputs.distancePerLeg));
    const durationPerLegMinutes = Math.max(0, asNumber(inputs.durationHours) * 60 + asNumber(inputs.durationMinutes));
    const waitingMinutes = Math.max(0, asNumber(inputs.waitingMinutes));
    const totalDistance = distancePerLeg * multiplier;
    const drivingHours = (durationPerLegMinutes * multiplier) / 60;
    const waitingHours = waitingMinutes / 60;
    const kmRate = Math.max(0, asNumber(inputs.kmRate));
    const hourlyRate = Math.max(0, asNumber(inputs.hourlyRate));
    const waitingRate = Math.max(0, asNumber(inputs.waitingRate));
    const minimumFare = Math.max(0, asNumber(inputs.minimumFare));
    const reservePercent = Math.min(100, Math.max(0, asNumber(inputs.reservePercent)));
    const roundingStep = Math.max(0, asNumber(inputs.roundingStep));
    const tolls = Math.max(0, asNumber(inputs.tolls));
    const parking = Math.max(0, asNumber(inputs.parking));
    const otherCosts = Math.max(0, asNumber(inputs.otherCosts));
    const discount = Math.max(0, asNumber(inputs.discount));

    const distanceCharge = totalDistance * kmRate;
    const timeCharge = drivingHours * hourlyRate;
    const waitingCharge = waitingHours * waitingRate;
    const serviceSubtotal = distanceCharge + timeCharge + waitingCharge;
    const reserve = serviceSubtotal * (reservePercent / 100);
    const directCosts = tolls + parking + otherCosts;
    const rawTotal = Math.max(0, serviceSubtotal + reserve + directCosts - discount);
    const suggestedTotal = Math.max(minimumFare, rawTotal);
    const roundedTotal = roundingStep > 0
      ? Math.ceil(suggestedTotal / roundingStep) * roundingStep
      : suggestedTotal;

    return {
      multiplier,
      distancePerLeg,
      durationPerLegMinutes,
      waitingMinutes,
      totalDistance,
      drivingHours,
      billableHours: drivingHours + waitingHours,
      kmRate,
      hourlyRate,
      waitingRate,
      minimumFare,
      reservePercent,
      roundingStep,
      tolls,
      parking,
      otherCosts,
      discount,
      distanceCharge,
      timeCharge,
      waitingCharge,
      reserve,
      directCosts,
      suggestedTotal,
      roundedTotal,
    };
  }, [inputs]);

  const summary = useMemo(() => {
    const route = [inputs.origin.trim(), inputs.destination.trim()].filter(Boolean).join(" → ");
    const lines = [
      "Orçamento de viagem particular",
      route ? `Rota: ${route}` : null,
      `Serviço: ${TRIP_TYPE_LABELS[inputs.tripType]}`,
      inputs.travelDate ? `Data: ${new Date(`${inputs.travelDate}T12:00:00`).toLocaleDateString("pt-BR")}` : null,
      `Distância cobrada: ${result.totalDistance.toFixed(1).replace(".", ",")} km`,
      `Valor total: ${formatCurrency(result.roundedTotal)}`,
      result.directCosts > 0 ? "Pedágios e despesas informadas incluídos." : null,
      inputs.notes.trim() ? `Observações: ${inputs.notes.trim()}` : null,
    ].filter(Boolean);
    return lines.join("\n");
  }, [inputs, result]);

  async function share() {
    setMessage(null);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Orçamento de viagem", text: summary });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Não foi possível abrir o compartilhamento.");
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(summary);
    setMessage("Orçamento copiado.");
  }

  async function saveQuote() {
    if (!userId || !canSave) return;
    if (result.totalDistance <= 0 && result.drivingHours <= 0) {
      setMessage("Informe distância ou tempo estimado antes de salvar.");
      return;
    }
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { data: savedQuote, error } = await supabase.from("driver_quotes").insert({
      user_id: userId,
      customer_name: inputs.customerName.trim() || null,
      origin: inputs.origin.trim() || null,
      destination: inputs.destination.trim() || null,
      travel_date: inputs.travelDate || null,
      trip_type: inputs.tripType,
      distance_per_leg_km: result.distancePerLeg,
      duration_per_leg_minutes: result.durationPerLegMinutes,
      waiting_minutes: result.waitingMinutes,
      tolls: result.tolls,
      parking: result.parking,
      other_costs: result.otherCosts,
      discount: result.discount,
      km_rate: result.kmRate,
      hourly_rate: result.hourlyRate,
      waiting_hour_rate: result.waitingRate,
      minimum_fare: result.minimumFare,
      maintenance_reserve_percent: result.reservePercent,
      rounding_step: result.roundingStep,
      total_distance_km: result.totalDistance,
      billable_hours: result.billableHours,
      distance_charge: result.distanceCharge,
      time_charge: result.timeCharge,
      waiting_charge: result.waitingCharge,
      maintenance_reserve: result.reserve,
      direct_costs: result.directCosts,
      suggested_total: result.suggestedTotal,
      rounded_total: result.roundedTotal,
      status: "draft",
      notes: inputs.notes.trim() || null,
    }).select("id").single();
    if (error || !savedQuote) setMessage(error?.message ?? "Não foi possível salvar o orçamento.");
    else {
      if (reservationId) {
        await supabase.from("driver_reservations").update({
          quote_id: savedQuote.id,
          status: "quoted",
          updated_at: new Date().toISOString(),
        }).eq("id", reservationId).eq("driver_user_id", userId);
      }
      setSaved(true);
      setSavedQuoteId(savedQuote.id);
      setMessage(reservationId ? "Orçamento salvo. Agora você pode enviar, gerar PDF ou confirmar a corrida." : "Orçamento salvo no seu histórico.");
    }
    setSaving(false);
  }

  return (
    <div className="driver-calculator-layout">
      <section className="driver-calculator-form">
        <div className="driver-calculator-section">
          <span className="eyebrow">SERVIÇO</span>
          <div className="driver-field-grid driver-field-grid--wide">
            <label><span>Cliente (opcional)</span><input value={inputs.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="Nome do passageiro" /></label>
            <label><span>Data (opcional)</span><input type="date" value={inputs.travelDate} onChange={(e) => set("travelDate", e.target.value)} /></label>
            <label><span>Origem</span><input value={inputs.origin} onChange={(e) => set("origin", e.target.value)} placeholder="Porto Alegre" /></label>
            <label><span>Destino</span><input value={inputs.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Gramado" /></label>
          </div>
          <div className="driver-trip-type" role="radiogroup" aria-label="Tipo de viagem">
            {(Object.keys(TRIP_TYPE_LABELS) as DriverTripType[]).map((type) => (
              <button key={type} type="button" className={inputs.tripType === type ? "is-active" : ""} onClick={() => set("tripType", type)}>
                {TRIP_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="driver-calculator-section">
          <span className="eyebrow">DISTÂNCIA E TEMPO DO TRECHO</span>
          <p className="driver-help-text">Informe os dados de um trecho. Em “ida e volta”, o aplicativo duplica automaticamente distância e tempo de deslocamento.</p>
          <div className="driver-field-grid">
            <label><span>Distância do trecho (km)</span><input inputMode="decimal" value={inputs.distancePerLeg} onChange={(e) => set("distancePerLeg", e.target.value)} placeholder="0" /></label>
            <label><span>Horas do trecho</span><input inputMode="numeric" value={inputs.durationHours} onChange={(e) => set("durationHours", e.target.value)} placeholder="0" /></label>
            <label><span>Minutos adicionais</span><input inputMode="numeric" value={inputs.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} placeholder="0" /></label>
            <label><span>Espera no destino (min)</span><input inputMode="numeric" value={inputs.waitingMinutes} onChange={(e) => set("waitingMinutes", e.target.value)} placeholder="0" /></label>
          </div>
        </div>

        <div className="driver-calculator-section">
          <span className="eyebrow">VALORES E CUSTOS</span>
          <div className="driver-field-grid">
            <label><span>Valor por km</span><input inputMode="decimal" value={inputs.kmRate} onChange={(e) => set("kmRate", e.target.value)} /></label>
            <label><span>Valor por hora</span><input inputMode="decimal" value={inputs.hourlyRate} onChange={(e) => set("hourlyRate", e.target.value)} /></label>
            <label><span>Hora de espera</span><input inputMode="decimal" value={inputs.waitingRate} onChange={(e) => set("waitingRate", e.target.value)} /></label>
            <label><span>Valor mínimo</span><input inputMode="decimal" value={inputs.minimumFare} onChange={(e) => set("minimumFare", e.target.value)} /></label>
            <label><span>Pedágios</span><input inputMode="decimal" value={inputs.tolls} onChange={(e) => set("tolls", e.target.value)} placeholder="0" /></label>
            <label><span>Estacionamento</span><input inputMode="decimal" value={inputs.parking} onChange={(e) => set("parking", e.target.value)} placeholder="0" /></label>
            <label><span>Outros custos</span><input inputMode="decimal" value={inputs.otherCosts} onChange={(e) => set("otherCosts", e.target.value)} placeholder="0" /></label>
            <label><span>Desconto</span><input inputMode="decimal" value={inputs.discount} onChange={(e) => set("discount", e.target.value)} placeholder="0" /></label>
            <label><span>Reserva manutenção (%)</span><input inputMode="decimal" value={inputs.reservePercent} onChange={(e) => set("reservePercent", e.target.value)} /></label>
            <label><span>Arredondamento</span><input inputMode="decimal" value={inputs.roundingStep} onChange={(e) => set("roundingStep", e.target.value)} /></label>
          </div>
          <label className="driver-notes-field"><span>Observações para o passageiro</span><textarea rows={3} maxLength={500} value={inputs.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Ex.: pedágios incluídos, até 2 horas de espera, sinal para reserva..." /></label>
        </div>
      </section>

      <aside className="driver-result-card">
        <span className="eyebrow">VALOR SUGERIDO</span>
        <strong className="driver-result-card__total">{formatCurrency(result.roundedTotal)}</strong>
        <p>Referência calculada com seus valores por quilômetro, hora, espera, custos diretos e reserva.</p>
        <dl>
          <div><dt>Distância cobrada</dt><dd>{result.totalDistance.toFixed(1).replace(".", ",")} km</dd></div>
          <div><dt>Quilometragem</dt><dd>{formatCurrency(result.distanceCharge)}</dd></div>
          <div><dt>Tempo em viagem</dt><dd>{formatCurrency(result.timeCharge)}</dd></div>
          <div><dt>Tempo de espera</dt><dd>{formatCurrency(result.waitingCharge)}</dd></div>
          <div><dt>Reserva manutenção</dt><dd>{formatCurrency(result.reserve)}</dd></div>
          <div><dt>Pedágios e extras</dt><dd>{formatCurrency(result.directCosts)}</dd></div>
          {result.discount > 0 ? <div><dt>Desconto</dt><dd>- {formatCurrency(result.discount)}</dd></div> : null}
          <div className="driver-result-card__suggested"><dt>Antes de arredondar</dt><dd>{formatCurrency(result.suggestedTotal)}</dd></div>
        </dl>

        <div className="driver-result-actions">
          <button className="button button--primary" type="button" onClick={share}><Share2 size={18} /> Compartilhar</button>
          <button className="button button--secondary" type="button" onClick={copy}><Clipboard size={18} /> Copiar</button>
          {userId ? (
            <button className="button button--secondary" type="button" onClick={saveQuote} disabled={!canSave || saving || saved}>
              {saving ? <LoaderCircle className="auth-spinner" size={18} /> : saved ? <Check size={18} /> : <Save size={18} />}
              {saved ? "Salvo" : saving ? "Salvando..." : "Salvar orçamento"}
            </button>
          ) : (
            <Link className="button button--secondary" href="/entrar?next=/motorista/calculadora"><Send size={18} /> Entrar para salvar</Link>
          )}
          {savedQuoteId ? <Link className="button button--primary" href={`/motorista/orcamentos/${savedQuoteId}`}>Abrir e gerar PDF</Link> : null}
        </div>
        {message ? <p className="driver-form-message">{message}</p> : null}
        <small>O cálculo é uma estimativa. O motorista continua responsável por definir o preço final e cumprir regras legais, fiscais, securitárias e da atividade profissional.</small>
      </aside>
    </div>
  );
}
