"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Calculator, FileCheck2, Save, Send, UserRound } from "lucide-react";
import { saveProfessionalQuoteAction } from "@/app/motorista/orcamentos/actions";
import { asNumber, formatCurrency, TRIP_TYPE_LABELS, type DriverSettings, type DriverTripType } from "@/lib/driver";

type CustomerOption = { id: string; name: string; phone: string };

type QuoteFormInitial = {
  customerId?: string;
  reservationId?: string;
  customerName?: string;
  customerPhone?: string;
  origin?: string;
  destination?: string;
  travelDate?: string;
  travelTime?: string;
  tripType?: DriverTripType;
  distancePerLegKm?: number;
  durationPerLegMinutes?: number;
  waitingMinutes?: number;
  tolls?: number;
  parking?: number;
  nightSurcharge?: number;
  extraStops?: number;
  returnService?: number;
  luggageService?: number;
  otherCosts?: number;
  otherCostsLabel?: string;
  discount?: number;
  kmRate?: number;
  hourlyRate?: number;
  waitingRate?: number;
  minimumFare?: number;
  reservePercent?: number;
  roundingStep?: number;
  validDays?: number;
  notes?: string;
  conditions?: string;
};

type Props = {
  settings: DriverSettings;
  customers: CustomerOption[];
  initial?: QuoteFormInitial;
  quoteId?: string | null;
};

type FormState = {
  customerId: string;
  customerName: string;
  customerPhone: string;
  origin: string;
  destination: string;
  travelDate: string;
  travelTime: string;
  tripType: DriverTripType;
  distancePerLegKm: string;
  durationHours: string;
  durationMinutes: string;
  waitingMinutes: string;
  tolls: string;
  parking: string;
  nightSurcharge: string;
  extraStops: string;
  returnService: string;
  luggageService: string;
  otherCosts: string;
  otherCostsLabel: string;
  discount: string;
  kmRate: string;
  hourlyRate: string;
  waitingRate: string;
  minimumFare: string;
  reservePercent: string;
  roundingStep: string;
  validDays: string;
  notes: string;
  conditions: string;
};

function fieldValue(value: number | undefined, fallback = 0) {
  return String(value ?? fallback).replace(".", ",");
}

