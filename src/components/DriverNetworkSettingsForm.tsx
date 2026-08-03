import { CheckCircle2, Eye, MessageCircle, Save, ShieldCheck, UsersRound } from "lucide-react";
import { saveDriverNetworkSettingsAction } from "@/app/motorista/rede/actions";
import {
  DRIVER_NETWORK_ACCESSIBILITY_FEATURES,
  DRIVER_NETWORK_ACCESSIBILITY_LABELS,
  DRIVER_NETWORK_SERVICE_LABELS,
  DRIVER_NETWORK_SERVICE_TYPES,
  DRIVER_NETWORK_VERIFICATION_LABELS,
  type DriverNetworkSettings,
} from "@/lib/driver-network";

export function DriverNetworkSettingsForm({ settings }: { settings: DriverNetworkSettings | null }) {
  const active = settings?.opted_in ?? false;
  const verificationStatus = settings?.verification_status ?? "pending";
  const serviceTypes = new Set(settings?.service_types ?? []);
  const accessibility = new Set(settings?.accessibility_features ?? []);

  return (
    <form className="driver-network-settings" action={saveDriverNetworkSettingsAction}>
      <div className="driver-network-settings__heading">
        <div>
          <span className="eyebrow">PARTICIPAÇÃO OPCIONAL</span>
          <h2>Seu perfil na rede</h2>
          <p>Você decide se deseja aparecer no diretório e receber indicações de outros motoristas.</p>
        </div>
        <span className={`driver-network-verification driver-network-verification--${verificationStatus}`}>
          {verificationStatus === "verified" ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
          {DRIVER_NETWORK_VERIFICATION_LABELS[verificationStatus]}
        </span>
      </div>

      {settings?.verification_notes ? (
        <p className="driver-network-settings__notice">Observação da verificação: {settings.verification_notes}</p>
      ) : null}

      <div className="driver-network-toggle-grid">
        <label className="driver-network-toggle-card">
          <div><Eye size={20} /><span><strong>Aparecer no diretório</strong><small>Seu cartão profissional precisa estar publicado.</small></span></div>
          <input type="checkbox" name="optedIn" defaultChecked={active} />
        </label>
        <label className="driver-network-toggle-card">
          <div><UsersRound size={20} /><span><strong>Receber indicações</strong><small>Outros motoristas poderão encaminhar reservas com autorização do passageiro.</small></span></div>
          <input type="checkbox" name="acceptsReferrals" defaultChecked={settings?.accepts_referrals ?? true} />
        </label>
        <label className="driver-network-toggle-card">
          <div><MessageCircle size={20} /><span><strong>Compartilhar WhatsApp com motoristas</strong><small>O número aparece apenas para motoristas autenticados da rede.</small></span></div>
          <input type="checkbox" name="shareContact" defaultChecked={settings?.share_contact_with_network ?? false} />
        </label>
      </div>

      <div className="driver-network-field-grid">
        <label className="driver-network-field-grid__full">
          <span>Região principal de atendimento</span>
          <input name="region" maxLength={120} defaultValue={settings?.region ?? ""} placeholder="Ex.: Porto Alegre, Região Metropolitana e Serra Gaúcha" />
        </label>
        <fieldset className="driver-network-field-grid__full">
          <legend>Tipos de serviço</legend>
          <div className="driver-network-check-grid">
            {DRIVER_NETWORK_SERVICE_TYPES.map((item) => (
              <label key={item}><input type="checkbox" name="serviceTypes" value={item} defaultChecked={serviceTypes.has(item)} /><span>{DRIVER_NETWORK_SERVICE_LABELS[item]}</span></label>
            ))}
          </div>
        </fieldset>
        <fieldset className="driver-network-field-grid__full">
          <legend>Acessibilidade e apoio</legend>
          <div className="driver-network-check-grid">
            {DRIVER_NETWORK_ACCESSIBILITY_FEATURES.map((item) => (
              <label key={item}><input type="checkbox" name="accessibilityFeatures" value={item} defaultChecked={accessibility.has(item)} /><span>{DRIVER_NETWORK_ACCESSIBILITY_LABELS[item]}</span></label>
            ))}
          </div>
        </fieldset>
        <label className="driver-network-field-grid__full">
          <span>Apresentação para outros motoristas</span>
          <textarea name="networkNote" rows={4} maxLength={320} defaultValue={settings?.network_note ?? ""} placeholder="Ex.: Atendo viagens para aeroportos e cidades da Serra. Disponibilidade mediante confirmação." />
        </label>
      </div>

      <div className="driver-network-settings__privacy">
        <ShieldCheck size={21} />
        <p>Dados do passageiro só podem ser enviados após confirmação expressa. O JNE App registra a indicação, mas não distribui corridas automaticamente e não cobra comissão.</p>
      </div>

      <button className="button button--primary" type="submit"><Save size={18} /> Salvar participação</button>
    </form>
  );
}
