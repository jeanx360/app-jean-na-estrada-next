import type { Metadata } from "next";
import { Camera, ExternalLink, Mail, Music2, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { contactItems, type ContactItem } from "@/data/content";

export const metadata: Metadata = { title: "Fale comigo" };

const contactIcons: Record<ContactItem["kind"], typeof Mail> = {
  email: Mail,
  video: Video,
  "short-video": Music2,
  photo: Camera,
};

export default function ContactPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="CANAIS OFICIAIS"
        title="Fale com o Jean na Estrada"
        description="Acesse os perfis oficiais ou envie uma mensagem para assuntos comerciais e profissionais."
      />

      <section className="contact-grid" aria-label="Canais oficiais">
        {contactItems.map((item) => {
          const Icon = contactIcons[item.kind];
          return (
            <a
              className="contact-card"
              href={item.href}
              target={item.kind === "email" ? undefined : "_blank"}
              rel={item.kind === "email" ? undefined : "noreferrer"}
              key={item.label}
            >
              <span className="contact-card__icon"><Icon size={24} /></span>
              <div>
                <h2>{item.label}</h2>
                <p>{item.description}</p>
              </div>
              <ExternalLink size={18} />
            </a>
          );
        })}
      </section>

      <section className="contact-note">
        <Mail size={22} />
        <div>
          <span>CONTATO COMERCIAL</span>
          <h2>Propostas, parcerias e convites</h2>
          <p>
            Envie contexto, empresa, objetivo da proposta e uma forma de retorno. Isso facilita a análise e evita mensagens incompletas.
          </p>
        </div>
      </section>
    </div>
  );
}
