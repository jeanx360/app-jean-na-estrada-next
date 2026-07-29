import type { Metadata } from "next";
import {
  BadgeCheck,
  CloudDownload,
  ExternalLink,
  FileArchive,
  Fingerprint,
  Globe2,
  LockKeyhole,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { getApplications } from "@/lib/public-content";

export const metadata: Metadata = {
  title: "Aplicativos",
  description: "Aplicativos automotivos hospedados no JNE App ou indicados por links externos.",
};

export const dynamic = "force-dynamic";

function formatFileSize(value?: number) {
  if (!value || value < 1) return null;
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
}

export default async function AppsPage() {
  const applications = await getApplications();

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="APLICATIVOS AUTOMOTIVOS"
        title="Aplicativos para carros"
        description="Arquivos hospedados no JNE App e aplicativos externos reunidos com versão, origem, compatibilidade e informações de segurança."
      />

      <section className="apps-grid" aria-label="Aplicativos disponíveis">
        {applications.map((application) => {
          const isUpload = application.deliveryType === "upload";
          const isVip = application.accessLevel === "vip";
          const size = formatFileSize(application.fileSize);
          return (
            <article className="app-card app-card--complete" key={application.id ?? application.name}>
              <div className="app-card__topline">
                {application.image ? (
                  <span className="app-card__image"><img src={application.image} alt="" /></span>
                ) : (
                  <span className="app-card__icon"><PackageCheck size={24} /></span>
                )}
                <div className="app-card__badges">
                  <span className="status-pill">{application.status}</span>
                  {isVip ? <span className="status-pill status-pill--vip"><LockKeyhole size={12} /> VIP</span> : null}
                </div>
              </div>

              <div className="app-card__heading">
                <div>
                  <span>{isUpload ? "ARQUIVO NO JNE APP" : "APLICATIVO EXTERNO"}</span>
                  <h2>{application.name}</h2>
                </div>
                {application.version ? <strong>v{application.version}</strong> : null}
              </div>
              <p>{application.description}</p>

              <dl>
                <div>
                  <dt>Compatibilidade informada</dt>
                  <dd>{application.compatibility}</dd>
                </div>
                <div>
                  <dt>Origem</dt>
                  <dd>{application.origin || "Origem não informada"}</dd>
                </div>
                <div>
                  <dt>Forma de acesso</dt>
                  <dd>{isUpload ? <><FileArchive size={14} /> Download pelo JNE App{size ? ` · ${size}` : ""}</> : <><Globe2 size={14} /> Site ou repositório externo</>}</dd>
                </div>
                {application.fileName ? (
                  <div>
                    <dt>Arquivo</dt>
                    <dd>{application.fileName}</dd>
                  </div>
                ) : null}
              </dl>

              {application.checksumSha256 ? (
                <details className="app-checksum">
                  <summary><Fingerprint size={15} /> Ver checksum SHA-256</summary>
                  <code>{application.checksumSha256}</code>
                </details>
              ) : null}

              <a
                className="button button--primary app-card__action"
                href={application.href}
                target="_blank"
                rel="noreferrer"
              >
                {isUpload ? <CloudDownload size={17} /> : <ExternalLink size={17} />}
                {application.buttonLabel || (isUpload ? "Baixar arquivo" : "Abrir aplicativo")}
              </a>
            </article>
          );
        })}
      </section>

      <section className="security-panel">
        <div className="security-panel__icon"><ShieldCheck size={28} /></div>
        <div>
          <span>CATÁLOGO ORGANIZADO</span>
          <h2>Arquivos próprios e fontes externas no mesmo lugar.</h2>
          <p>
            Cada item pode indicar versão, origem, compatibilidade, tamanho e checksum. Aplicativos externos abrem a página informada pelo administrador; arquivos hospedados são entregues por link temporário.
          </p>
        </div>
        <BadgeCheck size={25} />
      </section>
    </div>
  );
}
