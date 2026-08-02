import type { Metadata } from "next";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  Layers3,
  PauseCircle,
  Settings2,
  Sparkles,
  UserRoundCog,
  XCircle,
} from "lucide-react";
import {
  reviewSubscriptionRequestAction,
  updateVipPlanSettingsAction,
} from "@/app/admin/actions";
import {
  clearAccountSubscriptionAction,
  setAccountSubscriptionAction,
  updateAppPlanCatalogAction,
} from "@/app/admin/assinatura/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import {
  ACCOUNT_PLAN_LABELS,
  ACCOUNT_STATUS_LABELS,
  type AccountPlanCode,
  type AccountSubscriptionStatus,
  type AppPlanCatalogItem,
} from "@/lib/account-plan";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBrazilDateTime } from "@/lib/date-time";
import type { MemberRole } from "@/types/auth";

export const metadata: Metadata = { title: "Planos e assinaturas" };

const PLAN_CODES: AccountPlanCode[] = ["free", "professional", "premium"];
const SUBSCRIPTION_STATUSES: AccountSubscriptionStatus[] = ["trial", "active", "past_due", "suspended", "cancelled", "expired"];

type LegacyVipPlan = {
  plan_name: string;
  description: string;
  price_cents: number;
  billing_days: number;
  recurring_payment_link: string | null;
  pix_enabled: boolean;
  pix_key_type: string | null;
  pix_key: string | null;
  pix_holder_name: string | null;
  pix_instructions: string | null;
  is_active: boolean;
};

