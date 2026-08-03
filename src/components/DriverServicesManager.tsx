"use client";

import { useState } from "react";
import { Edit3, LoaderCircle, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DRIVER_PRICING_LABELS,
  formatDriverPackagePrice,
  type DriverPricingType,
  type DriverServicePackage,
} from "@/lib/driver-public";

const emptyForm = {
  id: "",
  title: "",
  description: "",
  pricingType: "consult" as DriverPricingType,
  price: "",
  routeSummary: "",
  durationLabel: "",
  includes: "",
  active: true,
};

type FormState = typeof emptyForm;

type Props = {
  userId: string;
  initialItems: DriverServicePackage[];
};

export function DriverServicesManager({ userId, initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [open, setOpen] = useState(initialItems.length === 0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startCreate() {
    setForm(emptyForm);
    setMessage(null);
    setOpen(true);
  }

  function startEdit(item: DriverServicePackage) {
    setForm({
      id: item.id,
      title: item.title,
      description: item.description ?? "",
      pricingType: item.pricing_type,
      price: item.price === null ? "" : String(item.price).replace(".", ","),
      routeSummary: item.route_summary ?? "",
      durationLabel: item.duration_label ?? "",
      includes: item.includes ?? "",
      active: item.is_active,
    });
    setMessage(null);
    setOpen(true);
  }

  async function save() {
    const title = form.title.trim();
    if (title.length < 2) {
      setMessage({ type: "error", text: "Dê um nome curto para a rota ou serviço." });
      return;
    }
    const price = form.pricingType === "consult" ? null : Number(form.price.replace(",", "."));
    if (form.pricingType !== "consult" && (!Number.isFinite(price) || Number(price) < 0)) {
      setMessage({ type: "error", text: "Informe um preço válido." });
      return;
    }

    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const payload = {
      user_id: userId,
      title,
      description: form.description.trim() || null,
      pricing_type: form.pricingType,
      price,
      route_summary: form.routeSummary.trim() || null,
      duration_label: form.durationLabel.trim() || null,
      includes: form.includes.trim() || null,
      is_active: form.active,
      sort_order: form.id ? items.find((item) => item.id === form.id)?.sort_order ?? items.length : items.length,
      updated_at: new Date().toISOString(),
    };

    const query = form.id
      ? supabase.from("driver_service_packages").update(payload).eq("id", form.id).eq("user_id", userId).select("*").single()
      : supabase.from("driver_service_packages").insert(payload).select("*").single();
    const { data, error } = await query;

    if (error || !data) {
      setMessage({ type: "error", text: error?.message ?? "Não foi possível salvar a rota ou serviço." });
    } else {
      const saved = data as DriverServicePackage;
      setItems((current) => form.id ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setForm(emptyForm);
      setOpen(false);
      setMessage({ type: "success", text: "Rota ou serviço salvo." });
      router.refresh();
    }
    setSaving(false);
  }

  async function remove(item: DriverServicePackage) {
    if (!window.confirm(`Remover “${item.title}”?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("driver_service_packages").delete().eq("id", item.id).eq("user_id", userId);
    if (error) setMessage({ type: "error", text: error.message });
    else {
      setItems((current) => current.filter((value) => value.id !== item.id));
      setMessage({ type: "success", text: "Rota ou serviço removido." });
      router.refresh();
    }
  }

  return (
    <div className="driver-services-manager">
      <div className="driver-services-manager__heading">
        <div><span className="eyebrow">ROTAS E SERVIÇOS FREQUENTES</span><h2>O que o passageiro pode solicitar</h2><p>Cadastre trajetos comuns, aeroporto, eventos ou outros serviços. O preço pode ser fixo, “a partir de”, por hora ou sob consulta.</p></div>
        {!open ? <button className="button button--primary" type="button" onClick={startCreate}><Plus size={18} /> Nova rota ou serviço</button> : null}
      </div>

      {open ? (
        <section className="driver-service-editor">
          <div className="driver-service-editor__header"><strong>{form.id ? "Editar rota ou serviço" : "Nova rota ou serviço"}</strong><button className="icon-button" type="button" onClick={() => { setOpen(false); setForm(emptyForm); }} aria-label="Fechar"><X size={18} /></button></div>
          <div className="driver-field-grid">
            <label className="driver-field-grid__full"><span>Nome curto</span><input maxLength={80} value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Ex.: Porto Alegre → Gramado" /></label>
            <label className="driver-field-grid__full"><span>Rota ou região</span><input maxLength={140} value={form.routeSummary} onChange={(event) => update("routeSummary", event.target.value)} placeholder="Ex.: Porto Alegre → Gramado" /></label>
            <label><span>Como mostrar o preço</span><select value={form.pricingType} onChange={(event) => update("pricingType", event.target.value as DriverPricingType)}>{Object.entries(DRIVER_PRICING_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            {form.pricingType !== "consult" ? <label><span>Preço</span><input inputMode="decimal" value={form.price} onChange={(event) => update("price", event.target.value)} placeholder="0,00" /></label> : <div aria-hidden="true" />}
          </div>
          <details
            key={form.id || "new-route"}
            className="driver-service-editor__optional"
            defaultOpen={Boolean(form.description || form.durationLabel || form.includes)}
          >
            <summary>Adicionar descrição e detalhes (opcional)</summary>
            <div className="driver-field-grid">
              <label className="driver-field-grid__full"><span>Descrição</span><textarea rows={3} maxLength={320} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Explique em uma frase quando esta opção é indicada." /></label>
              <label><span>Duração ou antecedência</span><input maxLength={80} value={form.durationLabel} onChange={(event) => update("durationLabel", event.target.value)} placeholder="Ex.: Até 4 horas" /></label>
              <label><span>O que está incluído</span><input maxLength={240} value={form.includes} onChange={(event) => update("includes", event.target.value)} placeholder="Ex.: espera de 30 min e pedágio" /></label>
            </div>
          </details>
          <label className="driver-inline-toggle"><div><strong>Mostrar no cartão</strong><small>Desative temporariamente sem apagar.</small></div><input type="checkbox" checked={form.active} onChange={(event) => update("active", event.target.checked)} /></label>
          <div className="driver-service-editor__actions"><button className="button button--secondary" type="button" onClick={() => { setOpen(false); setForm(emptyForm); }}>Cancelar</button><button className="button button--primary" type="button" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="auth-spinner" size={18} /> : <Save size={18} />}{saving ? "Salvando..." : "Salvar rota ou serviço"}</button></div>
        </section>
      ) : null}

      {message ? <p className={`auth-message auth-message--${message.type}`}>{message.text}</p> : null}

      {items.length ? (
        <div className="driver-service-list">
          {items.map((item) => (
            <article key={item.id} className={!item.is_active ? "is-inactive" : ""}>
              <div className="driver-service-list__main"><span className="driver-service-list__status">{item.is_active ? "Visível" : "Oculto"}</span><h3>{item.title}</h3><p>{item.description || "Sem descrição."}</p><div>{item.route_summary ? <span>{item.route_summary}</span> : null}{item.duration_label ? <span>{item.duration_label}</span> : null}</div></div>
              <div className="driver-service-list__price"><strong>{formatDriverPackagePrice(item)}</strong>{item.includes ? <small>{item.includes}</small> : null}</div>
              <div className="driver-service-list__actions"><button className="icon-button" type="button" onClick={() => startEdit(item)} aria-label={`Editar ${item.title}`}><Edit3 size={18} /></button><button className="icon-button" type="button" onClick={() => void remove(item)} aria-label={`Remover ${item.title}`}><Trash2 size={18} /></button></div>
            </article>
          ))}
        </div>
      ) : !open ? <div className="driver-empty-card"><Plus size={28} /><strong>Cadastre sua primeira rota ou serviço</strong><p>Comece com um trajeto frequente, aeroporto, diária, evento ou viagem sob consulta.</p><button className="button button--primary" type="button" onClick={startCreate}>Criar rota ou serviço</button></div> : null}
    </div>
  );
}
