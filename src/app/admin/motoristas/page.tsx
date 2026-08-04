import type { Metadata } from "next";
import Link from "next/link";
import {
  Ban,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ContactRound,
  Eye,
  EyeOff,
  FileText,
  Filter,
  ImagePlus,
  MessageCircle,
  Palette,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  Trash2,
  XCircle,
  UserRoundCog,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { deleteMemberAccountAction, setMemberBlockedAction } from "@/app/admin/actions";
import {
  deleteDriverRecordAdminAction,
  setDriverNetworkVerificationAction,
  setDriverProfessionalStatusAction,
  setDriverPublicProfilePublishedAction,
  updateDriverPublicProfileAppearanceAction,
} from "@/app/admin/motoristas/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { requireAdmin } from "@/lib/admin";
import { formatCurrency, DRIVER_TRIP_STATUS_LABELS, type DriverQuote, type DriverTrip } from "@/lib/driver";
import { DRIVER_RESERVATION_STATUS_LABELS, type DriverPublicProfile, type DriverReservation } from "@/lib/driver-public";
import { DRIVER_NETWORK_SERVICE_LABELS, DRIVER_NETWORK_VERIFICATION_LABELS, type DriverNetworkSettings } from "@/lib/driver-network";
import { formatBrazilDate, formatBrazilDateTime, formatBrazilTime } from "@/lib/date-time";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MemberRole } from "@/types/auth";

export const metadata: Metadata = { title: "Administração dos motoristas" };
export const dynamic = "force-dynamic";

type MemberRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: MemberRole;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  is_professional_driver: boolean;
};

type DriverMetric = {
  user_id: string;
  profile_views: number | string;
  profile_views_30d: number | string;
  whatsapp_clicks: number | string;
  reservation_starts: number | string;
  reservation_submissions: number | string;
  reservations_total: number | string;
  quotes_total: number | string;
  trips_total: number | string;
};

function countNumber(value: number | string | null | undefined) {
  return Number(value || 0);
}

type AdminRecordView = "reservations" | "quotes" | "trips";
type Props = { searchParams: Promise<{ view?: string; driver?: string; page?: string }> };

