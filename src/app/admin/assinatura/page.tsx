import type { Metadata } from "next";
import { CheckCircle2, CreditCard, ExternalLink, FileText, Settings2, XCircle } from "lucide-react";
import {
  reviewSubscriptionRequestAction,
  updateVipPlanSettingsAction,
} from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBrazilDateTime } from "@/lib/date-time";

export const metadata: Metadata = { title: "Assinatura VIP" };

type Plan = {
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

type Member = { id: string; email: string; full_name: string | null };

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function dateInputAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function AdminSubscriptionPage() {
  const { supabase } = await requireAdmin();
  const admin = createAdminClient();

  const [{ data: planData }, { data: requestData, error }, { data: memberData }] = await Promise.all([
    supabase.from("vip_plan_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("vip_subscription_requests").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.rpc("admin_list_members"),
  ]);

  const plan = planData as Plan | null;
  const requests = (requestData ?? []) as RequestItem[];
  const members = (memberData ?? []) as Member[];
  const memberMap = new Map(members.map((member) => [member.id, member]));

  const proofLinks = new Map<string, string>();
  await Promise.all(requests.map(async (item) => {
    if (!item.proof_path) return;
    const { data } = await admin.storage.from("vip-payment-proofs").createSignedUrl(item.proof_path, 900);
    if (data?.signedUrl) proofLinks.set(item.id, data.signedUrl);
  }));

  return (
    <div className="admin-subscription-stack">
      <section className="admin-section">
        <div className="admin-section__heading">
          <div>
            <span>MONETIZAÇÃO</span>
            <h2><Settings2 size={22} /> Configuração do plano VIP</h2>
            <p>O valor e o link exibidos no JNE App são controlados aqui.</p>
          </div>
          <strong>{money(plan?.price_cents ?? 0)}</strong>
        </div>

        <div className="admin-payment-guidance">
          <CreditCard size={22} />
          <div>
            <strong>Estratégia recomendada nesta fase</strong>
            <p>Use um Plano de Assinatura do Mercado Pago como opção principal e Pix manual como alternativa. Alterar o valor aqui não altera automaticamente o plano no provedor; atualize os dois locais.</p>
          </div>
        </div>

        <form className="admin-form admin-plan-form" action={updateVipPlanSettingsAction}>
          <div className="admin-form-grid">
            <label><span>Nome do plano</span><input name="planName" defaultValue={plan?.plan_name ?? "JNE App VIP"} required maxLength={100} /></label>
            <label><span>Valor exibido</span><input name="price" defaultValue={((plan?.price_cents ?? 990) / 100).toFixed(2).replace(".", ",")} inputMode="decimal" required /></label>
            <label><span>Validade padrão após aprovação</span><input name="billingDays" type="number" min={1} max={366} defaultValue={plan?.billing_days ?? 30} required /></label>
            <label><span>Link recorrente de pagamento</span><input name="recurringPaymentLink" type="url" placeholder="https://..." defaultValue={plan?.recurring_payment_link ?? ""} /></label>
          </div>
          <label><span>Descrição pública</span><textarea name="description" rows={4} required maxLength={600} defaultValue={plan?.description ?? ""} /></label>

          <fieldset className="admin-plan-pix-fieldset">
            <legend>Pix manual</legend>
            <label className="admin-checkbox-row"><input name="pixEnabled" type="checkbox" defaultChecked={plan?.pix_enabled ?? false} /><span>Disponibilizar Pix no aplicativo</span></label>
            <div className="admin-form-grid">
              <label><span>Tipo de chave</span><select name="pixKeyType" defaultValue={plan?.pix_key_type ?? "random"}><option value="random">Aleatória</option><option value="email">E-mail</option><option value="phone">Telefone</option><option value="cpf">CPF</option><option value="cnpj">CNPJ</option></select></label>
              <label><span>Chave Pix</span><input name="pixKey" defaultValue={plan?.pix_key ?? ""} /></label>
              <label><span>Nome do titular</span><input name="pixHolderName" defaultValue={plan?.pix_holder_name ?? ""} /></label>
            </div>
            <label><span>Instruções adicionais</span><textarea name="pixInstructions" rows={3} defaultValue={plan?.pix_instructions ?? ""} /></label>
          </fieldset>

          <label className="admin-checkbox-row"><input name="isActive" type="checkbox" defaultChecked={plan?.is_active ?? true} /><span>Plano disponível para novos pedidos</span></label>
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
                    <label><span>Validade do VIP (dd/mm/aaaa)</span><input name="expiresAt" type="date" lang="pt-BR" defaultValue={dateInputAfter(plan?.billing_days ?? 30)} /></label>
                    <label className="admin-checkbox-row"><input name="noExpiry" type="checkbox" /><span>Sem validade</span></label>
                    <label><span>Nota administrativa</span><input name="notes" placeholder="Opcional" maxLength={300} /></label>
                    <div className="admin-review-buttons">
                      <button className="button button--primary" type="submit" name="decision" value="approve"><CheckCircle2 size={16} /> Aprovar e liberar VIP</button>
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
