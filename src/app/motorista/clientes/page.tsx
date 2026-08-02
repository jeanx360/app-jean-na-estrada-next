import type { Metadata } from "next";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  ContactRound,
  Filter,
  MessageCircle,
  RotateCcw,
  Search,
  UserRoundCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { requireDriverFeature } from "@/lib/account-plan";
import { formatCurrency } from "@/lib/driver";
import {
  DRIVER_CUSTOMER_TAG_LABELS,
  DRIVER_CUSTOMER_TAGS,
  driverCustomerName,
  driverCustomerWhatsAppUrl,
  formatDriverCustomerPhone,
  isDriverCustomerInactive,
  type DriverCustomerOverview,
  type DriverCustomerTag,
} from "@/lib/driver-crm";
import { formatBrazilDateTime } from "@/lib/date-time";

export const metadata: Metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

type CustomerFilter = "all" | "recurring" | "inactive" | "archived";
type Props = {
  searchParams: Promise<{ q?: string; tag?: string; status?: string }>;
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export default async function DriverCustomersPage({ searchParams }: Props) {
  const filters = await searchParams;
  const { supabase, userId } = await requireDriverFeature("crm", "/motorista/clientes");

  const { data, error } = await supabase.rpc("driver_customer_overview");
  if (error) throw new Error(error.message);

  const customers = (data ?? []).map((item: DriverCustomerOverview) => ({
    ...item,
    reservations_total: Number(item.reservations_total || 0),
    completed_reservations: Number(item.completed_reservations || 0),
    completed_trips: Number(item.completed_trips || 0),
    total_revenue: Number(item.total_revenue || 0),
  })) as DriverCustomerOverview[];

  const query = normalizeSearch((filters.q || "").trim());
  const tag = DRIVER_CUSTOMER_TAGS.includes(filters.tag as DriverCustomerTag)
    ? filters.tag as DriverCustomerTag
    : "all";
  const allowedStatuses = new Set<CustomerFilter>(["all", "recurring", "inactive", "archived"]);
  const status = allowedStatuses.has(filters.status as CustomerFilter)
    ? filters.status as CustomerFilter
    : "all";
  const now = Date.now();

  const visibleCustomers = customers.filter((customer) => {
    const inactive = isDriverCustomerInactive(customer, now);
    if (status === "archived" && !customer.is_archived) return false;
    if (status !== "archived" && customer.is_archived) return false;
    if (status === "recurring" && customer.reservations_total < 2) return false;
    if (status === "inactive" && !inactive) return false;
    if (tag !== "all" && !customer.tags.includes(tag)) return false;
    if (!query) return true;

    return normalizeSearch([
      driverCustomerName(customer),
      customer.display_name,
      customer.phone,
      customer.phone_normalized,
      customer.private_notes,
      ...customer.tags.map((item) => DRIVER_CUSTOMER_TAG_LABELS[item]),
    ].filter(Boolean).join(" ")).includes(query);
  });

  const activeCustomers = customers.filter((customer) => !customer.is_archived);
  const recurringCustomers = activeCustomers.filter((customer) => customer.reservations_total >= 2).length;
  const inactiveCustomers = activeCustomers.filter((customer) => isDriverCustomerInactive(customer, now)).length;
  const totalRevenue = activeCustomers.reduce((total, customer) => total + customer.total_revenue, 0);
  const hasFilters = Boolean(query || tag !== "all" || status !== "all");

  return (
    <div className="page-stack driver-page driver-customer-page">
      <Link className="text-link driver-back-link" href="/motorista">
        <ArrowLeft size={17} /> Voltar ao painel
      </Link>

      <PageHeader
        icon={<UsersRound size={24} />}
        eyebrow="RELACIONAMENTO"
        title="Carteira de clientes"
        description="Reservas viram contatos organizados automaticamente, com histórico, recorrência, etiquetas e observações privadas."
      />

      <section className="driver-customer-summary" aria-label="Resumo da carteira">
        <article><ContactRound size={21} /><span>Clientes ativos</span><strong>{activeCustomers.length}</strong></article>
        <article><UserRoundCheck size={21} /><span>Recorrentes</span><strong>{recurringCustomers}</strong></article>
        <article><CalendarClock size={21} /><span>Inativos há 90 dias</span><strong>{inactiveCustomers}</strong></article>
        <article><WalletCards size={21} /><span>Receita registrada</span><strong>{formatCurrency(totalRevenue)}</strong></article>
      </section>

      <form className="driver-customer-filters" method="get">
        <label className="driver-customer-search">
          <Search size={18} />
          <input name="q" defaultValue={filters.q || ""} placeholder="Nome, telefone, etiqueta ou anotação" />
        </label>
        <label>
          <span>Carteira</span>
          <select name="status" defaultValue={status}>
            <option value="all">Clientes ativos</option>
            <option value="recurring">Recorrentes</option>
            <option value="inactive">Inativos há 90 dias</option>
            <option value="archived">Arquivados</option>
          </select>
        </label>
        <label>
          <span>Etiqueta</span>
          <select name="tag" defaultValue={tag}>
            <option value="all">Todas as etiquetas</option>
            {DRIVER_CUSTOMER_TAGS.map((item) => (
              <option key={item} value={item}>{DRIVER_CUSTOMER_TAG_LABELS[item]}</option>
            ))}
          </select>
        </label>
        <button className="button button--primary" type="submit"><Filter size={17} /> Aplicar</button>
        {hasFilters ? <Link className="button button--secondary" href="/motorista/clientes"><RotateCcw size={17} /> Limpar</Link> : null}
      </form>

      <div className="driver-customer-results-heading">
        <strong>{visibleCustomers.length}</strong>
        <span>{visibleCustomers.length === 1 ? "cliente encontrado" : "clientes encontrados"}</span>
      </div>

      {visibleCustomers.length ? (
        <div className="driver-customer-list">
          {visibleCustomers.map((customer) => {
            const inactive = isDriverCustomerInactive(customer, now);
            return (
              <article key={customer.id} className={`driver-customer-card${customer.is_archived ? " is-archived" : ""}${inactive ? " is-inactive" : ""}`}>
                <header>
                  <div className="driver-customer-card__identity">
                    <span>{driverCustomerName(customer).slice(0, 1).toUpperCase()}</span>
                    <div>
                      <h2>{driverCustomerName(customer)}</h2>
                      {customer.custom_name ? <small>Cadastro recebido como {customer.display_name}</small> : null}
                      <p>{formatDriverCustomerPhone(customer.phone)}</p>
                    </div>
                  </div>
                  <div className="driver-customer-card__status">
                    {customer.is_archived ? <span className="driver-customer-state"><Archive size={14} /> Arquivado</span> : null}
                    {!customer.is_archived && inactive ? <span className="driver-customer-state driver-customer-state--warning"><CalendarClock size={14} /> Inativo</span> : null}
                    {!customer.is_archived && customer.reservations_total >= 2 ? <span className="driver-customer-state driver-customer-state--success"><BadgeCheck size={14} /> Recorrente</span> : null}
                  </div>
                </header>

                {customer.tags.length ? (
                  <div className="driver-customer-tags">
                    {customer.tags.map((item) => <span key={item}>{DRIVER_CUSTOMER_TAG_LABELS[item]}</span>)}
                  </div>
                ) : null}

                <div className="driver-customer-card__metrics">
                  <div><span>Solicitações</span><strong>{customer.reservations_total}</strong></div>
                  <div><span>Viagens concluídas</span><strong>{customer.completed_trips}</strong></div>
                  <div><span>Receita</span><strong>{formatCurrency(customer.total_revenue)}</strong></div>
                </div>

                <p className="driver-customer-card__last-contact">
                  Último atendimento em {formatBrazilDateTime(customer.last_service_at ?? customer.last_contact_at)}
                </p>

                <div className="driver-customer-card__actions">
                  <a className="button button--secondary" href={driverCustomerWhatsAppUrl(customer)} target="_blank" rel="noreferrer">
                    <MessageCircle size={17} /> WhatsApp
                  </a>
                  <Link className="button button--primary" href={`/motorista/clientes/${customer.id}`}>
                    Abrir cliente <ArrowRight size={17} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="driver-empty-card">
          <UsersRound size={34} />
          <strong>{hasFilters ? "Nenhum cliente corresponde aos filtros" : "Sua carteira ainda está vazia"}</strong>
          <p>{hasFilters ? "Altere ou limpe os filtros para procurar outro contato." : "Quando um passageiro enviar uma reserva, o contato será organizado aqui automaticamente."}</p>
          {hasFilters ? <Link className="button button--secondary" href="/motorista/clientes">Limpar filtros</Link> : <Link className="button button--primary" href="/motorista/cartao">Divulgar meu perfil</Link>}
        </div>
      )}
    </div>
  );
}
