import Link from "next/link";
import { ArrowRight, Construction } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: Array<{ title: string; description: string }>;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  items,
}: PlaceholderPageProps) {
  return (
    <div className="page-stack">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <section className="placeholder-grid" aria-label={`Estrutura de ${title}`}>
        {items.map((item, index) => (
          <article className="placeholder-card" key={item.title}>
            <span className="placeholder-card__number">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="construction-panel">
        <div className="construction-panel__icon">
          <Construction size={26} />
        </div>
        <div>
          <span>PRÓXIMA ETAPA</span>
          <h2>Essa área já tem estrutura visual e receberá os dados reais.</h2>
          <p>
            Nesta primeira versão estamos validando navegação, identidade, responsividade e organização do projeto.
          </p>
        </div>
        <Link href="/" className="button button--secondary">
          Voltar ao início
          <ArrowRight size={17} />
        </Link>
      </section>
    </div>
  );
}
