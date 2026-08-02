"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Clipboard,
  Download,
  ExternalLink,
  Link2,
  LoaderCircle,
  Plus,
  RotateCcw,
  Share2,
} from "lucide-react";
import QRCode from "qrcode";
import {
  createDriverCampaignAction,
  setDriverCampaignActiveAction,
} from "@/app/motorista/cartao/actions";
import {
  DRIVER_CAMPAIGN_SOURCE_OPTIONS,
  DRIVER_MARKETING_SOURCE_LABELS,
  driverMarketingUrl,
  type DriverMarketingCampaign,
  type DriverMarketingSource,
} from "@/lib/driver-marketing";
import type { DriverPublicProfile } from "@/lib/driver-public";

type Props = {
  profile: DriverPublicProfile;
  campaigns: DriverMarketingCampaign[];
  databaseAvailable: boolean;
};

function triggerDownload(dataUrl: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

export function DriverCampaignManager({ profile, campaigns, databaseAvailable }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function createCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("create");
    setMessage("");
    try {
      await createDriverCampaignAction(new FormData(event.currentTarget));
      formRef.current?.reset();
      router.refresh();
      setMessage("Campanha criada. O novo link já pode ser divulgado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar a campanha.");
    } finally {
      setBusy("");
    }
  }

  async function setActive(campaignId: string, isActive: boolean) {
    setBusy(campaignId);
    setMessage("");
    try {
      const data = new FormData();
      data.set("campaignId", campaignId);
      data.set("isActive", String(isActive));
      await setDriverCampaignActiveAction(data);
      router.refresh();
      setMessage(isActive ? "Campanha reativada." : "Campanha arquivada sem apagar o histórico.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a campanha.");
    } finally {
      setBusy("");
    }
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    setMessage("Link rastreável copiado.");
  }

  async function share(campaign: DriverMarketingCampaign, url: string) {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${profile.display_name} — ${campaign.name}`,
          text: "Abra meu cartão profissional e solicite sua corrida.",
          url,
        });
      } else {
        await copy(url);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Não foi possível compartilhar agora.");
    }
  }

  async function downloadQr(campaign: DriverMarketingCampaign, url: string) {
    setBusy(`qr-${campaign.id}`);
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 1400,
        margin: 2,
        errorCorrectionLevel: "H",
      });
      triggerDownload(dataUrl, `qr-${profile.slug}-${campaign.code}.png`);
      setMessage("QR Code rastreável gerado em alta resolução.");
    } catch {
      setMessage("Não foi possível gerar o QR Code.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="driver-campaign-manager">
      <header>
        <div>
          <span className="eyebrow">CAMPANHAS RASTREÁVEIS</span>
          <h2>Descubra qual divulgação traz passageiros</h2>
          <p>Crie um link diferente para cada adesivo, rede social, cartão ou ação. O histórico permanece mesmo após arquivar.</p>
        </div>
        <Link2 size={28} />
      </header>

      {!databaseAvailable ? (
        <div className="driver-campaign-warning">
          <strong>Campanhas aguardando ativação no banco.</strong>
          <span>Execute a migration 1.11.0 no Supabase para liberar a criação e os relatórios.</span>
        </div>
      ) : null}

      <form ref={formRef} className="driver-campaign-create" onSubmit={createCampaign}>
        <label>
          <span>Nome da campanha</span>
          <input name="name" maxLength={80} required minLength={3} placeholder="Ex.: adesivo atrás do banco" disabled={!databaseAvailable || busy === "create"} />
        </label>
        <label>
          <span>Origem</span>
          <select name="source" defaultValue="qr_car" disabled={!databaseAvailable || busy === "create"}>
            {DRIVER_CAMPAIGN_SOURCE_OPTIONS.map((source) => (
              <option key={source} value={source}>{DRIVER_MARKETING_SOURCE_LABELS[source]}</option>
            ))}
          </select>
        </label>
        <button className="button button--primary" type="submit" disabled={!databaseAvailable || busy === "create"}>
          {busy === "create" ? <LoaderCircle className="auth-spinner" size={18} /> : <Plus size={18} />}
          Criar campanha
        </button>
      </form>

      <div className="driver-campaign-list">
        {campaigns.map((campaign) => {
          const source = campaign.source as DriverMarketingSource;
          const url = driverMarketingUrl(profile.slug, source, campaign.code);
          const isQrBusy = busy === `qr-${campaign.id}`;
          return (
            <article key={campaign.id} className={campaign.is_active ? "" : "is-archived"}>
              <div className="driver-campaign-list__heading">
                <div>
                  <span>{DRIVER_MARKETING_SOURCE_LABELS[source] || "Outra origem"}</span>
                  <h3>{campaign.name}</h3>
                  <small>{campaign.is_active ? "Ativa e rastreando acessos" : "Arquivada — histórico preservado"}</small>
                </div>
                {campaign.is_active ? <CheckCircle2 size={21} /> : <Archive size={21} />}
              </div>
              <code>{url}</code>
              <div className="driver-campaign-actions">
                <button className="button button--secondary button--compact" type="button" onClick={() => void copy(url)} disabled={!campaign.is_active}><Clipboard size={16} /> Copiar</button>
                <button className="button button--secondary button--compact" type="button" onClick={() => void downloadQr(campaign, url)} disabled={!campaign.is_active || isQrBusy}>{isQrBusy ? <LoaderCircle className="auth-spinner" size={16} /> : <Download size={16} />} QR PNG</button>
                <button className="button button--secondary button--compact" type="button" onClick={() => void share(campaign, url)} disabled={!campaign.is_active}><Share2 size={16} /> Compartilhar</button>
                <a className="button button--secondary button--compact" href={url} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir</a>
                <button className="button button--secondary button--compact" type="button" onClick={() => void setActive(campaign.id, !campaign.is_active)} disabled={busy === campaign.id}>
                  {busy === campaign.id ? <LoaderCircle className="auth-spinner" size={16} /> : campaign.is_active ? <Archive size={16} /> : <RotateCcw size={16} />}
                  {campaign.is_active ? "Arquivar" : "Reativar"}
                </button>
              </div>
            </article>
          );
        })}
        {!campaigns.length && databaseAvailable ? (
          <div className="driver-campaign-empty">
            <Link2 size={28} />
            <strong>Nenhuma campanha criada</strong>
            <p>Comece pelo QR do veículo ou por um link para sua principal rede social.</p>
          </div>
        ) : null}
      </div>

      {message ? <p className={message.includes("não") || message.includes("Execute") ? "auth-message auth-message--error" : "auth-message auth-message--success"}>{message}</p> : null}
    </section>
  );
}
