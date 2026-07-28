import Link from "next/link";
import type { ReactNode } from "react";

export type LegalSection = {
  title: string;
  content: ReactNode;
};

export function LegalDocument({
  version,
  updatedAt,
  sections,
}: {
  version: string;
  updatedAt: string;
  sections: LegalSection[];
}) {
  return (
    <article className="legal-document">
      <div className="legal-document__meta">
        <span>Versão {version}</span>
        <span>Atualizado em {updatedAt}</span>
      </div>
      {sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <div>{section.content}</div>
        </section>
      ))}
      <div className="legal-document__links">
        <Link href="/termos">Termos de Uso</Link>
        <Link href="/privacidade">Privacidade</Link>
        <Link href="/seguranca-apks">Segurança de APKs</Link>
        <Link href="/contato">Contato</Link>
      </div>
    </article>
  );
}
