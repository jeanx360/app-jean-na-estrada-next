import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Car,
  CheckCircle2,
  Filter,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  UsersRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  DRIVER_NETWORK_ACCESSIBILITY_FEATURES,
  DRIVER_NETWORK_ACCESSIBILITY_LABELS,
  DRIVER_NETWORK_SERVICE_LABELS,
  DRIVER_NETWORK_SERVICE_TYPES,
  type DriverNetworkAccessibilityFeature,
  type DriverNetworkMember,
  type DriverNetworkServiceType,
} from "@/lib/driver-network";

export const metadata: Metadata = {
  title: "Motoristas particulares verificados",
  description: "Encontre motoristas particulares verificados por cidade, região, veículo e tipo de serviço no JNE App.",
};
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    cidade?: string;
    regiao?: string;
    servico?: string;
    veiculo?: string;
    passageiros?: string;
    acessibilidade?: string;
  }>;
};

function clean(value: string | undefined, max = 120) {
  return (value || "").trim().slice(0, max);
}

function validService(value: string): DriverNetworkServiceType | "" {
  return DRIVER_NETWORK_SERVICE_TYPES.includes(value as DriverNetworkServiceType)
    ? value as DriverNetworkServiceType
    : "";
}

function validAccessibility(value: string): DriverNetworkAccessibilityFeature | "" {
  return DRIVER_NETWORK_ACCESSIBILITY_FEATURES.includes(value as DriverNetworkAccessibilityFeature)
    ? value as DriverNetworkAccessibilityFeature
    : "";
}