export function DriverProfessionalQuoteForm({ settings, customers, initial, quoteId }: Props) {
  const initialDuration = Math.max(0, Number(initial?.durationPerLegMinutes || 0));
  const [state, setState] = useState<FormState>({
    customerId: initial?.customerId || "",
    customerName: initial?.customerName || "",
    customerPhone: initial?.customerPhone || "",
    origin: initial?.origin || "",
    destination: initial?.destination || "",
    travelDate: initial?.travelDate || "",
    travelTime: initial?.travelTime?.slice(0, 5) || "",
    tripType: initial?.tripType || "outbound",
    distancePerLegKm: fieldValue(initial?.distancePerLegKm),
    durationHours: String(Math.floor(initialDuration / 60)),
    durationMinutes: String(initialDuration % 60),
    waitingMinutes: fieldValue(initial?.waitingMinutes),
    tolls: fieldValue(initial?.tolls),
    parking: fieldValue(initial?.parking),
    nightSurcharge: fieldValue(initial?.nightSurcharge),
    extraStops: fieldValue(initial?.extraStops),
    returnService: fieldValue(initial?.returnService),
    luggageService: fieldValue(initial?.luggageService),
    otherCosts: fieldValue(initial?.otherCosts),
    otherCostsLabel: initial?.otherCostsLabel || "Outros custos",
    discount: fieldValue(initial?.discount),
    kmRate: fieldValue(initial?.kmRate, settings.km_rate),
    hourlyRate: fieldValue(initial?.hourlyRate, settings.hourly_rate),
    waitingRate: fieldValue(initial?.waitingRate, settings.waiting_hour_rate),
    minimumFare: fieldValue(initial?.minimumFare, settings.minimum_fare),
    reservePercent: fieldValue(initial?.reservePercent, settings.maintenance_reserve_percent),
    roundingStep: fieldValue(initial?.roundingStep, settings.rounding_step),
    validDays: String(initial?.validDays || 7),
    notes: initial?.notes || "",
    conditions: initial?.conditions || "O valor considera a rota e as condições descritas. Alterações de itinerário, tempo de espera ou despesas não previstas poderão exigir revisão do orçamento.",
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function selectCustomer(customerId: string) {
    const customer = customers.find((item) => item.id === customerId);
    setState((current) => ({
      ...current,
      customerId,
      customerName: customer?.name || current.customerName,
      customerPhone: customer?.phone || current.customerPhone,
    }));
  }

  const result = useMemo(() => {
    const multiplier = state.tripType === "round_trip" ? 2 : 1;
    const distance = Math.max(0, asNumber(state.distancePerLegKm)) * multiplier;
    const travelMinutes = Math.max(0, asNumber(state.durationHours) * 60 + asNumber(state.durationMinutes)) * multiplier;
    const waitingMinutes = Math.max(0, asNumber(state.waitingMinutes));
    const distanceCharge = distance * Math.max(0, asNumber(state.kmRate));
    const timeCharge = travelMinutes / 60 * Math.max(0, asNumber(state.hourlyRate));
    const waitingCharge = waitingMinutes / 60 * Math.max(0, asNumber(state.waitingRate));
    const serviceSubtotal = distanceCharge + timeCharge + waitingCharge;
    const maintenance = serviceSubtotal * Math.min(100, Math.max(0, asNumber(state.reservePercent))) / 100;
    const additions = [state.tolls, state.parking, state.nightSurcharge, state.extraStops, state.returnService, state.luggageService, state.otherCosts]
      .reduce((total, value) => total + Math.max(0, asNumber(value)), 0);
    const discount = Math.max(0, asNumber(state.discount));
    const minimum = Math.max(0, asNumber(state.minimumFare));
    const rounding = Math.max(0, asNumber(state.roundingStep));
    const suggested = Math.max(minimum, serviceSubtotal + maintenance + additions - discount);
    const total = rounding > 0 ? Math.ceil(suggested / rounding) * rounding : suggested;
    return { distance, travelMinutes, waitingMinutes, distanceCharge, timeCharge, waitingCharge, maintenance, additions, discount, suggested, total };
  }, [state]);

  return (
    <form action={saveProfessionalQuoteAction} className="driver-professional-quote-layout">
      <input type="hidden" name="quoteId" value={quoteId || ""} />
      <input type="hidden" name="reservationId" value={initial?.reservationId || ""} />

      <div className="driver-professional-quote-form">
        <section className="driver-professional-section">
          <div className="driver-professional-section__heading"><UserRound size={21} /><div><span className="eyebrow">PASSAGEIRO</span><h2>Quem receberá a proposta?</h2></div></div>
          {customers.length ? (
            <label className="driver-wide-field"><span>Selecionar cliente do CRM</span><select name="customerId" value={state.customerId} onChange={(event) => selectCustomer(event.target.value)}><option value="">Preencher manualmente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}</select></label>
          ) : <input type="hidden" name="customerId" value="" />}
          <div className="driver-field-grid">
            <label><span>Nome do passageiro</span><input name="customerName" required minLength={2} maxLength={80} value={state.customerName} onChange={(event) => set("customerName", event.target.value)} /></label>
            <label><span>WhatsApp</span><input name="customerPhone" required inputMode="tel" value={state.customerPhone} onChange={(event) => set("customerPhone", event.target.value)} placeholder="51999999999" /></label>
          </div>
        </section>

        <section className="driver-professional-section">
          <div className="driver-professional-section__heading"><CalendarClock size={21} /><div><span className="eyebrow">SERVIÇO</span><h2>Rota, data e duração</h2></div></div>
          <div className="driver-field-grid driver-field-grid--wide">
            <label><span>Origem</span><input name="origin" maxLength={180} value={state.origin} onChange={(event) => set("origin", event.target.value)} /></label>
            <label><span>Destino</span><input name="destination" maxLength={180} value={state.destination} onChange={(event) => set("destination", event.target.value)} /></label>
            <label><span>Data da viagem</span><input name="travelDate" type="date" value={state.travelDate} onChange={(event) => set("travelDate", event.target.value)} /></label>
            <label><span>Horário</span><input name="travelTime" type="time" value={state.travelTime} onChange={(event) => set("travelTime", event.target.value)} /></label>
          </div>
          <div className="driver-trip-type" role="radiogroup" aria-label="Tipo de viagem">
            {(Object.keys(TRIP_TYPE_LABELS) as DriverTripType[]).map((type) => <label key={type} className={state.tripType === type ? "is-active" : ""}><input type="radio" name="tripType" value={type} checked={state.tripType === type} onChange={() => set("tripType", type)} />{TRIP_TYPE_LABELS[type]}</label>)}
          </div>
          <div className="driver-field-grid">
            <label><span>Distância do trecho (km)</span><input name="distancePerLegKm" inputMode="decimal" value={state.distancePerLegKm} onChange={(event) => set("distancePerLegKm", event.target.value)} /></label>
            <label><span>Horas do trecho</span><input name="durationHours" inputMode="numeric" value={state.durationHours} onChange={(event) => set("durationHours", event.target.value)} /></label>
            <label><span>Minutos adicionais</span><input name="durationMinutes" inputMode="numeric" value={state.durationMinutes} onChange={(event) => set("durationMinutes", event.target.value)} /></label>
            <label><span>Espera prevista (min)</span><input name="waitingMinutes" inputMode="numeric" value={state.waitingMinutes} onChange={(event) => set("waitingMinutes", event.target.value)} /></label>
          </div>
        </section>

        <section className="driver-professional-section">
          <div className="driver-professional-section__heading"><Calculator size={21} /><div><span className="eyebrow">COMPOSIÇÃO</span><h2>Valores e adicionais</h2></div></div>
          <div className="driver-field-grid">
            <label><span>Valor por km</span><input name="kmRate" inputMode="decimal" value={state.kmRate} onChange={(event) => set("kmRate", event.target.value)} /></label>
            <label><span>Valor por hora</span><input name="hourlyRate" inputMode="decimal" value={state.hourlyRate} onChange={(event) => set("hourlyRate", event.target.value)} /></label>
            <label><span>Hora de espera</span><input name="waitingRate" inputMode="decimal" value={state.waitingRate} onChange={(event) => set("waitingRate", event.target.value)} /></label>
            <label><span>Valor mínimo</span><input name="minimumFare" inputMode="decimal" value={state.minimumFare} onChange={(event) => set("minimumFare", event.target.value)} /></label>
            <label><span>Pedágios</span><input name="tolls" inputMode="decimal" value={state.tolls} onChange={(event) => set("tolls", event.target.value)} /></label>
            <label><span>Estacionamento</span><input name="parking" inputMode="decimal" value={state.parking} onChange={(event) => set("parking", event.target.value)} /></label>
            <label><span>Adicional noturno</span><input name="nightSurcharge" inputMode="decimal" value={state.nightSurcharge} onChange={(event) => set("nightSurcharge", event.target.value)} /></label>
            <label><span>Paradas adicionais</span><input name="extraStops" inputMode="decimal" value={state.extraStops} onChange={(event) => set("extraStops", event.target.value)} /></label>
            <label><span>Retorno/disponibilidade</span><input name="returnService" inputMode="decimal" value={state.returnService} onChange={(event) => set("returnService", event.target.value)} /></label>
            <label><span>Bagagem/serviço especial</span><input name="luggageService" inputMode="decimal" value={state.luggageService} onChange={(event) => set("luggageService", event.target.value)} /></label>
            <label><span>Descrição de outro custo</span><input name="otherCostsLabel" maxLength={100} value={state.otherCostsLabel} onChange={(event) => set("otherCostsLabel", event.target.value)} /></label>
            <label><span>Outro custo</span><input name="otherCosts" inputMode="decimal" value={state.otherCosts} onChange={(event) => set("otherCosts", event.target.value)} /></label>
            <label><span>Desconto</span><input name="discount" inputMode="decimal" value={state.discount} onChange={(event) => set("discount", event.target.value)} /></label>
            <label><span>Reserva operacional (%)</span><input name="reservePercent" inputMode="decimal" value={state.reservePercent} onChange={(event) => set("reservePercent", event.target.value)} /></label>
            <label><span>Arredondamento</span><input name="roundingStep" inputMode="decimal" value={state.roundingStep} onChange={(event) => set("roundingStep", event.target.value)} /></label>
            <label><span>Validade (dias)</span><input name="validDays" type="number" min={1} max={90} value={state.validDays} onChange={(event) => set("validDays", event.target.value)} /></label>
          </div>
          <label className="driver-notes-field"><span>Observações da viagem</span><textarea name="notes" rows={3} maxLength={700} value={state.notes} onChange={(event) => set("notes", event.target.value)} /></label>
          <label className="driver-notes-field"><span>Condições da proposta</span><textarea name="conditions" rows={5} maxLength={2500} value={state.conditions} onChange={(event) => set("conditions", event.target.value)} /></label>
        </section>
      </div>

      <aside className="driver-professional-quote-summary">
        <span className="eyebrow">PROPOSTA CALCULADA</span>
        <strong>{formatCurrency(result.total)}</strong>
        <p>O passageiro verá a composição, a validade e poderá aceitar ou recusar pelo celular.</p>
        <dl>
          <div><dt>Distância</dt><dd>{result.distance.toFixed(1).replace(".", ",")} km</dd></div>
          <div><dt>Quilometragem</dt><dd>{formatCurrency(result.distanceCharge)}</dd></div>
          <div><dt>Tempo em viagem</dt><dd>{formatCurrency(result.timeCharge)}</dd></div>
          <div><dt>Espera</dt><dd>{formatCurrency(result.waitingCharge)}</dd></div>
          <div><dt>Reserva operacional</dt><dd>{formatCurrency(result.maintenance)}</dd></div>
          <div><dt>Adicionais</dt><dd>{formatCurrency(result.additions)}</dd></div>
          {result.discount > 0 ? <div><dt>Desconto</dt><dd>− {formatCurrency(result.discount)}</dd></div> : null}
        </dl>
        <div className="driver-professional-quote-actions">
          <button className="button button--secondary" type="submit" name="submitMode" value="draft"><Save size={18} /> Salvar rascunho</button>
          <button className="button button--primary" type="submit" name="submitMode" value="send"><Send size={18} /> Salvar e preparar envio</button>
        </div>
        <small><FileCheck2 size={15} /> O aceite registra data, situação e histórico. Pagamentos continuam fora desta etapa.</small>
      </aside>
    </form>
  );
}
