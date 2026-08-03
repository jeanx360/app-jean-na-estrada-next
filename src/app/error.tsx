"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="state-page">
      <AlertTriangle size={42} />
      <span>ALGO SAIU DO PLANEJADO</span>
      <h1>Não foi possível carregar esta área</h1>
      <p>Tente novamente. Se o problema continuar, confira sua conexão, atualize o aplicativo e consulte a Central de Ajuda.</p>
      <div className="state-page__actions">
        <button className="button button--primary" type="button" onClick={reset}><RefreshCw size={18} /> Tentar novamente</button>
        <Link className="button button--secondary" href="/suporte">Abrir ajuda</Link>
      </div>
    </section>
  );
}
