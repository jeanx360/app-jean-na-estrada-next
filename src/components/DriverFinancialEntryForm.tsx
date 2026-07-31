"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { revalidateDriverData } from "@/lib/driver-client";
import {
  asNumber,
  DRIVER_FINANCIAL_CATEGORY_LABELS,
  DRIVER_PAYMENT_METHOD_LABELS,
  type DriverEntryType,
  type DriverFinancialCategory,
  type DriverPaymentMethod,
} from "@/lib/driver";

const INCOME_CATEGORIES: DriverFinancialCategory[] = ["payment", "deposit", "tip", "other_income"];
const EXPENSE_CATEGORIES: DriverFinancialCategory[] = ["toll", "fuel_or_charge", "parking", "food", "lodging", "washing", "maintenance", "commission", "other_expense"];

export function DriverFinancialEntryForm({ tripId, userId }: { tripId: string; userId: string }) {
  const router = useRouter();
  const [entryType, setEntryType] = useState<DriverEntryType>("expense");
  const categories = useMemo(() => entryType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES, [entryType]);
  const [category, setCategory] = useState<DriverFinancialCategory>("toll");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<DriverPaymentMethod>("pix");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function changeType(type: DriverEntryType) {
    setEntryType(type);
    setCategory(type === "income" ? "payment" : "toll");
  }

  async function save() {
    const numericAmount = Math.max(0, asNumber(amount));
    if (numericAmount <= 0) {
      setMessage("Informe um valor maior que zero.");
      return;
    }
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.from("driver_financial_entries").insert({
      trip_id: tripId,
      user_id: userId,
      entry_type: entryType,
      category,
      amount: numericAmount,
      payment_method: entryType === "income" ? paymentMethod : null,
      occurred_at: `${date}T12:00:00`,
      description: description.trim() || null,
    });
    if (error) setMessage(error.message);
    else {
      setAmount("");
      setDescription("");
      await revalidateDriverData(tripId);
      setMessage(entryType === "income" ? "Receita adicionada e resumo atualizado." : "Despesa adicionada e resumo atualizado.");
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <section className="driver-entry-form">
      <div className="driver-entry-form__tabs" role="tablist" aria-label="Tipo do lançamento">
        <button type="button" className={entryType === "expense" ? "is-active" : ""} onClick={() => changeType("expense")}>Despesa</button>
        <button type="button" className={entryType === "income" ? "is-active" : ""} onClick={() => changeType("income")}>Receita</button>
      </div>
      <div className="driver-field-grid">
        <label><span>Categoria</span><select value={category} onChange={(e) => setCategory(e.target.value as DriverFinancialCategory)}>{categories.map((item) => <option key={item} value={item}>{DRIVER_FINANCIAL_CATEGORY_LABELS[item]}</option>)}</select></label>
        <label><span>Valor</span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></label>
        <label><span>Data</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        {entryType === "income" ? <label><span>Forma de pagamento</span><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as DriverPaymentMethod)}>{(Object.keys(DRIVER_PAYMENT_METHOD_LABELS) as DriverPaymentMethod[]).map((method) => <option key={method} value={method}>{DRIVER_PAYMENT_METHOD_LABELS[method]}</option>)}</select></label> : null}
      </div>
      <label className="driver-notes-field"><span>Descrição (opcional)</span><input value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: pedágio da ida, saldo final, recarga..." /></label>
      {message ? <p className="driver-form-message">{message}</p> : null}
      <button className="button button--primary" type="button" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="auth-spinner" size={18} /> : <Plus size={18} />}{saving ? "Salvando..." : "Adicionar lançamento"}</button>
    </section>
  );
}
