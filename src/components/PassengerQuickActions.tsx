"use client";

import { useState } from "react";
import { CalendarDays, Check, ContactRound, MessageCircle, Share2 } from "lucide-react";
import { trackDriverPublicEvent } from "@/components/DriverProfileEventTracker";
import type { DriverMarketingSource } from "@/lib/driver-marketing";

type Props = {
  driverSlug: string;
  driverName: string;
  whatsappUrl: string;
  contactUrl: string;
  shareUrl: string;
  source: DriverMarketingSource;
  campaignCode: string;
  acceptsReservations: boolean;
};

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function PassengerQuickActions({
  driverSlug,
  driverName,
  whatsappUrl,
  contactUrl,
  shareUrl,
  source,
  campaignCode,
  acceptsReservations,
}: Props) {
  const [shareMessage, setShareMessage] = useState("");

  async function shareProfile() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${driverName} — motorista particular`,
          text: `Contato profissional de ${driverName} no JNE App.`,
          url: shareUrl,
        });
        setShareMessage("Perfil compartilhado");
      } else {
        await copyText(shareUrl);
        setShareMessage("Link copiado");
      }
      trackDriverPublicEvent(driverSlug, "profile_share", source, campaignCode);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareMessage("Não foi possível compartilhar");
    }

    window.setTimeout(() => setShareMessage(""), 2600);
  }

  return (
    <>
      <section className="passenger-quick-actions" aria-label="Ações rápidas do passageiro">
        <div className="passenger-quick-actions__intro">
          <span>CONTATO RÁPIDO</span>
          <strong>Tenha este motorista sempre à mão</strong>
          <small>Converse agora, agende uma viagem ou salve o contato para chamar novamente.</small>
        </div>

        <div className="passenger-quick-actions__grid">
          <a
            className="passenger-action passenger-action--primary"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            data-driver-event="whatsapp_click"
          >
            <MessageCircle size={21} />
            <span><strong>WhatsApp</strong><small>Falar com o motorista</small></span>
          </a>

          {acceptsReservations ? (
            <a className="passenger-action" href="#reservar" data-driver-event="reservation_cta">
              <CalendarDays size={21} />
              <span><strong>Agendar corrida</strong><small>Enviar os dados da viagem</small></span>
            </a>
          ) : null}

          <a className="passenger-action" href={contactUrl} data-driver-event="contact_save">
            <ContactRound size={21} />
            <span><strong>Salvar contato</strong><small>Adicionar à agenda do celular</small></span>
          </a>

          <button className="passenger-action" type="button" onClick={shareProfile}>
            {shareMessage ? <Check size={21} /> : <Share2 size={21} />}
            <span><strong>{shareMessage || "Compartilhar"}</strong><small>Enviar para alguém de confiança</small></span>
          </button>
        </div>
      </section>

      <nav className="passenger-mobile-actions" aria-label="Ações rápidas">
        <a href={whatsappUrl} target="_blank" rel="noreferrer" data-driver-event="whatsapp_click">
          <MessageCircle size={20} /><span>WhatsApp</span>
        </a>
        {acceptsReservations ? (
          <a href="#reservar" data-driver-event="reservation_cta">
            <CalendarDays size={20} /><span>Agendar</span>
          </a>
        ) : null}
        <a href={contactUrl} data-driver-event="contact_save">
          <ContactRound size={20} /><span>Salvar</span>
        </a>
      </nav>
    </>
  );
}
