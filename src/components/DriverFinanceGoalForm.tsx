"use client";

import { useState } from "react";
import { LoaderCircle, Save, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { asNumber, formatCurrency } from "@/lib/driver";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  monthKey: string;
  grossGoal: number;
  netGoal: number;
  currentGross: number;
  currentNet: number;
};

function inputValue(value: number) {
  return value > 0 ? String(value).replace(".", ",") : "";
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

function progress(value: number, goal: number) {
  if (goal <= 0) return 0;
  return Math.min(100, Math.max(0, value / goal * 100));
}

export function DriverFinanceGoalForm({
  userId,
  monthKey,
  grossGoal,
  netGoal,
  currentGross,
  currentNet,
}: Props) {
  const router = useRouter();
  const [gross, setGross] = useState(inputValue(grossGoal));
  const [net, setNet] = useState(inputValue(netGoal));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const grossProgress = progress(currentGross, grossGoal);
  const netProgress = progress(currentNet, netGoal);

  async function save() {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const payload = {
      user_id: userId,
      month_start: `${monthKey}-01`,
      gross_goal: Math.max(0, asNumber(gross)),
      net_goal: Math.max(0, asNumber(net)),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("driver_finance_goals").upsert(payload, {
      onConflict: "user_id,month_start",
    });
    if (error) setMessage(error.message);
    else {
      setMessage("Metas mensais atualizadas.");
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <section className="driver-finance-goal-card">
      <header>
        <div className="driver-finance-goal-card__icon"><Target size={21} /></div>
        <div>
          <span className="eyebrow">METAS MENSAIS</span>
          <h2>{monthLabel(monthKey)}</h2>
        </div>
      </header>

      <div className="driver-finance-goal-progress">
        <div>
          <span>Faturamento</span>
          <strong>{formatCurrency(currentGross)} <small>de {grossGoal > 0 ? formatCurrency(grossGoal) : "meta nao definida"}</small></strong>
          <i aria-label={`${grossProgress.toFixed(0)}% da meta de faturamento`}><b style={{ width: `${grossProgress}%` }} /></i>
        </div>
        <div>
          <span>Resultado liquido</span>
          <strong>{formatCurrency(currentNet)} <small>de {netGoal > 0 ? formatCurrency(netGoal) : "meta nao definida"}</small></strong>
          <i aria-label={`${netProgress.toFixed(0)}% da meta de resultado`}><b style={{ width: `${netProgress}%` }} /></i>
        </div>
      </div>

      <div className="driver-finance-goal-fields">
        <label><span>Meta de faturamento</span><input inputMode="decimal" value={gross} onChange={(event) => setGross(event.target.value)} placeholder="0" /></label>
        <label><span>Meta de resultado liquido</span><input inputMode="decimal" value={net} onChange={(event) => setNet(event.target.value)} placeholder="0" /></label>
      </div>

      {message ? <p className="driver-form-message">{message}</p> : null}
      <button className="button button--secondary" type="button" disabled={saving} onClick={save}>
        {saving ? <LoaderCircle className="auth-spinner" size={17} /> : <Save size={17} />}
        {saving ? "Salvando..." : "Salvar metas"}
      </button>
    </section>
  );
}