export default async function DriverDirectoryPage({ searchParams }: Props) {
  const query = await searchParams;
  const searchText = clean(query.q);
  const city = clean(query.cidade, 80);
  const region = clean(query.regiao);
  const service = validService(clean(query.servico, 40));
  const vehicle = clean(query.veiculo, 100);
  const accessibility = validAccessibility(clean(query.acessibilidade, 60));
  const minSeats = Math.min(20, Math.max(1, Number(query.passageiros) || 1));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_driver_network", {
    search_text: searchText || null,
    city_filter: city || null,
    region_filter: region || null,
    service_filter: service || null,
    vehicle_filter: vehicle || null,
    min_seats: minSeats,
    accessibility_filter: accessibility || null,
    limit_count: 60,
    offset_count: 0,
  });
  const drivers = error ? [] : (data ?? []) as DriverNetworkMember[];
  const hasFilters = Boolean(searchText || city || region || service || vehicle || accessibility || minSeats > 1);

  return (
    <div className="driver-directory-page">
      <header className="driver-directory-hero">
        <div className="driver-directory-hero__copy">
          <span><ShieldCheck size={16} /> REDE PROFISSIONAL JNE APP</span>
          <h1>Encontre um motorista particular verificado</h1>
          <p>Pesquise por cidade, região, tipo de serviço, veículo, lugares e recursos de acessibilidade. O contato é direto com o profissional.</p>
          <div><small><CheckCircle2 size={15} /> Participação opcional</small><small><CheckCircle2 size={15} /> Perfis verificados</small><small><CheckCircle2 size={15} /> Sem intermediação de pagamento</small></div>
        </div>
        <div className="driver-directory-hero__icon"><UsersRound size={58} /></div>
      </header>

      <form className="driver-directory-filters" method="get">
        <div className="driver-directory-filters__heading"><SlidersHorizontal size={21} /><div><strong>Filtrar profissionais</strong><span>Combine os campos para encontrar o atendimento adequado.</span></div></div>
        <div className="driver-directory-filter-grid">
          <label className="driver-directory-filter-grid__wide"><span>Busca geral</span><div><Search size={17} /><input name="q" defaultValue={searchText} placeholder="Nome, cidade, região ou veículo" /></div></label>
          <label><span>Cidade</span><input name="cidade" defaultValue={city} placeholder="Ex.: Porto Alegre" /></label>
          <label><span>Região atendida</span><input name="regiao" defaultValue={region} placeholder="Ex.: Serra Gaúcha" /></label>
          <label><span>Tipo de serviço</span><select name="servico" defaultValue={service}><option value="">Todos os serviços</option>{DRIVER_NETWORK_SERVICE_TYPES.map((item) => <option key={item} value={item}>{DRIVER_NETWORK_SERVICE_LABELS[item]}</option>)}</select></label>
          <label><span>Veículo</span><input name="veiculo" defaultValue={vehicle} placeholder="Ex.: elétrico, SUV, sedan" /></label>
          <label><span>Mínimo de lugares</span><select name="passageiros" defaultValue={String(minSeats)}>{[1,2,3,4,5,6,7,8].map((value) => <option key={value} value={value}>{value}+</option>)}</select></label>
          <label><span>Acessibilidade e apoio</span><select name="acessibilidade" defaultValue={accessibility}><option value="">Qualquer recurso</option>{DRIVER_NETWORK_ACCESSIBILITY_FEATURES.map((item) => <option key={item} value={item}>{DRIVER_NETWORK_ACCESSIBILITY_LABELS[item]}</option>)}</select></label>
        </div>
        <div className="driver-directory-filters__actions"><button className="button button--primary" type="submit"><Filter size={17} /> Aplicar filtros</button>{hasFilters ? <Link className="button button--secondary" href="/motoristas">Limpar</Link> : null}</div>
      </form>

      <section className="driver-directory-results">
        <div className="section-heading section-heading--inline"><div><span className="eyebrow">DIRETÓRIO PÚBLICO</span><h2>{drivers.length} motorista{drivers.length === 1 ? "" : "s"} encontrado{drivers.length === 1 ? "" : "s"}</h2><p>Abra o cartão profissional para ver os serviços e solicitar contato ou reserva.</p></div></div>
        {drivers.length ? (
          <div className="driver-directory-grid">
            {drivers.map((driver) => (
              <article className="driver-directory-card" key={driver.user_id}>
                <div className="driver-directory-card__top">
                  <div className="driver-directory-card__avatar">{driver.photo_url ? <img src={driver.photo_url} alt={`Foto de ${driver.display_name}`} /> : <span>{driver.display_name.slice(0, 2).toUpperCase()}</span>}</div>
                  <div><span className="driver-directory-card__verified"><CheckCircle2 size={14} /> Verificado</span><h3>{driver.display_name}</h3><p>{driver.headline || "Motorista particular"}</p></div>
                </div>
                <div className="driver-directory-card__facts">
                  <span><MapPin size={16} /> {driver.city || driver.region || "Região não informada"}</span>
                  <span><Car size={16} /> {driver.vehicle_name || "Veículo não informado"}</span>
                  <span><Users size={16} /> Até {driver.seats} passageiros</span>
                </div>
                {driver.network_note ? <p className="driver-directory-card__note">{driver.network_note}</p> : null}
                <div className="driver-directory-card__tags">
                  {driver.service_types.slice(0, 4).map((item) => <small key={item}>{DRIVER_NETWORK_SERVICE_LABELS[item]}</small>)}
                  {driver.accessibility_features.slice(0, 2).map((item) => <small className="is-accessibility" key={item}>{DRIVER_NETWORK_ACCESSIBILITY_LABELS[item]}</small>)}
                </div>
                <div className="driver-directory-card__footer"><span>{driver.service_area || driver.region || "Consulte a área de atendimento"}</span><Link className="button button--primary" href={`/m/${driver.slug}?src=network`}>Ver perfil <ArrowRight size={17} /></Link></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="driver-directory-empty"><UsersRound size={40} /><h3>Nenhum motorista encontrado</h3><p>Reduza os filtros ou faça uma busca por uma região próxima.</p>{hasFilters ? <Link className="button button--secondary" href="/motoristas">Limpar filtros</Link> : null}</div>
        )}
      </section>

      <section className="driver-directory-disclaimer">
        <ShieldCheck size={23} />
        <div><strong>Contato direto entre passageiro e profissional</strong><p>O JNE App apresenta os perfis e registra métricas de acesso. Cada motorista atua de forma independente, define disponibilidade e valores, e confirma a contratação diretamente com o passageiro.</p></div>
      </section>
    </div>
  );
}
