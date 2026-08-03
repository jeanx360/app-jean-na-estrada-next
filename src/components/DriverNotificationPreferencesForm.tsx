"use client";

import { Bell as BellCog, LoaderCircle, Save } from "lucide-react";
import { useActionState } from "react";
import { updateDriverNotificationPreferencesAction } from "@/app/motorista/notificacoes/actions";
import type { DriverNotificationPreferences, NotificationActionState } from "@/types/notification";

const initialState: NotificationActionState = {};

const categories = [
  { name: "agendaEnabled", field: "agenda_enabled", label: "Agenda e reservas", description: "Reservas próximas e solicitações ainda não confirmadas." },
  { name: "customersEnabled", field: "customers_enabled", label: "Clientes", description: "Sugestões de acompanhamento para contatos inativos." },
  { name: "quotesEnabled", field: "quotes_enabled", label: "Orçamentos", description: "Avisos de vencimento e orçamentos sem resposta." },
  { name: "financeEnabled", field: "finance_enabled", label: "Financeiro", description: "Pagamentos pendentes e revisão mensal dos resultados." },
  { name: "networkEnabled", field: "network_enabled", label: "Rede de motoristas", description: "Indicações recebidas e oportunidades pendentes." },
  { name: "subscriptionEnabled", field: "subscription_enabled", label: "Assinatura", description: "Teste ou plano próximo do vencimento." },
  { name: "administrationEnabled", field: "administration_enabled", label: "Alterações administrativas", description: "Mudanças de plano, suspensão, renovação e liberação." },
] as const;

type Props = {
  preferences: DriverNotificationPreferences;
};

export function DriverNotificationPreferencesForm({ preferences }: Props) {
  const [state, action, pending] = useActionState(updateDriverNotificationPreferencesAction, initialState);

  return (
    <form className="driver-notification-preferences" action={action}>
      <header className="driver-notification-preferences__heading">
        <span><BellCog size={22} /></span>
        <div>
          <small>CONTROLE DO MOTORISTA</small>
          <h2>Preferências das automações</h2>
          <p>Desative apenas o que não ajuda na sua rotina. Nenhuma mensagem é enviada automaticamente ao passageiro.</p>
        </div>
      </header>

      <div className="driver-notification-preferences__categories">
        {categories.map((item) => (
          <label className="driver-notification-preference" key={item.name}>
            <input
              type="checkbox"
              name={item.name}
              defaultChecked={preferences[item.field]}
            />
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </label>
        ))}
      </div>

      <fieldset className="driver-notification-windows">
        <legend>Antecedência dos alertas</legend>
        <div>
          <label>
            <span>Reserva confirmada</span>
            <select name="reservationUpcomingHours" defaultValue={String(preferences.reservation_upcoming_hours)}>
              <option value="6">6 horas antes</option>
              <option value="12">12 horas antes</option>
              <option value="24">24 horas antes</option>
              <option value="48">48 horas antes</option>
              <option value="72">72 horas antes</option>
              <option value="168">7 dias antes</option>
            </select>
          </label>
          <label>
            <span>Reserva não confirmada</span>
            <select name="reservationUnconfirmedHours" defaultValue={String(preferences.reservation_unconfirmed_hours)}>
              <option value="12">12 horas antes</option>
              <option value="24">24 horas antes</option>
              <option value="48">48 horas antes</option>
              <option value="72">72 horas antes</option>
              <option value="168">7 dias antes</option>
              <option value="336">14 dias antes</option>
            </select>
          </label>
          <label>
            <span>Orçamento vencendo</span>
            <select name="quoteExpiringHours" defaultValue={String(preferences.quote_expiring_hours)}>
              <option value="12">12 horas antes</option>
              <option value="24">24 horas antes</option>
              <option value="48">48 horas antes</option>
              <option value="72">72 horas antes</option>
              <option value="168">7 dias antes</option>
              <option value="336">14 dias antes</option>
            </select>
          </label>
          <label>
            <span>Cliente sem contato</span>
            <select name="customerInactiveDays" defaultValue={String(preferences.customer_inactive_days)}>
              <option value="7">7 dias</option>
              <option value="15">15 dias</option>
              <option value="30">30 dias</option>
              <option value="45">45 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
              <option value="180">180 dias</option>
              <option value="365">365 dias</option>
            </select>
          </label>
        </div>
      </fieldset>

      {state.error ? <p className="auth-message auth-message--error">{state.error}</p> : null}
      {state.success ? <p className="auth-message auth-message--success">{state.success}</p> : null}

      <button className="button button--primary" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="is-spinning" size={17} /> : <Save size={17} />}
        {pending ? "Salvando..." : "Salvar preferências"}
      </button>
    </form>
  );
}