export default async function AdminDriversPage({ searchParams }: Props) {
  const params = await searchParams;
  const recordView: AdminRecordView = ["reservations", "quotes", "trips"].includes(params.view || "")
    ? params.view as AdminRecordView
    : "reservations";
  const requestedPage = Number(params.page || "1");
  const currentPage = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 40;
  const { supabase, userId } = await requireAdmin();
  const admin = createAdminClient();

  const [membersResult, profilesResult, publicProfilesResult, metricsResult, networkResult] = await Promise.all([
    supabase.rpc("admin_list_members"),
    admin.from("profiles").select("id, is_professional_driver"),
    admin.from("driver_public_profiles").select("*").order("created_at", { ascending: false }),
    supabase.rpc("admin_driver_metrics"),
    admin.from("driver_network_settings").select("*").order("updated_at", { ascending: false }),
  ]);

  const members = (membersResult.data ?? []) as MemberRow[];
  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const publicProfiles = (publicProfilesResult.data ?? []) as DriverPublicProfile[];
  const metrics = (metricsResult.data ?? []) as DriverMetric[];
  const networkSettings = (networkResult.data ?? []) as DriverNetworkSettings[];

  const memberMap = new Map(members.map((item) => [item.id, item]));
  const profileMap = new Map(profiles.map((item) => [item.id, item]));
  const publicProfileMap = new Map(publicProfiles.map((item) => [item.user_id, item]));
  const metricMap = new Map(metrics.map((item) => [item.user_id, item]));
  const networkMap = new Map(networkSettings.map((item) => [item.user_id, item]));
  const driverIds = new Set<string>();
  profiles.filter((item) => item.is_professional_driver).forEach((item) => driverIds.add(item.id));
  publicProfiles.forEach((item) => driverIds.add(item.user_id));
  metrics.forEach((item) => driverIds.add(item.user_id));
  networkSettings.forEach((item) => driverIds.add(item.user_id));

  const drivers = [...driverIds]
    .map((id) => ({
      id,
      member: memberMap.get(id),
      profile: profileMap.get(id),
      publicProfile: publicProfileMap.get(id),
      metrics: metricMap.get(id),
      network: networkMap.get(id),
    }))
    .filter((item) => item.member)
    .sort((first, second) => (first.member?.full_name || first.member?.email || "").localeCompare(second.member?.full_name || second.member?.email || "", "pt-BR"));

  const totalViews = metrics.reduce((sum, item) => sum + countNumber(item.profile_views), 0);
  const views30d = metrics.reduce((sum, item) => sum + countNumber(item.profile_views_30d), 0);
  const blockedDrivers = drivers.filter((item) => item.member?.is_blocked).length;
  const publishedDrivers = drivers.filter((item) => item.publicProfile?.is_published).length;
  const verifiedNetworkDrivers = networkSettings.filter((item) => item.opted_in && item.verification_status === "verified").length;
  const pendingNetworkDrivers = networkSettings.filter((item) => item.verification_status === "pending").length;
  const requestedDriver = params.driver || "all";
  const selectedDriver = requestedDriver !== "all" && driverIds.has(requestedDriver) ? requestedDriver : "all";
  const tableName = recordView === "reservations" ? "driver_reservations" : recordView === "quotes" ? "driver_quotes" : "driver_trips";
  const ownerColumn = recordView === "reservations" ? "driver_user_id" : "user_id";
  let recordQuery = admin
    .from(tableName)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
  if (selectedDriver !== "all") recordQuery = recordQuery.eq(ownerColumn, selectedDriver);
  const recordResult = await recordQuery;
  const reservations = recordView === "reservations" ? (recordResult.data ?? []) as DriverReservation[] : [];
  const quotes = recordView === "quotes" ? (recordResult.data ?? []) as DriverQuote[] : [];
  const trips = recordView === "trips" ? (recordResult.data ?? []) as DriverTrip[] : [];
  const recordCount = recordResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(recordCount / pageSize));
  const recordHref = (page: number) => {
    const query = new URLSearchParams({ view: recordView, page: String(page) });
    if (selectedDriver !== "all") query.set("driver", selectedDriver);
    return `/admin/motoristas?${query.toString()}`;
  };

  return (
    <div className="admin-section-stack admin-drivers-page">
      <section className="admin-summary-grid admin-driver-summary">
        <article><UsersRound size={22} /><span>Motoristas identificados</span><strong>{drivers.length}</strong></article>
        <article><Eye size={22} /><span>Perfis públicos</span><strong>{publishedDrivers}</strong></article>
        <article><BarChart3 size={22} /><span>Acessos totais</span><strong>{totalViews}</strong><small>{views30d} nos últimos 30 dias</small></article>
        <article><ShieldCheck size={22} /><span>Rede verificada</span><strong>{verifiedNetworkDrivers}</strong><small>{pendingNetworkDrivers} aguardando análise</small></article>
        <article><Ban size={22} /><span>Motoristas bloqueados</span><strong>{blockedDrivers}</strong></article>
      </section>

      {(membersResult.error || profilesResult.error || publicProfilesResult.error || metricsResult.error || networkResult.error) ? (
        <p className="auth-message auth-message--error">
          {membersResult.error?.message || profilesResult.error?.message || publicProfilesResult.error?.message || metricsResult.error?.message || networkResult.error?.message}
        </p>
      ) : null}

      <section className="admin-panel-card">
        <div className="admin-panel-card__heading">
          <div><span>MOTORISTAS</span><h2>Contas, perfil público e desempenho</h2><p>Bloqueie acessos, remova o modo motorista, publique cartões e acompanhe a procura de cada página.</p></div>
          <UserRoundCog size={25} />
        </div>

        <div className="admin-driver-list">
          {drivers.map(({ id, member, profile, publicProfile, metrics: driverMetrics, network }) => {
            if (!member) return null;
            const isSelf = id === userId;
            const isDriverActive = Boolean(profile?.is_professional_driver);
            return (
              <article className={`admin-driver-card${member.is_blocked ? " is-blocked" : ""}`} key={id}>
                <header>
                  <div className="admin-driver-card__identity">
                    <span>{(member.full_name || member.email).slice(0, 2).toUpperCase()}</span>
                    <div><h3>{member.full_name || "Nome não informado"}</h3><p>{member.email}</p><small>Cadastro em {formatBrazilDate(member.created_at)}</small></div>
                  </div>
                  <div className="admin-driver-card__badges">
                    <span className={`role-badge role-badge--${member.role}`}>{member.role === "admin" ? "Administrador" : member.role === "vip" ? "VIP" : "Membro"}</span>
                    <span className={`admin-status${member.is_blocked ? " admin-status--danger" : ""}`}>{member.is_blocked ? "Bloqueado" : "Ativo"}</span>
                    <span className={`admin-status${isDriverActive ? "" : " admin-status--danger"}`}>{isDriverActive ? "Motorista habilitado" : "Modo motorista removido"}</span>
                  </div>
                </header>

                <div className="admin-driver-metrics">
                  <article><Eye size={17} /><span>Acessos</span><strong>{countNumber(driverMetrics?.profile_views)}</strong><small>{countNumber(driverMetrics?.profile_views_30d)} em 30 dias</small></article>
                  <article><MessageCircle size={17} /><span>Cliques no WhatsApp</span><strong>{countNumber(driverMetrics?.whatsapp_clicks)}</strong></article>
                  <article><CalendarDays size={17} /><span>Reservas enviadas</span><strong>{countNumber(driverMetrics?.reservation_submissions)}</strong><small>{countNumber(driverMetrics?.reservation_starts)} formulários iniciados</small></article>
                  <article><WalletCards size={17} /><span>Operação</span><strong>{countNumber(driverMetrics?.trips_total)} viagens</strong><small>{countNumber(driverMetrics?.quotes_total)} orçamentos</small></article>
                </div>

                <div className="admin-driver-public-profile">
                  <ContactRound size={20} />
                  {publicProfile ? (
                    <div><strong>{publicProfile.display_name}</strong><span>/m/{publicProfile.slug}</span><small>{publicProfile.is_published ? "Página publicada" : "Página fora do ar"} · {publicProfile.accepts_reservations ? "recebendo solicitações" : "reservas pausadas"}</small></div>
                  ) : <div><strong>Perfil público não criado</strong><small>O motorista ainda não configurou o cartão profissional.</small></div>}
                  {publicProfile?.is_published ? <Link className="button button--secondary button--compact" href={`/m/${publicProfile.slug}?preview=admin`} target="_blank" rel="noreferrer"><Eye size={16} /> Abrir página</Link> : null}
                </div>

                {publicProfile ? (
                  <details className="admin-driver-appearance">
                    <summary><Palette size={17} /> Aparência do perfil público</summary>
                    <form action={updateDriverPublicProfileAppearanceAction}>
                      <input type="hidden" name="userId" value={id} />
                      <div className="admin-driver-appearance__preview">
                        {publicProfile.vehicle_banner_url ? <img src={publicProfile.vehicle_banner_url} alt={`Veículo de ${publicProfile.display_name}`} /> : <span><ImagePlus size={24} /> Sem foto do carro</span>}
                      </div>
                      <label><span>Tema do cartão</span><select name="theme" defaultValue={publicProfile.theme}><option value="dark">Preto</option><option value="blue">Azul</option><option value="green">Verde</option></select></label>
                      <label><span>Trocar foto do carro</span><input type="file" name="vehicleBanner" accept="image/jpeg,image/png,image/webp" /><small>JPG, PNG ou WebP, até 6 MB.</small></label>
                      <label className="admin-driver-appearance__toggle"><input type="checkbox" name="showVehicleBanner" value="true" defaultChecked={publicProfile.show_vehicle_banner} /><span>Exibir banner no perfil público</span></label>
                      {publicProfile.vehicle_banner_url ? <label className="admin-driver-appearance__toggle"><input type="checkbox" name="removeVehicleBanner" value="true" /><span>Remover a foto atual ao salvar</span></label> : null}
                      <button className="button button--primary button--compact" type="submit"><Palette size={16} /> Salvar aparência</button>
                    </form>
                  </details>
                ) : null}

                {network ? (
                  <div className={`admin-driver-network admin-driver-network--${network.verification_status}`}>
                    <ShieldCheck size={20} />
                    <div>
                      <strong>Rede de motoristas · {DRIVER_NETWORK_VERIFICATION_LABELS[network.verification_status]}</strong>
                      <span>{network.opted_in ? "Participação ativa" : "Participação pausada"} · {network.accepts_referrals ? "recebe indicações" : "não recebe indicações"}</span>
                      <small>{network.region || "Região não informada"}{network.service_types.length ? ` · ${network.service_types.slice(0, 3).map((item) => DRIVER_NETWORK_SERVICE_LABELS[item]).join(", ")}` : ""}</small>
                    </div>
                    <form className="admin-driver-network__form" action={setDriverNetworkVerificationAction}>
                      <input type="hidden" name="userId" value={id} />
                      <input name="notes" maxLength={500} placeholder="Observação da verificação" defaultValue={network.verification_notes || ""} />
                      <div>
                        <button className="button button--primary button--compact" type="submit" name="status" value="verified"><CheckCircle2 size={15} /> Verificar</button>
                        <button className="button button--danger button--compact" type="submit" name="status" value="rejected"><XCircle size={15} /> Recusar</button>
                        <button className="button button--secondary button--compact" type="submit" name="status" value="pending"><RotateCcw size={15} /> Revisar novamente</button>
                      </div>
                    </form>
                  </div>
                ) : null}

                {!isSelf ? (
                  <details className="admin-driver-controls">
                    <summary><UserRoundCog size={17} /> Controles administrativos</summary>
                    <div className="admin-driver-controls__grid">
                      <form action={setMemberBlockedAction}>
                        <input type="hidden" name="userId" value={id} />
                        <input type="hidden" name="blocked" value={member.is_blocked ? "false" : "true"} />
                        {!member.is_blocked ? <input name="reason" placeholder="Motivo do bloqueio" /> : null}
                        <ConfirmSubmitButton className={`button ${member.is_blocked ? "button--primary" : "button--danger"}`} message={member.is_blocked ? "Reativar esta conta?" : "Bloquear esta conta e impedir o acesso ao JNE App?"}>
                          {member.is_blocked ? <CheckCircle2 size={16} /> : <Ban size={16} />} {member.is_blocked ? "Reativar conta" : "Bloquear conta"}
                        </ConfirmSubmitButton>
                      </form>

                      <form action={setDriverProfessionalStatusAction}>
                        <input type="hidden" name="userId" value={id} />
                        <input type="hidden" name="active" value={isDriverActive ? "false" : "true"} />
                        <ConfirmSubmitButton className="button button--secondary" message={isDriverActive ? "Remover o acesso à Área do Motorista e tirar o perfil público do ar?" : "Reativar a Área do Motorista para esta conta?"}>
                          <ShieldOff size={16} /> {isDriverActive ? "Remover modo motorista" : "Reativar motorista"}
                        </ConfirmSubmitButton>
                      </form>

                      {publicProfile ? (
                        <form action={setDriverPublicProfilePublishedAction}>
                          <input type="hidden" name="userId" value={id} />
                          <input type="hidden" name="published" value={publicProfile.is_published ? "false" : "true"} />
                          <ConfirmSubmitButton className="button button--secondary" message={publicProfile.is_published ? "Retirar imediatamente esta página pública do ar?" : "Publicar novamente esta página e liberar solicitações?"}>
                            {publicProfile.is_published ? <EyeOff size={16} /> : <Eye size={16} />} {publicProfile.is_published ? "Tirar página do ar" : "Publicar página"}
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}

                      <form action={deleteMemberAccountAction}>
                        <input type="hidden" name="userId" value={id} />
                        <ConfirmSubmitButton className="button button--danger" disabled={member.role === "admin"} message="Excluir definitivamente a conta do motorista, perfil público, reservas, orçamentos e viagens? Esta ação não pode ser desfeita.">
                          <Trash2 size={16} /> Excluir conta completa
                        </ConfirmSubmitButton>
                        {member.role === "admin" ? <small>Remova o nível administrativo antes de excluir.</small> : null}
                      </form>
                    </div>
                  </details>
                ) : <small className="admin-driver-self-note">Sua conta administrativa é protegida contra bloqueio ou exclusão nesta tela.</small>}
              </article>
            );
          })}
        </div>
      </section>

      <section className="admin-panel-card admin-driver-record-manager">
        <div className="admin-panel-card__heading">
          <div>
            <span>OPERAÇÃO DOS MOTORISTAS</span>
            <h2>{recordView === "reservations" ? "Reservas e agendamentos" : recordView === "quotes" ? "Orçamentos" : "Viagens e financeiro"}</h2>
            <p>Consulte todos os registros em páginas de {pageSize} itens e exclua somente dados indevidos ou mediante solicitação do titular.</p>
          </div>
          {recordView === "reservations" ? <CalendarDays size={24} /> : recordView === "quotes" ? <FileText size={24} /> : <ReceiptText size={24} />}
        </div>

        <form className="admin-driver-record-filters" method="get">
          <label>
            <span>Tipo de registro</span>
            <select name="view" defaultValue={recordView}>
              <option value="reservations">Reservas</option>
              <option value="quotes">Orçamentos</option>
              <option value="trips">Viagens</option>
            </select>
          </label>
          <label>
            <span>Motorista</span>
            <select name="driver" defaultValue={selectedDriver}>
              <option value="all">Todos os motoristas</option>
              {drivers.map((item) => item.member ? <option key={item.id} value={item.id}>{item.member.full_name || item.member.email}</option> : null)}
            </select>
          </label>
          <button className="button button--primary" type="submit"><Filter size={17} /> Aplicar</button>
          {(selectedDriver !== "all" || recordView !== "reservations" || currentPage !== 1) ? <Link className="button button--secondary" href="/admin/motoristas"><RotateCcw size={17} /> Limpar</Link> : null}
        </form>

        <div className="admin-driver-record-count"><strong>{recordCount}</strong><span>{recordCount === 1 ? "registro encontrado" : "registros encontrados"}</span></div>
        {recordResult.error ? <p className="auth-message auth-message--error">{recordResult.error.message}</p> : null}

        <div className="admin-driver-record-list">
          {reservations.map((item) => {
            const member = memberMap.get(item.driver_user_id);
            return (
              <article key={item.id}>
                <div>
                  <strong>{item.passenger_name}</strong>
                  <span>{[item.origin, item.destination].filter(Boolean).join(" → ") || "Serviço sem rota"}</span>
                  <small>Motorista: {member?.full_name || member?.email || item.driver_user_id} · {item.travel_date ? formatBrazilDate(item.travel_date) : "sem data"}{item.travel_time ? ` às ${formatBrazilTime(item.travel_time)}` : ""}</small>
                  {item.cancellation_reason ? <small>Motivo: {item.cancellation_reason}</small> : null}
                </div>
                <span className={`driver-reservation-badge driver-reservation-badge--${item.status}`}>{DRIVER_RESERVATION_STATUS_LABELS[item.status]}</span>
                <form action={deleteDriverRecordAdminAction}>
                  <input type="hidden" name="recordKind" value="reservation" />
                  <input type="hidden" name="recordId" value={item.id} />
                  <ConfirmSubmitButton className="icon-button admin-driver-delete" aria-label="Excluir reserva" title="Excluir reserva" message="Excluir definitivamente esta reserva? Viagens e orçamentos vinculados serão mantidos sem o vínculo."><Trash2 size={17} /></ConfirmSubmitButton>
                </form>
              </article>
            );
          })}

          {quotes.map((item) => {
            const member = memberMap.get(item.user_id);
            return (
              <article key={item.id}>
                <div>
                  <strong>{[item.origin, item.destination].filter(Boolean).join(" → ") || item.customer_name || "Orçamento"}</strong>
                  <span>{formatCurrency(item.rounded_total)} · {item.status}</span>
                  <small>{member?.full_name || member?.email || item.user_id} · {formatBrazilDate(item.created_at)}</small>
                </div>
                <form action={deleteDriverRecordAdminAction}>
                  <input type="hidden" name="recordKind" value="quote" />
                  <input type="hidden" name="recordId" value={item.id} />
                  <ConfirmSubmitButton className="icon-button admin-driver-delete" aria-label="Excluir orçamento" title="Excluir orçamento" message="Excluir este orçamento? A viagem vinculada será mantida."><Trash2 size={17} /></ConfirmSubmitButton>
                </form>
              </article>
            );
          })}

          {trips.map((item) => {
            const member = memberMap.get(item.user_id);
            return (
              <article key={item.id}>
                <div>
                  <strong>{[item.origin, item.destination].filter(Boolean).join(" → ") || item.customer_name || "Viagem"}</strong>
                  <span>{formatCurrency(item.agreed_amount)} · {DRIVER_TRIP_STATUS_LABELS[item.status]}</span>
                  <small>{member?.full_name || member?.email || item.user_id} · {item.travel_date ? formatBrazilDate(item.travel_date) : formatBrazilDateTime(item.created_at)}</small>
                </div>
                <form action={deleteDriverRecordAdminAction}>
                  <input type="hidden" name="recordKind" value="trip" />
                  <input type="hidden" name="recordId" value={item.id} />
                  <ConfirmSubmitButton className="icon-button admin-driver-delete" aria-label="Excluir viagem" title="Excluir viagem" message="Excluir esta viagem e todos os lançamentos financeiros vinculados? Esta ação não pode ser desfeita."><Trash2 size={17} /></ConfirmSubmitButton>
                </form>
              </article>
            );
          })}

          {!recordResult.error && !recordResult.data?.length ? <p>Nenhum registro encontrado para este filtro.</p> : null}
        </div>

        {totalPages > 1 ? (
          <nav className="admin-driver-pagination" aria-label="Paginação dos registros">
            {currentPage > 1 ? <Link className="button button--secondary button--compact" href={recordHref(currentPage - 1)}>Página anterior</Link> : <span />}
            <strong>Página {Math.min(currentPage, totalPages)} de {totalPages}</strong>
            {currentPage < totalPages ? <Link className="button button--secondary button--compact" href={recordHref(currentPage + 1)}>Próxima página</Link> : <span />}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