type RequestItem = {
  id: string;
  user_id: string;
  payment_method: "payment_link" | "pix";
  amount_cents: number;
  payment_reference: string | null;
  proof_path: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type Member = {
  id: string;
  email: string;
  full_name: string | null;
  role: MemberRole;
};

type AccountSubscription = {
  user_id: string;
  plan_code: AccountPlanCode;
  status: AccountSubscriptionStatus;
  starts_at: string;
  expires_at: string | null;
  trial_ends_at: string | null;
  notes: string | null;
};

type LegacyEntitlement = {
  user_id: string;
  expires_at: string | null;
};

type AccountSubscriptionEvent = {
  id: string;
  user_id: string;
  event_type: string;
  old_plan_code: AccountPlanCode | null;
  new_plan_code: AccountPlanCode | null;
  old_status: AccountSubscriptionStatus | null;
  new_status: AccountSubscriptionStatus | null;
  notes: string | null;
  created_at: string;
};

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function dateInputAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function inputDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function planSourceLabel(member: Member, assignment: AccountSubscription | undefined, legacy: LegacyEntitlement | undefined) {
  if (member.role === "admin") return "Premium administrativo";
  if (assignment) return `${ACCOUNT_PLAN_LABELS[assignment.plan_code]} · ${ACCOUNT_STATUS_LABELS[assignment.status]}`;
  if (legacy) return "Premium legado do VIP";
  return "Gratuito padrão";
}

export default async function AdminSubscriptionPage() {
  const { supabase } = await requireAdmin();
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const [
    { data: legacyPlanData },
    { data: requestData, error },
    { data: memberData },
    { data: appPlanData, error: appPlanError },
    { data: assignmentData, error: assignmentError },
    { data: legacyData },
    { data: eventData },
  ] = await Promise.all([
    supabase.from("vip_plan_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("vip_subscription_requests").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.rpc("admin_list_members"),
    supabase.from("app_plan_catalog").select("code,name,description,trial_days,features,sort_order,is_active").order("sort_order", { ascending: true }),
    supabase.from("account_subscriptions").select("user_id,plan_code,status,starts_at,expires_at,trial_ends_at,notes"),
    supabase.from("vip_entitlements").select("user_id,expires_at").eq("is_active", true).lte("starts_at", now).or(`expires_at.is.null,expires_at.gt.${now}`),
    supabase.from("account_subscription_events").select("id,user_id,event_type,old_plan_code,new_plan_code,old_status,new_status,notes,created_at").order("created_at", { ascending: false }).limit(80),
  ]);

  const legacyPlan = legacyPlanData as LegacyVipPlan | null;
  const requests = (requestData ?? []) as RequestItem[];
  const members = (memberData ?? []) as Member[];
  const plans = (appPlanData ?? []) as AppPlanCatalogItem[];
  const assignments = (assignmentData ?? []) as AccountSubscription[];
  const legacyEntitlements = (legacyData ?? []) as LegacyEntitlement[];
  const subscriptionEvents = (eventData ?? []) as AccountSubscriptionEvent[];
  const memberMap = new Map(members.map((member) => [member.id, member]));
  const assignmentMap = new Map(assignments.map((assignment) => [assignment.user_id, assignment]));
  const legacyMap = new Map(legacyEntitlements.map((entitlement) => [entitlement.user_id, entitlement]));

  const proofLinks = new Map<string, string>();
  await Promise.all(requests.map(async (item) => {
    if (!item.proof_path) return;
    const { data } = await admin.storage.from("vip-payment-proofs").createSignedUrl(item.proof_path, 900);
    if (data?.signedUrl) proofLinks.set(item.id, data.signedUrl);
  }));

  return (
    <div className="admin-subscription-stack">
      <section className="admin-section admin-app-plans-section">
        <div className="admin-section__heading">
          <div>
            <span>PLANOS DO APLICATIVO</span>
            <h2><Layers3 size={22} /> Gratuito, Profissional e Premium</h2>
            <p>Configure teste e disponibilidade. Os recursos de cada nível permanecem definidos pela release para evitar liberações inconsistentes.</p>
          </div>
          <strong>{plans.filter((plan) => plan.is_active).length}</strong>
        </div>

        {appPlanError ? <p className="auth-message auth-message--error">Execute a migration 1.17.0: {appPlanError.message}</p> : null}

        <div className="admin-app-plan-grid">
          {plans.map((plan) => (
            <form className={`admin-app-plan-card admin-app-plan-card--${plan.code}`} action={updateAppPlanCatalogAction} key={plan.code}>
              <input type="hidden" name="planCode" value={plan.code} />
              <header>
                <div>{plan.code === "premium" ? <Sparkles size={22} /> : <Layers3 size={22} />}</div>
                <span>{plan.name}</span>
                <b>{plan.features.length} recursos</b>
              </header>
              <label><span>Descrição pública</span><textarea name="description" rows={4} defaultValue={plan.description} maxLength={500} required /></label>
              <label><span>Dias de teste</span><input name="trialDays" type="number" min={0} max={90} defaultValue={plan.trial_days} required /></label>
              <label className="admin-checkbox-row"><input name="isActive" type="checkbox" defaultChecked={plan.is_active} disabled={plan.code === "free"} /><span>Disponível para novas ativações</span></label>
              <button className="button button--secondary" type="submit"><CheckCircle2 size={16} /> Salvar plano</button>
            </form>
          ))}
        </div>
      </section>

      <section className="admin-section admin-account-plan-members">
        <div className="admin-section__heading">
          <div>
            <span>CONTROLE DE ACESSO</span>
            <h2><UserRoundCog size={22} /> Planos por membro</h2>
            <p>Faça upgrade, downgrade, teste, renovação ou suspensão. Administradores nunca são bloqueados pelos planos.</p>
          </div>
          <strong>{assignments.length}</strong>
        </div>

        {assignmentError ? <p className="auth-message auth-message--error">Execute a migration 1.17.0: {assignmentError.message}</p> : null}

        <div className="admin-account-plan-list">
          {members.map((member) => {
            const assignment = assignmentMap.get(member.id);
            const legacy = legacyMap.get(member.id);
            const defaultPlan = assignment?.plan_code ?? (member.role === "admin" || legacy ? "premium" : "free");
            const defaultStatus = assignment?.status ?? "active";
            const trialDays = plans.find((plan) => plan.code === defaultPlan)?.trial_days ?? 14;
            return (
              <details className="admin-account-plan-member" key={member.id}>
                <summary>
                  <div className="admin-account-plan-member__identity">
                    <span>{(member.full_name || member.email).slice(0, 2).toUpperCase()}</span>
                    <div><strong>{member.full_name || "Nome não informado"}</strong><small>{member.email}</small></div>
                  </div>
                  <div className="admin-account-plan-member__status">
                    <span className={`account-plan-badge account-plan-badge--${defaultPlan}`}>{planSourceLabel(member, assignment, legacy)}</span>
                  </div>
                </summary>

                <form className="admin-form admin-account-assignment-form" action={setAccountSubscriptionAction}>
                  <input type="hidden" name="userId" value={member.id} />
                  <div className="admin-form-grid">
                    <label><span>Plano</span><select name="planCode" defaultValue={defaultPlan}>{PLAN_CODES.map((code) => <option value={code} key={code}>{ACCOUNT_PLAN_LABELS[code]}</option>)}</select></label>
                    <label><span>Status</span><select name="status" defaultValue={defaultStatus}>{SUBSCRIPTION_STATUSES.map((status) => <option value={status} key={status}>{ACCOUNT_STATUS_LABELS[status]}</option>)}</select></label>
                    <label><span>Início</span><input name="startsAt" type="date" defaultValue={inputDate(assignment?.starts_at) || new Date().toISOString().slice(0, 10)} /></label>
                    <label><span>Validade</span><input name="expiresAt" type="date" defaultValue={inputDate(assignment?.expires_at)} /></label>
                    <label><span>Fim do teste</span><input name="trialEndsAt" type="date" defaultValue={inputDate(assignment?.trial_ends_at) || dateInputAfter(trialDays)} /></label>
                  </div>
                  <label className="admin-checkbox-row"><input name="noExpiry" type="checkbox" defaultChecked={!assignment?.expires_at} /><span>Sem validade definida</span></label>
                  <label><span>Observação administrativa</span><textarea name="notes" rows={3} maxLength={600} defaultValue={assignment?.notes ?? ""} placeholder="Motivo do teste, cortesia, upgrade ou suspensão." /></label>
                  <div className="admin-review-buttons">
                    <button className="button button--primary" type="submit"><BadgeCheck size={16} /> Salvar acesso</button>
                    {assignment ? (
                      <ConfirmSubmitButton className="button button--danger" formAction={clearAccountSubscriptionAction} message="Remover a configuração deste plano e voltar à regra padrão da conta?">
                        <PauseCircle size={16} /> Limpar configuração
                      </ConfirmSubmitButton>
                    ) : null}
                  </div>
                </form>
              </details>
            );
          })}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>HISTÓRICO</span><h2><CalendarClock size={22} /> Alterações de planos</h2><p>Registro administrativo de testes, upgrades, downgrades, renovações e suspensões.</p></div>
          <strong>{subscriptionEvents.length}</strong>
        </div>
        <div className="admin-subscription-history-list">
          {subscriptionEvents.length ? subscriptionEvents.map((event) => {
            const member = memberMap.get(event.user_id);
            return (
              <article key={event.id}>
                <div><strong>{member?.full_name || member?.email || event.user_id}</strong><small>{formatBrazilDateTime(event.created_at)}</small></div>
                <span>{event.old_plan_code ? ACCOUNT_PLAN_LABELS[event.old_plan_code] : "Sem configuração"} → {event.new_plan_code ? ACCOUNT_PLAN_LABELS[event.new_plan_code] : "Regra padrão"}</span>
                <b>{event.event_type.replaceAll("_", " ")}</b>
                {event.notes ? <p>{event.notes}</p> : null}
              </article>
            );
          }) : <p>Nenhuma alteração de plano registrada.</p>}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div>
            <span>VIP LEGADO E PAGAMENTO MANUAL</span>
            <h2><Settings2 size={22} /> Configuração do plano VIP</h2>
            <p>O fluxo atual de VIP, Pix e link de assinatura continua funcionando e é preservado como Premium enquanto o acesso estiver ativo.</p>
          </div>
          <strong>{money(legacyPlan?.price_cents ?? 0)}</strong>
        </div>

        <div className="admin-payment-guidance">
          <CreditCard size={22} />
          <div>
            <strong>Sem gateway integrado nesta versão</strong>
            <p>Use o fluxo manual existente. A aprovação de um pedido VIP mantém o acesso Premium por compatibilidade até que uma configuração específica seja aplicada ao membro.</p>
          </div>
        </div>

        <form className="admin-form admin-plan-form" action={updateVipPlanSettingsAction}>
          <div className="admin-form-grid">
            <label><span>Nome do plano</span><input name="planName" defaultValue={legacyPlan?.plan_name ?? "JNE App VIP"} required maxLength={100} /></label>
            <label><span>Valor exibido</span><input name="price" defaultValue={((legacyPlan?.price_cents ?? 990) / 100).toFixed(2).replace(".", ",")} inputMode="decimal" required /></label>
            <label><span>Validade padrão após aprovação</span><input name="billingDays" type="number" min={1} max={366} defaultValue={legacyPlan?.billing_days ?? 30} required /></label>
            <label><span>Link recorrente de pagamento</span><input name="recurringPaymentLink" type="url" placeholder="https://..." defaultValue={legacyPlan?.recurring_payment_link ?? ""} /></label>
          </div>
          <label><span>Descrição pública</span><textarea name="description" rows={4} required maxLength={600} defaultValue={legacyPlan?.description ?? ""} /></label>

          <fieldset className="admin-plan-pix-fieldset">
            <legend>Pix manual</legend>
            <label className="admin-checkbox-row"><input name="pixEnabled" type="checkbox" defaultChecked={legacyPlan?.pix_enabled ?? false} /><span>Disponibilizar Pix no aplicativo</span></label>
            <div className="admin-form-grid">
              <label><span>Tipo de chave</span><select name="pixKeyType" defaultValue={legacyPlan?.pix_key_type ?? "random"}><option value="random">Aleatória</option><option value="email">E-mail</option><option value="phone">Telefone</option><option value="cpf">CPF</option><option value="cnpj">CNPJ</option></select></label>
              <label><span>Chave Pix</span><input name="pixKey" defaultValue={legacyPlan?.pix_key ?? ""} /></label>
              <label><span>Nome do titular</span><input name="pixHolderName" defaultValue={legacyPlan?.pix_holder_name ?? ""} /></label>
            </div>
            <label><span>Instruções adicionais</span><textarea name="pixInstructions" rows={3} defaultValue={legacyPlan?.pix_instructions ?? ""} /></label>
          </fieldset>

          <label className="admin-checkbox-row"><input name="isActive" type="checkbox" defaultChecked={legacyPlan?.is_active ?? true} /><span>Plano disponível para novos pedidos</span></label>
          <button className="button button--primary" type="submit"><CheckCircle2 size={17} /> Salvar configuração</button>
        </form>
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>PAGAMENTOS</span><h2><CreditCard size={22} /> Pedidos de assinatura</h2></div>
          <strong>{requests.filter((item) => item.status === "pending").length}</strong>
        </div>
        {error ? <p className="auth-message auth-message--error">{error.message}</p> : null}

        <div className="admin-subscription-request-list">
          {requests.length ? requests.map((item) => {
            const member = memberMap.get(item.user_id);
            const isPending = item.status === "pending";
            return (
              <article className={`admin-subscription-request admin-subscription-request--${item.status}`} key={item.id}>
                <div className="admin-subscription-request__heading">
                  <div>
                    <span>{item.payment_method === "pix" ? "PIX" : "LINK DE ASSINATURA"}</span>
                    <h3>{member?.full_name || "Nome não informado"}</h3>
                    <p>{member?.email || item.user_id}</p>
                  </div>
                  <div><strong>{money(item.amount_cents)}</strong><small>{formatBrazilDateTime(item.created_at)}</small></div>
                </div>

                <div className="admin-subscription-request__details">
                  <p><strong>Referência:</strong> {item.payment_reference || "Não informada"}</p>
                  {item.notes ? <p><strong>Observação:</strong> {item.notes}</p> : null}
                  {proofLinks.get(item.id) ? <a className="button button--secondary button--compact" href={proofLinks.get(item.id)} target="_blank" rel="noopener noreferrer"><FileText size={15} /> Abrir comprovante <ExternalLink size={13} /></a> : null}
                  {!isPending ? <p><strong>Status:</strong> {item.status === "approved" ? "Aprovado" : item.status === "rejected" ? "Rejeitado" : "Cancelado"}{item.admin_notes ? ` — ${item.admin_notes}` : ""}</p> : null}
                </div>

                {isPending ? (
                  <form className="admin-subscription-review-form" action={reviewSubscriptionRequestAction}>
                    <input type="hidden" name="requestId" value={item.id} />
                    <label><span>Validade do VIP</span><input name="expiresAt" type="date" lang="pt-BR" defaultValue={dateInputAfter(legacyPlan?.billing_days ?? 30)} /></label>
                    <label className="admin-checkbox-row"><input name="noExpiry" type="checkbox" /><span>Sem validade</span></label>
                    <label><span>Nota administrativa</span><input name="notes" placeholder="Opcional" maxLength={300} /></label>
                    <div className="admin-review-buttons">
                      <button className="button button--primary" type="submit" name="decision" value="approve"><CheckCircle2 size={16} /> Aprovar e liberar Premium</button>
                      <ConfirmSubmitButton className="button button--danger" name="decision" value="reject" message="Rejeitar este pedido de assinatura?"><XCircle size={16} /> Rejeitar</ConfirmSubmitButton>
                    </div>
                  </form>
                ) : null}
              </article>
            );
          }) : <p>Nenhum pedido de assinatura recebido.</p>}
        </div>
      </section>
    </div>
  );
}
