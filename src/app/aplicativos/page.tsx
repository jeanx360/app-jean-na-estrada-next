import type { Metadata } from "next";
import {
  AlertTriangle,
  CloudDownload,
  ExternalLink,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { getApplications } from "@/lib/public-content";

export const metadata: Metadata = { title: "Aplicativos" };

export const dynamic = "force-dynamic";

export default async function AppsPage() {
  const applications = await getApplications();

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="APLICATIVOS AUTOMOTIVOS"
        title="Aplicativos para carros"
        description="Arquivos de apoio organizados com identificação de compatibilidade, origem e alertas antes do acesso."
      />

      <section className="apps-grid" aria-label="Aplicativos disponíveis">
        {applications.map((application) => (
          <article className="app-card" key={application.name}>
            <div className="app-card__topline">
              <span className="app-card__icon">
                <PackageCheck size={24} />
              </span>
              <span className="status-pill">{application.status}</span>
            </div>
            <h2>{application.name}</h2>
            <p>{application.description}</p>
            <dl>
              <div>
                <dt>Compatibilidade informada</dt>
                <dd>{application.compatibility}</dd>
              </div>
              <div>
                <dt>Origem</dt>
                <dd>Conteúdo cadastrado no JNE App</dd>
              </div>
            </dl>
            <a
              className="button button--primary app-card__action"
              href={application.href}
              target="_blank"
              rel="noreferrer"
            >
              <CloudDownload size={17} />
              Abrir pasta de arquivos
              <ExternalLink size={15} />
            </a>
          </article>
        ))}
      </section>

      <section className="security-panel">
        <div className="security-panel__icon">
          <ShieldCheck size={28} />
        </div>
        <div>
          <span>SEGURANÇA PRIMEIRO</span>
          <h2>Esta ainda é uma área de arquivos externos.</h2>
          <p>
            Antes do lançamento oficial, vamos registrar versão, tamanho, checksum SHA-256, origem, compatibilidade testada e histórico de atualização de cada arquivo.
          </p>
        </div>
      </section>

      <div className="warning-strip warning-strip--large">
        <AlertTriangle size={20} />
        <p>
          Instale somente aplicativos cuja origem e finalidade você conheça. O uso de arquivos de terceiros pode causar falhas, perda de configurações ou incompatibilidade com a central do veículo.
        </p>
      </div>
    </div>
  );
}
