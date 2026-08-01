import type { Metadata } from "next";
import { ExternalLink, Handshake } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { getPartners } from "@/lib/public-content";
import { publicPath } from "@/lib/public-path";

export const metadata: Metadata = { title: "Parceiros" };

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const partners = await getPartners();

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="REDE DE CONFIANÇA"
        title="Parceiros oficiais"
        description="Empresas e profissionais que apoiam o Jean na Estrada e oferecem serviços relevantes para a comunidade automotiva."
      />

      <section className="partner-list" aria-label="Parceiros cadastrados">
        {partners.map((partner) => (
          <article className="partner-card" key={partner.name}>
            <div className="partner-card__banner">
              <img
                src={/^https?:\/\//i.test(partner.image) ? partner.image : publicPath(partner.image)}
                alt={`Banner do parceiro ${partner.name}`}
                loading="lazy"
              />
            </div>
            <div className="partner-card__body">
              <div className="partner-card__title">
                <span><Handshake size={21} /></span>
                <div>
                  <h2>{partner.name}</h2>
                  <p>{partner.description}</p>
                </div>
              </div>
              <div className="partner-card__services">
                {partner.services.map((service) => (
                  <span key={service}>{service}</span>
                ))}
              </div>
              <a
                className="button button--secondary"
                href={partner.href}
                target="_blank"
                rel="noreferrer"
              >
                {partner.actionLabel}
                <ExternalLink size={16} />
              </a>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
