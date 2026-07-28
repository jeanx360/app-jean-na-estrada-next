import type { Metadata } from "next";
import {
  AlertTriangle,
  CloudDownload,
  ExternalLink,
  FileText,
  PlayCircle,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { tutorials, type TutorialResource } from "@/data/content";

export const metadata: Metadata = { title: "Guias e tutoriais" };

const resourceIcons: Record<TutorialResource["kind"], typeof PlayCircle> = {
  video: PlayCircle,
  pdf: FileText,
  drive: CloudDownload,
};

export default function TutorialsPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="APRENDA NA PRÁTICA"
        title="Guias e tutoriais"
        description="Vídeo, instruções e arquivos de apoio organizados por veículo, sem deixar o usuário procurando links espalhados."
      />

      <section className="tutorial-list" aria-label="Tutoriais disponíveis">
        {tutorials.map((tutorial) => (
          <article className="tutorial-card" key={tutorial.slug}>
            <div className="tutorial-card__header">
              <div className="tutorial-card__icon">
                <Wrench size={25} />
              </div>
              <div>
                <div className="content-badges">
                  <span>{tutorial.vehicle}</span>
                  <span>{tutorial.level}</span>
                  <span className="content-badge--success">{tutorial.status}</span>
                </div>
                <h2>{tutorial.title}</h2>
                <p>{tutorial.description}</p>
              </div>
            </div>

            <div className="resource-list">
              {tutorial.resources.map((resource) => {
                const Icon = resourceIcons[resource.kind];

                return (
                  <a
                    className="resource-item"
                    href={resource.href}
                    target="_blank"
                    rel="noreferrer"
                    key={resource.label}
                  >
                    <span className={`resource-item__icon resource-item__icon--${resource.kind}`}>
                      <Icon size={21} />
                    </span>
                    <span className="resource-item__copy">
                      <strong>{resource.label}</strong>
                      <small>{resource.description}</small>
                    </span>
                    <ExternalLink size={17} />
                  </a>
                );
              })}
            </div>

            <div className="warning-strip">
              <AlertTriangle size={19} />
              <p>
                Altere apenas configurações que você compreenda. Procedimentos na central multimídia podem afetar o funcionamento do sistema e são realizados por responsabilidade do usuário.
              </p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
