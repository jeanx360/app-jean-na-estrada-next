"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, Download, ExternalLink, LoaderCircle, QrCode, Share2 } from "lucide-react";
import QRCode from "qrcode";
import {
  DRIVER_CAMPAIGN_SOURCE_OPTIONS,
  DRIVER_MARKETING_SOURCE_LABELS,
  driverMarketingUrl,
  type DriverMarketingSource,
} from "@/lib/driver-marketing";
import type { DriverPublicProfile } from "@/lib/driver-public";

type Props = { profile: DriverPublicProfile };

function fillRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
    return;
  }
  ctx.fillRect(x, y, width, height);
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

export function DriverQrCard({ profile }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [source, setSource] = useState<DriverMarketingSource>("qr_card");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const profileUrl = useMemo(() => driverMarketingUrl(profile.slug, source), [profile.slug, source]);
  const sourceLabel = DRIVER_MARKETING_SOURCE_LABELS[source];

  useEffect(() => {
    let active = true;
    setBusy(true);
    setQrDataUrl("");
    QRCode.toDataURL(profileUrl, { width: 900, margin: 2, errorCorrectionLevel: "H" })
      .then((value) => { if (active) setQrDataUrl(value); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [profileUrl]);

  async function copyLink() {
    await navigator.clipboard.writeText(profileUrl);
    setMessage("Link rastreável copiado.");
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Cartão profissional de ${profile.display_name}`,
          text: "Escaneie ou abra meu cartão para solicitar uma corrida.",
          url: profileUrl,
        });
      } else {
        await copyLink();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Não foi possível compartilhar.");
    }
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    downloadDataUrl(qrDataUrl, `qr-${profile.slug}-${source}.png`);
  }

  async function downloadCard() {
    if (!qrDataUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 1080;
    canvas.height = 1350;

    const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
    gradient.addColorStop(0, "#07111f");
    gradient.addColorStop(0.55, "#0c2039");
    gradient.addColorStop(1, "#05070c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(41,121,255,.18)";
    ctx.beginPath();
    ctx.arc(880, 180, 280, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,188,212,.12)";
    ctx.beginPath();
    ctx.arc(140, 1130, 260, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 42px Segoe UI, Arial";
    ctx.fillText("JNE APP", 84, 92);
    ctx.fillStyle = "#86b7ff";
    ctx.font = "600 24px Segoe UI, Arial";
    ctx.fillText(sourceLabel.toUpperCase(), 84, 132);

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 64px Segoe UI, Arial";
    const display = profile.display_name.length > 23 ? `${profile.display_name.slice(0, 22)}…` : profile.display_name;
    ctx.fillText(display, 84, 258);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "400 30px Segoe UI, Arial";
    const headline = (profile.headline || "Motorista particular").slice(0, 54);
    ctx.fillText(headline, 84, 312);

    ctx.fillStyle = "rgba(255,255,255,.08)";
    fillRoundedRect(ctx, 72, 370, 936, 742, 34);

    const image = new Image();
    image.src = qrDataUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("QR inválido"));
    });
    ctx.fillStyle = "#ffffff";
    fillRoundedRect(ctx, 210, 430, 660, 660, 28);
    ctx.drawImage(image, 250, 470, 580, 580);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 35px Segoe UI, Arial";
    ctx.textAlign = "center";
    ctx.fillText("Escaneie para solicitar uma corrida", 540, 1185);
    ctx.fillStyle = "#9fb3c8";
    ctx.font = "400 24px Segoe UI, Arial";
    ctx.fillText("Perfil, serviços, preços e contato direto", 540, 1233);
    ctx.fillStyle = "#4ea5ff";
    ctx.font = "600 23px Segoe UI, Arial";
    ctx.fillText(`jneapp.app/m/${profile.slug}`, 540, 1290);
    ctx.textAlign = "left";

    downloadDataUrl(canvas.toDataURL("image/png"), `cartao-${profile.slug}-${source}.png`);
  }

  return (
    <div className="driver-qr-layout">
      <section className="driver-qr-card-preview">
        <div className="driver-qr-card-preview__brand"><span>JNE APP</span><small>{sourceLabel}</small></div>
        <div><h2>{profile.display_name}</h2><p>{profile.headline || "Motorista particular"}</p></div>
        <div className="driver-qr-image">{busy ? <LoaderCircle className="auth-spinner" size={40} /> : qrDataUrl ? <img src={qrDataUrl} alt={`QR Code rastreável — ${sourceLabel}`} /> : <QrCode size={80} />}</div>
        <strong>Escaneie para solicitar uma corrida</strong>
        <small>Perfil, serviços, preços e WhatsApp</small>
      </section>

      <section className="driver-qr-actions">
        <div><span className="eyebrow">LINK RASTREÁVEL RÁPIDO</span><h2>Escolha onde este link será usado</h2><p>Cada origem aparece separadamente no painel de desempenho. Para identificar uma peça específica, crie uma campanha mais abaixo.</p></div>
        <label className="driver-qr-source-select">
          <span>Origem da divulgação</span>
          <select value={source} onChange={(event) => setSource(event.target.value as DriverMarketingSource)}>
            {DRIVER_CAMPAIGN_SOURCE_OPTIONS.map((item) => <option key={item} value={item}>{DRIVER_MARKETING_SOURCE_LABELS[item]}</option>)}
          </select>
        </label>
        <div className="driver-qr-link"><code>{profileUrl}</code><button className="icon-button" type="button" onClick={() => void copyLink()} aria-label="Copiar link"><Clipboard size={18} /></button></div>
        <div className="driver-qr-action-grid">
          <button className="button button--primary" type="button" onClick={downloadCard} disabled={!qrDataUrl}><Download size={18} /> Baixar cartão PNG</button>
          <button className="button button--secondary" type="button" onClick={downloadQr} disabled={!qrDataUrl}><QrCode size={18} /> Baixar só o QR</button>
          <button className="button button--secondary" type="button" onClick={() => void share()}><Share2 size={18} /> Compartilhar</button>
          <a className="button button--secondary" href={profileUrl} target="_blank" rel="noreferrer"><ExternalLink size={18} /> Abrir perfil</a>
        </div>
        <div className="driver-qr-use-cases"><strong>Boas formas de usar</strong><ul><li>Adesivo atrás do banco</li><li>Imagem no WhatsApp Status</li><li>Cartão impresso com QR</li><li>Link na bio das redes sociais</li></ul></div>
        {message ? <p className="auth-message auth-message--success">{message}</p> : null}
      </section>
      <canvas ref={canvasRef} hidden />
    </div>
  );
}
