import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BatteryCharging,
  BookOpenCheck,
  Car,
  CheckCircle2,
  ChevronDown,
  Gauge,
  BookOpenText,
  Plug,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { VehicleManualLibrary } from "@/components/VehicleManualLibrary";
import { beginnerGuide } from "@/data/content";
import { getAuthContext } from "@/lib/auth";
import { getVehicleLibrary } from "@/lib/vehicle-library";

export const metadata: Metadata = {
  title: "Guia e manuais",
  description: "Guia do iniciante e biblioteca de manuais por marca, veículo e ano.",
};

export const dynamic = "force-dynamic";

const icons = [Car, Plug, Gauge, BatteryCharging, ShieldCheck];

type Props = {
  searchParams: Promise<{ marca?: string; modelo?: string; ano?: string }>;
};

export default async function BeginnerGuidePage({ searchParams }: Props) {
  const [brands, auth, selection] = await Promise.all([getVehicleLibrary(), getAuthContext(), searchParams]);
  const canAccessVip = auth.profile?.role === "vip" || auth.profile?.role === "admin";

  return (
    <div className="page-stack guide-manual-page">
      <PageHeader
        icon={<BookOpenCheck size={24} />}
        eyebrow="APRENDA E CONSULTE"
        title="Guia do iniciante e biblioteca do veículo"
        description="Entenda os fundamentos dos carros elétricos e encontre manuais organizados por marca, modelo e ano."
      />

      <details className="beginner-guide-disclosure">
        <summary className="beginner-guide-disclosure__summary">
          <div className="beginner-guide-disclosure__icon" aria-hidden="true">
            <BookOpenCheck size={27} />
          </div>

          <div className="beginner-guide-disclosure__copy">
            <span>GUIA PARA INICIANTES EM CARROS ELÉTRICOS</span>
            <h2>Começou agora? Abra o guia essencial.</h2>
            <p>
              Consulte os fundamentos sobre funcionamento, recarga, custos, bateria e avaliação de um elétrico usado.
            </p>
          </div>

          <div className="beginner-guide-disclosure__action" aria-hidden="true">
            <span className="beginner-guide-disclosure__action-label">Abrir guia</span>
            <ChevronDown size={20} />
          </div>
        </summary>

        <div className="beginner-guide-disclosure__content">
          <section className="guide-intro">
            <div>
              <span>COMECE SEM COMPLICAÇÃO</span>
              <h2>Você não precisa dominar engenharia para fazer uma boa escolha.</h2>
              <p>Comece pelos conceitos que afetam sua rotina. Depois consulte os documentos específicos do veículo que você possui ou pretende comprar.</p>
            </div>
            <Link className="button button--primary" href="/calculadora">Comparar custos <ArrowRight size={17} /></Link>
          </section>

          <section className="guide-grid" aria-label="Tópicos do guia do iniciante">
            {beginnerGuide.map((section, index) => {
              const Icon = icons[index] ?? Car;
              return (
                <article className="guide-card" key={section.title}>
                  <div className="guide-card__icon"><Icon size={24} /></div>
                  <div><span>PASSO {String(index + 1).padStart(2, "0")}</span><h2>{section.title}</h2><p>{section.description}</p></div>
                  <ul>{section.points.map((point) => <li key={point}><CheckCircle2 size={16} /> {point}</li>)}</ul>
                </article>
              );
            })}
          </section>
        </div>
      </details>

      <section className="vehicle-library-section vehicle-library-section--featured" id="manuais">
        <div className="vehicle-library-section__heading">
          <div className="vehicle-library-section__icon" aria-hidden="true">
            <BookOpenText size={25} />
          </div>
          <div className="section-heading section-heading--inline">
            <div><span className="eyebrow">BIBLIOTECA DO VEÍCULO</span><h2>Selecione o carro e encontre os documentos disponíveis.</h2></div>
            <p>Manuais do proprietário, manutenção, garantia, multimídia, guias rápidos e documentos técnicos.</p>
          </div>
        </div>

        <VehicleManualLibrary
          brands={brands}
          canAccessVip={canAccessVip}
          initialBrandSlug={selection.marca}
          initialModelSlug={selection.modelo}
          initialYear={selection.ano}
        />
      </section>

      <section className="info-panel">
        <div><span>FONTE E RESPONSABILIDADE</span><h2>Documentos organizados com identificação de origem.</h2><p>Sempre confira a versão, o ano/modelo e a fonte do material antes de executar manutenção ou alterar configurações do veículo. As orientações oficiais da montadora prevalecem.</p></div>
      </section>
    </div>
  );
}
