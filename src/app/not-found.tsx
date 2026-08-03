import Link from "next/link";
import { MapPinOff } from "lucide-react";

export default function NotFoundPage() {
  return (
    <section className="state-page">
      <MapPinOff size={42} />
      <span>ERRO 404</span>
      <h1>Essa rota não foi encontrada</h1>
      <p>O conteúdo pode ter sido movido, removido ou ainda não estar disponível.</p>
      <div className="state-page__actions">
        <Link className="button button--primary" href="/">Voltar ao início</Link>
        <Link className="button button--secondary" href="/suporte">Encontrar ajuda</Link>
      </div>
    </section>
  );
}
