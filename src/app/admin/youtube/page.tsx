import type { Metadata } from "next";
import Link from "next/link";
import { PauseCircle, UsersRound } from "lucide-react";

export const metadata: Metadata = { title: "Integração do YouTube pausada" };

export default function PausedYouTubeIntegrationPage() {
  return (
    <section className="admin-section">
      <div className="admin-section__heading">
        <div>
          <span>INTEGRAÇÃO PAUSADA</span>
          <h2><PauseCircle size={22} /> Sincronização automática do YouTube</h2>
        </div>
      </div>
      <div className="admin-payment-guidance">
        <PauseCircle size={22} />
        <div>
          <strong>O acesso automático foi desativado nesta versão</strong>
          <p>Cadastre os membros do canal manualmente, com validade mensal ou sem validade, pelo gerenciamento de membros.</p>
        </div>
      </div>
      <Link className="button button--primary" href="/admin/membros"><UsersRound size={17} /> Gerenciar membros e VIP</Link>
    </section>
  );
}
