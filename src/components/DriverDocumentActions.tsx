"use client";

import { Download, MessageCircle, Printer, Share2 } from "lucide-react";

type Props = {
  title: string;
  text: string;
  whatsappPhone?: string | null;
};

function normalizePhone(value?: string | null) {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 15);
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function DriverDocumentActions({ title, text, whatsappPhone }: Props) {
  function printDocument() {
    window.print();
  }

  async function shareDocument() {
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      window.alert("Texto copiado. Agora você pode colar no WhatsApp ou em outro aplicativo.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      window.alert("Não foi possível compartilhar agora.");
    }
  }

  const phone = normalizePhone(whatsappPhone);
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  return (
    <div className="driver-document-actions no-print">
      {phone ? (
        <a className="button button--primary" href={whatsappUrl} target="_blank" rel="noreferrer">
          <MessageCircle size={18} /> Enviar no WhatsApp
        </a>
      ) : (
        <button className="button button--primary" type="button" onClick={() => void shareDocument()}>
          <Share2 size={18} /> Compartilhar
        </button>
      )}
      <button className="button button--secondary" type="button" onClick={printDocument}>
        <Printer size={18} /> Imprimir
      </button>
      <button className="button button--secondary" type="button" onClick={printDocument}>
        <Download size={18} /> Salvar em PDF
      </button>
    </div>
  );
}
