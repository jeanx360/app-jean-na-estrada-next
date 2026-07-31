"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save, WalletCards } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { revalidateDriverData } from "@/lib/driver-client";
import {
  asNumber,
  DRIVER_PAYMENT_METHOD_LABELS,
  type DriverPaymentMethod,
  type DriverQuote,
  type DriverTripStatus,
} from "@/lib/driver";

type Props = {
  userId: string;
  quote?: DriverQuote | null;
};

type FormState = {
  customerName: string;
  origin: string;
  destination: string;
  travelDate: string;
  distanceKm: string;
  workedHours: string;
  workedMinutes: string;
  agreedAmount: string;
  receivedAmount: string;
  paymentMethod: DriverPaymentMethod;
  status: DriverTripStatus;
  tolls: string;
  fuelOrCharge: string;
  parking: string;
  food: string;
  lodging: string;
  otherExpenses: string;
  notes: string;
};

function decimal(value: number | null | undefined) {
  if (!value) return "";
  return String(value).replace(".", ",");
}

export function DriverTripForm({ userId, quote }: Props) {
  const router = useRouter();
  const quoteMinutes = quote ? Math.round(Number(quote.billable_hours || 0) * 60) : 0;
  const [form, setForm] = useState<FormState>({
    customerName: quote?.customer_name ?? "",
    origin: quote?.origin ?? "",
    destination: quote?.destination ?? "",
    travelDate: quote?.travel_date ?? new Date().toISOString().slice(0, 10),
    distanceKm: decimal(quote?.total_distance_km),
    workedHours: quoteMinutes ? String(Math.floor(quoteMinutes / 60)) : "",
    workedMinutes: quoteMinutes % 60 ? String(quoteMinutes % 60) : "",
    agreedAmount: decimal(quote?.rounded_total),
    receivedAmount: "",
    paymentMethod: "pix",
    status: "planned",
    tolls: decimal(quote?.tolls),
    fuelOrCharge: "",
    parking: decimal(quote?.parking),
    food: "",
    lodging: "",
    otherExpenses: decimal(quote?.other_costs),
    notes: quote?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    const agreedAmount = Math.max(0, asNumber(form.agreedAmount));
    const distanceKm = Math.max(0, asNumber(form.distanceKm));
    const workedMinutes = Math.max(0, Math.round(asNumber(form.workedHours) * 60 + asNumber(form.workedMinutes)));
    if (agreedAmount <= 0 && distanceKm <= 0 && workedMinutes <= 0) {
      setMessage("Informe ao menos o valor combinado, a distância ou o tempo trabalhado.");
      return;
    }

    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { data: trip, error: tripError } = await supabase
      .from("driver_trips")
      .insert({
        user_id: userId,
        quote_id: quote?.id ?? null,
        customer_name: form.customerName.trim() || null,
        origin: form.origin.trim() || null,
        destination: form.destination.trim() || null,
        travel_date: form.travelDate || null,
        distance_km: distanceKm,
        worked_minutes: workedMinutes,
        agreed_amount: agreedAmount,
        pending_amount: agreedAmount,
        status: form.status,
        notes: form.notes.trim() || null,
      })
      .select("id")
      .single();

    if (tripError || !trip) {
      setMessage(tripError?.message ?? "Não foi possível criar a viagem.");
      setSaving(false);
      return;
    }

    const now = form.travelDate ? `${form.travelDate}T12:00:00` : new Date().toISOString();
    const entries = [
      { entry_type: "income", category: "payment", amount: asNumber(form.receivedAmount), payment_method: form.paymentMethod, description: "Valor recebido ao registrar a viagem" },
      { entry_type: "expense", category: "toll", amount: asNumber(form.tolls), payment_method: null, description: "Pedágios" },
      { entry_type: "expense", category: "fuel_or_charge", amount: asNumber(form.fuelOrCharge), payment_method: null, description: "Combustível ou recarga" },
      { entry_type: "expense", category: "parking", amount: asNumber(form.parking), payment_method: null, description: "Estacionamento" },
      { entry_type: "expense", category: "food", amount: asNumber(form.food), payment_method: null, description: "Alimentação" },
      { entry_type: "expense", category: "lodging", amount: asNumber(form.lodging), payment_method: null, description: "Hospedagem" },
      { entry_type: "expense", category: "other_expense", amount: asNumber(form.otherExpenses), payment_method: null, description: "Outras despesas" },
    ]
      .filter((entry) => entry.amount > 0)
      .map((entry) => ({ ...entry, trip_id: trip.id, user_id: userId, occurred_at: now }));

    if (entries.length) {
      const { error: entriesError } = await supabase.from("driver_financial_entries").insert(entries);
      if (entriesError) {
        await supabase.from("driver_trips").delete().eq("id", trip.id);
        setMessage(entriesError.message);
        setSaving(false);
        return;
      }
    }

    await revalidateDriverData(trip.id);
    router.push(`/motorista/financeiro/${trip.id}`);
    router.refresh();
  }

  return (
    <section className="driver-trip-form">
      {quote ? <div className="driver-finance-notice"><WalletCards size={19} /><span>Os dados do orçamento foram carregados. Ajuste os valores para refletir o que realmente aconteceu.</span></div> : null}

      <div className="driver-calculator-section">
        <span className="eyebrow">VIAGEM</span>
        <div className="driver-field-grid">
          <label><span>Cliente (opcional)</span><input value={form.customerName} onChange={(e) => update("customerName", e.target.value)} placeholder="Nome do passageiro" /></label>
          <label><span>Data</span><input type="date" value={form.travelDate} onChange={(e) => update("travelDate", e.target.value)} /></label>
          <label><span>Origem</span><input value={form.origin} onChange={(e) => update("origin", e.target.value)} placeholder="Porto Alegre" /></label>
          <label><span>Destino</span><input value={form.destination} onChange={(e) => update("destination", e.target.value)} placeholder="Gramado" /></label>
          <label><span>Distância total (km)</span><input inputMode="decimal" value={form.distanceKm} onChange={(e) => update("distanceKm", e.target.value)} placeholder="0" /></label>
          <label><span>Status da viagem</span><select value={form.status} onChange={(e) => update("status", e.target.value as DriverTripStatus)}><option value="planned">Planejada</option><option value="completed">Concluída</option><option value="cancelled">Cancelada</option></select></label>
          <label><span>Horas trabalhadas</span><input inputMode="numeric" value={form.workedHours} onChange={(e) => update("workedHours", e.target.value)} placeholder="0" /></label>
          <label><span>Minutos adicionais</span><input inputMode="numeric" value={form.workedMinutes} onChange={(e) => update("workedMinutes", e.target.value)} placeholder="0" /></label>
        </div>
      </div>

      <div className="driver-calculator-section">
        <span className="eyebrow">COBRANÇA</span>
        <div className="driver-field-grid">
          <label><span>Valor combinado</span><input inputMode="decimal" value={form.agreedAmount} onChange={(e) => update("agreedAmount", e.target.value)} placeholder="0" /></label>
          <label><span>Valor recebido agora</span><input inputMode="decimal" value={form.receivedAmount} onChange={(e) => update("receivedAmount", e.target.value)} placeholder="0" /></label>
          <label><span>Forma de pagamento</span><select value={form.paymentMethod} onChange={(e) => update("paymentMethod", e.target.value as DriverPaymentMethod)}>{(Object.keys(DRIVER_PAYMENT_METHOD_LABELS) as DriverPaymentMethod[]).map((method) => <option key={method} value={method}>{DRIVER_PAYMENT_METHOD_LABELS[method]}</option>)}</select></label>
        </div>
      </div>

      <div className="driver-calculator-section">
        <span className="eyebrow">DESPESAS INICIAIS</span>
        <p className="driver-help-text">Registre o que já sabe agora. Novas receitas e despesas podem ser adicionadas depois.</p>
        <div className="driver-field-grid driver-finance-expense-grid">
          <label><span>Pedágios</span><input inputMode="decimal" value={form.tolls} onChange={(e) => update("tolls", e.target.value)} placeholder="0" /></label>
          <label><span>Combustível ou recarga</span><input inputMode="decimal" value={form.fuelOrCharge} onChange={(e) => update("fuelOrCharge", e.target.value)} placeholder="0" /></label>
          <label><span>Estacionamento</span><input inputMode="decimal" value={form.parking} onChange={(e) => update("parking", e.target.value)} placeholder="0" /></label>
          <label><span>Alimentação</span><input inputMode="decimal" value={form.food} onChange={(e) => update("food", e.target.value)} placeholder="0" /></label>
          <label><span>Hospedagem</span><input inputMode="decimal" value={form.lodging} onChange={(e) => update("lodging", e.target.value)} placeholder="0" /></label>
          <label><span>Outras despesas</span><input inputMode="decimal" value={form.otherExpenses} onChange={(e) => update("otherExpenses", e.target.value)} placeholder="0" /></label>
        </div>
        <label className="driver-notes-field"><span>Observações privadas</span><textarea rows={4} maxLength={800} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Detalhes úteis para seu controle." /></label>
      </div>

      {message ? <p className="driver-form-message">{message}</p> : null}
      <button className="button button--primary" type="button" onClick={save} disabled={saving}>
        {saving ? <LoaderCircle className="auth-spinner" size={18} /> : <Save size={18} />}
        {saving ? "Salvando..." : "Salvar viagem"}
      </button>
    </section>
  );
}
