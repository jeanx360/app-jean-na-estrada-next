import Link from "next/link";
import { ArrowRight, MessageCircle, Send, ShieldCheck, UsersRound } from "lucide-react";
import { createDriverReferralAction } from "@/app/motorista/rede/actions";
import { driverNetworkWhatsAppUrl, type DriverNetworkMember } from "@/lib/driver-network";

export function DriverReferralForm({
  reservationId,
  members,
  networkEnabled,
}: {
  reservationId: string;
  members: DriverNetworkMember[];
  networkEnabled: boolean;
}) {
  if (!networkEnabled) {
    return (
      <section className="driver-referral-card driver-referral-card--locked">
        <div><UsersRound size={24} /><span><small>REDE DE MOTORISTAS</small><strong>Indique esta corrida com segurança</strong></span></div>
        <p>O plano Premium libera a rede verificada, o histórico de indicações e o encaminhamento autorizado de reservas.</p>
        <Link className="button button--secondary" href={`/planos?feature=driver_network&next=/motorista/reservas/${reservationId}`}>Conhecer o Premium <ArrowRight size={17} /></Link>
      </section>
    );
  }

  if (!members.length) {
    return (
      <section className="driver-referral-card">
        <div><UsersRound size={24} /><span><small>REDE DE MOTORISTAS</small><strong>Nenhum motorista disponível</strong></span></div>
        <p>Ative e conclua a verificação do seu perfil na rede para encaminhar reservas.</p>
        <Link className="button button--secondary" href="/motorista/rede">Configurar minha participação</Link>
      </section>
    );
  }

  return (
    <section className="driver-referral-card">
      <div><UsersRound size={24} /><span><small>REDE DE MOTORISTAS</small><strong>Indicar esta corrida</strong></span></div>
      <p>Escolha um motorista verificado. Os dados do passageiro serão compartilhados somente após sua confirmação abaixo.</p>
      <form action={createDriverReferralAction}>
        <input type="hidden" name="reservationId" value={reservationId} />
        <label><span>Motorista indicado</span><select name="recipientUserId" required defaultValue=""><option value="" disabled>Selecione um motorista</option>{members.filter((member) => member.accepts_referrals).map((member) => <option key={member.user_id} value={member.user_id}>{member.display_name} · {member.city || member.region || "região não informada"} · {member.vehicle_name || "veículo não informado"}</option>)}</select></label>
        <label><span>Mensagem para o motorista</span><textarea name="senderMessage" rows={3} maxLength={500} placeholder="Informe algum detalhe importante sobre a corrida." /></label>
        <label className="driver-referral-consent"><input type="checkbox" name="consentConfirmed" required /><span><ShieldCheck size={18} /><strong>Confirmo que o passageiro autorizou o compartilhamento do nome, telefone e dados desta viagem com o motorista selecionado.</strong></span></label>
        <button className="button button--primary" type="submit"><Send size={17} /> Enviar indicação</button>
      </form>
      <div className="driver-referral-contact-list">
        {members.filter((member) => member.whatsapp_phone).slice(0, 3).map((member) => {
          const whatsappUrl = driverNetworkWhatsAppUrl(member.whatsapp_phone, member.display_name);
          return whatsappUrl ? <a key={member.user_id} href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Falar com {member.display_name}</a> : null;
        })}
      </div>
    </section>
  );
}
