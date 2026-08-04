"use client";

import { useState } from "react";
import { Clock3, Edit3, LoaderCircle, MapPin, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { DriverRoutePlanner, type DriverRouteDraft } from "@/components/DriverRoutePlanner";
import { createClient } from "@/lib/supabase/client";
import {
  DRIVER_PRICING_LABELS,
  formatDriverPackagePrice,
  type DriverPricingType,
  type DriverServicePackage,
} from "@/lib/driver-public";
import { formatRouteDistance, formatRouteDuration } from "@/lib/map-links";

function emptyRoute(): DriverRouteDraft {
  return {
    origin: { label: "", placeId: null, latitude: null, longitude: null },
    destination: { label: "", placeId: null, latitude: null, longitude: null },
    distanceMeters: null,
    durationSeconds: null,
  };
}

const emptyForm = {
  id: "",
  title: "",
  description: "",
  pricingType: "consult" as DriverPricingType,
  price: "",
  durationLabel: "",
  includes: "",
  defaultWaitMinutes: "0",
  allowsReturn: true,
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
  const [route, setRoute] = useState<DriverRouteDraft>(emptyRoute);
  const [open, setOpen] = useState(initialItems.length === 0);
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetEditor() {
    setForm(emptyForm);
    setRoute(emptyRoute());
    setShowDetails(false);
  }

  function startCreate() {
    resetEditor();
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
      durationLabel: item.duration_label ?? "",
      includes: item.includes ?? "",
      defaultWaitMinutes: String(item.default_wait_minutes || 0),
      allowsReturn: item.allows_return !== false,
      active: item.is_active,
    });
    setRoute({
      origin: {
        label: item.origin_label || "",
        placeId: item.origin_place_id,
        latitude: item.origin_latitude,
        longitude: item.origin_longitude,
      },
      destination: {
        label: item.destination_label || "",
        placeId: item.destination_place_id,
        latitude: item.destination_latitude,
        longitude: item.destination_longitude,
      },
      distanceMeters: item.route_distance_meters,
      durationSeconds: item.route_duration_seconds,
    });
    setShowDetails(Boolean(item.description || item.duration_label || item.includes));
    setMessage(null);
    setOpen(true);
  }

  async function save() {
    const title = form.title.trim();
    if (title.length < 2) {
      setMessage({ type: "error", text: "Dê um nome curto para a rota." });
      return;
    }
    if (route.origin.label.trim().length < 3 || route.destination.label.trim().length < 3) {
      setMessage({ type: "error", text: "Informe a origem e o destino da rota frequente." });
      return;
    }
    const price = form.pricingType === "consult" ? null : Number(form.price.replace(",", "."));
    if (form.pricingType !== "consult" && (!Number.isFinite(price) || Number(price) < 0)) {
      setMessage({ type: "error", text: "Informe um preço válido." });
      return;
    }
    const defaultWaitMinutes = Math.max(0, Math.min(1440, Number(form.defaultWaitMinutes) || 0));

    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const routeSummary = `${route.origin.label.trim()} → ${route.destination.label.trim()}`.slice(0, 140);
    const payload = {
      user_id: userId,
      title,
      description: form.description.trim() || null,
      pricing_type: form.pricingType,
      price,
      route_summary: routeSummary,
      duration_label: form.durationLabel.trim() || null,
      includes: form.includes.trim() || null,
      origin_label: route.origin.label.trim(),
      origin_place_id: route.origin.placeId || null,
      origin_latitude: route.origin.latitude,
      origin_longitude: route.origin.longitude,
      destination_label: route.destination.label.trim(),
      destination_place_id: route.destination.placeId || null,
      destination_latitude: route.destination.latitude,
      destination_longitude: route.destination.longitude,
      route_distance_meters: route.distanceMeters,
      route_duration_seconds: route.durationSeconds,
      default_wait_minutes: defaultWaitMinutes,
      allows_return: form.allowsReturn,
      is_active: form.active,
      sort_order: form.id ? items.find((item) => item.id === form.id)?.sort_order ?? items.length : items.length,
      updated_at: new Date().toISOString(),
    };

    const query = form.id
      ? supabase.from("driver_service_packages").update(payload).eq("id", form.id).eq("user_id", userId).select("*").single()
      : supabase.from("driver_service_packages").insert(payload).select("*").single();
    const { data, error } = await query;

    if (error || !data) {
      setMessage({ type: "error", text: error?.message ?? "Não foi possível salvar a rota." });
    } else {
      const saved = data as DriverServicePackage;
      setItems((current) => form.id ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      resetEditor();
      setOpen(false);
      setMessage({ type: "success", text: "Rota adicionada ao seu catálogo." });
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
      setMessage({ type: "success", text: "Rota removida do catálogo." });
      router.refresh();
    }
  }

  return (
    <div className="driver-services-manager">
      <div className="driver-services-manager__heading">
        <div><span className="eyebrow">CATÁLOGO DE CORRIDAS</span><h2>Rotas prontas para o passageiro</h2><p>Cadastre trajetos frequentes com mapa, tempo, distância, espera e opção de retorno. O passageiro abre o pedido com a rota já preenchida.</p></div>
        {!open ? <button className="button button--primary" type="button" onClick={startCreate}><Plus size={18} /> Nova rota</button> : null}
      </div>

      {open ? (
        <section className="driver-service-editor">
          <div className="driver-service-editor__header"><strong>{form.id ? "Editar rota do catálogo" : "Nova rota do catálogo"}</strong><button className="icon-button" type="button" onClick={() => { setOpen(false); resetEditor(); }} aria-label="Fechar"><X size={18} /></button></div>
          <div className="driver-field-grid">
            <label className="driver-field-grid__full"><span>Nome curto</span><input maxLength={80} value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Ex.: Porto Alegre → Gramado" /></label>
          </div>

          <DriverRoutePlanner value={route} onChange={setRoute} />

          <div className="driver-field-grid">
            <label><span>Como mostrar o preço</span><select value={form.pricingType} onChange={(event) => update("pricingType", event.target.value as DriverPricingType)}>{Object.entries(DRIVER_PRICING_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            {form.pricingType !== "consult" ? <label><span>Preço</span><input inputMode="decimal" value={form.price} onChange={(event) => update("price", event.target.value)} placeholder="0,00" /></label> : <div aria-hidden="true" />}
            <label><span>Espera incluída (min)</span><input type="number" min={0} max={1440} step={15} value={form.defaultWaitMinutes} onChange={(event) => update("defaultWaitMinutes", event.target.value)} /></label>
            <label className="driver-inline-toggle"><div><strong>Aceitar pedido de volta</strong><small>O passageiro poderá informar retorno.</small></div><input type="checkbox" checked={form.allowsReturn} onChange={(event) => update("allowsReturn", event.target.checked)} /></label>
          </div>

          <button className="driver-service-details-toggle" type="button" onClick={() => setShowDetails((current) => !current)}>
            {showDetails ? "Ocultar descrição e detalhes" : "Adicionar descrição e detalhes (opcional)"}
          </button>
          {showDetails ? (
            <div className="driver-field-grid driver-service-editor__optional-content">
              <label className="driver-field-grid__full"><span>Descrição</span><textarea rows={3} maxLength={320} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Explique em uma frase quando esta rota é indicada." /></label>
              <label><span>Duração ou antecedência</span><input maxLength={80} value={form.durationLabel} onChange={(event) => update("durationLabel", event.target.value)} placeholder="Ex.: Reserve com 24h" /></label>
              <label><span>O que está incluído</span><input maxLength={240} value={form.includes} onChange={(event) => update("includes", event.target.value)} placeholder="Ex.: pedágio e 30 min de espera" /></label>
            </div>
          ) : null}

          <label className="driver-inline-toggle"><div><strong>Mostrar no perfil público</strong><small>Desative temporariamente sem apagar.</small></div><input type="checkbox" checked={form.active} onChange={(event) => update("active", event.target.checked)} /></label>
          <div className="driver-service-editor__actions"><button className="button button--secondary" type="button" onClick={() => { setOpen(false); resetEditor(); }}>Cancelar</button><button className="button button--primary" type="button" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="auth-spinner" size={18} /> : <Save size={18} />}{saving ? "Salvando..." : "Salvar no catálogo"}</button></div>
        </section>
      ) : null}

      {message ? <p className={`auth-message auth-message--${message.type}`}>{message.text}</p> : null}

      {items.length ? (
        <div className="driver-service-list">
          {items.map((item) => (
            <article key={item.id} className={!item.is_active ? "is-inactive" : ""}>
              <div className="driver-service-list__main"><span className="driver-service-list__status">{item.is_active ? "Visível" : "Oculto"}</span><h3>{item.title}</h3><p>{item.description || "Rota frequente do motorista."}</p><div>{item.origin_label && item.destination_label ? <span><MapPin size={15} /> {item.origin_label} → {item.destination_label}</span> : item.route_summary ? <span><MapPin size={15} /> {item.route_summary}</span> : null}{item.route_duration_seconds ? <span><Clock3 size={15} /> {formatRouteDuration(item.route_duration_seconds)}</span> : null}</div></div>
              <div className="driver-service-list__price"><strong>{formatDriverPackagePrice(item)}</strong>{item.route_distance_meters ? <small>{formatRouteDistance(item.route_distance_meters)}</small> : null}{item.default_wait_minutes ? <small>Espera: {item.default_wait_minutes} min</small> : null}{item.includes ? <small>{item.includes}</small> : null}</div>
              <div className="driver-service-list__actions"><button className="icon-button" type="button" onClick={() => startEdit(item)} aria-label={`Editar ${item.title}`}><Edit3 size={18} /></button><button className="icon-button" type="button" onClick={() => void remove(item)} aria-label={`Remover ${item.title}`}><Trash2 size={18} /></button></div>
            </article>
          ))}
        </div>
      ) : !open ? <div className="driver-empty-card"><Plus size={28} /><strong>Cadastre sua primeira rota</strong><p>Comece por um trajeto que você faz com frequência.</p><button className="button button--primary" type="button" onClick={startCreate}>Criar rota</button></div> : null}
    </div>
  );
}
