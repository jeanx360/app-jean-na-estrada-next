import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BatteryCharging,
  Car,
  CheckCircle2,
  Gauge,
  Plug,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { beginnerGuide } from "@/data/content";

export const metadata: Metadata = { title: "Guia do iniciante" };

const icons = [Car, Plug, Gauge, BatteryCharging, ShieldCheck];

export default function BeginnerGuidePage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="COMECE PELO ESSENCIAL"
        title="Guia do iniciante em carros elétricos"
        description="Uma visão prática para entender funcionamento, recarga, custos, bateria e compra de um veículo elétrico."
      />

      <section className="guide-intro">
        <div>
          <span>SEM COMPLICAÇÃO</span>
          <h2>Você não precisa dominar engenharia para fazer uma boa escolha.</h2>
          <p>
            Comece pelos conceitos que afetam sua rotina. Depois aprofunde apenas o que realmente importa para o modelo e o tipo de uso que você está avaliando.
          </p>
        </div>
        <Link className="button button--primary" href="/calculadora">
          Comparar custos
          <ArrowRight size={17} />
        </Link>
      </section>

      <section className="guide-grid" aria-label="Tópicos do guia do iniciante">
        {beginnerGuide.map((section, index) => {
          const Icon = icons[index] ?? Car;
          return (
            <article className="guide-card" key={section.title}>
              <div className="guide-card__icon"><Icon size={24} /></div>
              <div>
                <span>PASSO {String(index + 1).padStart(2, "0")}</span>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
              </div>
              <ul>
                {section.points.map((point) => (
                  <li key={point}><CheckCircle2 size={16} /> {point}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <section className="info-panel">
        <div>
          <span>CONTEÚDO EM EVOLUÇÃO</span>
          <h2>O guia será transformado em uma biblioteca completa.</h2>
          <p>
            Nas próximas versões, cada tema poderá ganhar uma página própria, vídeos relacionados, perguntas frequentes e materiais para download.
          </p>
        </div>
      </section>
    </div>
  );
}
