"use client";

import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  Eye,
  Megaphone,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { saveReleaseAction } from "@/app/admin/atualizacoes/actions";
import type { AppReleaseRow, ReleaseActionState } from "@/types/release-center";

const initialState: ReleaseActionState = {};

function localDateTimeValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return parts.replace(" ", "T");
}

const suggestedHighlights = [
  "Central única para comunicar novas versões",
  "Notificação interna e Web Push no mesmo fluxo",
  "Publicação automática na Comunidade VIP",
  "Rascunho, prévia, agendamento e histórico",
  "Proteção contra publicações duplicadas",
].join("\n");

export function AdminReleaseForm({ release }: { release?: AppReleaseRow | null }) {
  const [state, formAction, pending] = useActionState(saveReleaseAction, initialState);
  const [releaseId, setReleaseId] = useState(release?.id ?? "");
  const [version, setVersion] = useState(release?.version ?? "2.2.2");
  const [title, setTitle] = useState(release?.title ?? "Central de Atualizações e Comunidade VIP");
  const [notificationTitle, setNotificationTitle] = useState(
    release?.notification_title ?? "🚀 JNE App 2.2.2 disponível",
  );
  const [notificationMessage, setNotificationMessage] = useState(
    release?.notification_message
      ?? "A nova Central de Atualizações já está no ar, com avisos, novidades e publicações oficiais reunidos em um só lugar.",
  );
  const [communityTitle, setCommunityTitle] = useState(
    release?.community_title ?? "🚀 Nova atualização do JNE App — versão 2.2.2",
  );
  const [communityBody, setCommunityBody] = useState(
    release?.community_body
      ?? "Olá, pessoal!\n\nA nova atualização do JNE App já está disponível. Agora as novidades podem ser comunicadas pela administração de forma centralizada, segura e sem publicações duplicadas.",
  );
  const [highlights, setHighlights] = useState(
    release?.highlights?.join("\n") ?? suggestedHighlights,
  );
  const [publishNotification, setPublishNotification] = useState(release?.publish_notification ?? true);
  const [publishCommunity, setPublishCommunity] = useState(release?.publish_community ?? true);
  const [sendPush, setSendPush] = useState(release?.send_push ?? true);
  const [pinCommunity, setPinCommunity] = useState(release?.pin_community ?? true);

  useEffect(() => {
    if (state.releaseId) setReleaseId(state.releaseId);
  }, [state.releaseId]);

  const highlightItems = highlights
    .split(/\r?\n/)
    .map((item) => item.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 20);

  return (
    <form className="admin-form release-center-form" action={formAction}>
      <input type="hidden" name="releaseId" value={releaseId} />

      <div className="admin-form__grid admin-form__grid--wide">
        <label>
          <span>Versão</span>
          <input
            name="version"
            required
            value={version}
            onChange={(event) => setVersion(event.target.value)}
            placeholder="2.2.2"
            inputMode="decimal"
          />
        </label>
        <label className="admin-form__span-2">
          <span>Título interno</span>
          <input
            name="title"
            required
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nome da atualização no histórico"
          />
        </label>
      </div>

      <section className="release-center-form__group">
        <header><BellRing size={19} /><div><strong>Notificação</strong><span>Mensagem curta exibida na central e no Web Push.</span></div></header>
        <label>
          <span>Título da notificação</span>
          <input
            name="notificationTitle"
            required
            maxLength={100}
            value={notificationTitle}
            onChange={(event) => setNotificationTitle(event.target.value)}
          />
        </label>
        <label>
          <span>Resumo</span>
          <textarea
            name="notificationMessage"
            required
            maxLength={600}
            rows={4}
            value={notificationMessage}
            onChange={(event) => setNotificationMessage(event.target.value)}
          />
          <small>{notificationMessage.length}/600</small>
        </label>
      </section>

      <section className="release-center-form__group">
        <header><Megaphone size={19} /><div><strong>Comunidade VIP</strong><span>Publicação completa com as novidades da versão.</span></div></header>
        <label>
          <span>Título da publicação</span>
          <input
            name="communityTitle"
            required
            maxLength={120}
            value={communityTitle}
            onChange={(event) => setCommunityTitle(event.target.value)}
          />
        </label>
        <label>
          <span>Texto principal</span>
          <textarea
            name="communityBody"
            required
            maxLength={4000}
            rows={8}
            value={communityBody}
            onChange={(event) => setCommunityBody(event.target.value)}
          />
          <small>{communityBody.length}/4.000</small>
        </label>
        <label>
          <span>Principais novidades — uma por linha</span>
          <textarea
            name="highlights"
            rows={6}
            value={highlights}
            onChange={(event) => setHighlights(event.target.value)}
            placeholder="Passageiro sem login&#10;Editor visual da Home"
          />
          <small>Até 20 itens. A lista será adicionada ao final da publicação.</small>
        </label>
      </section>

      <div className="admin-form__grid admin-form__grid--wide">
        <label>
          <span>Público da notificação</span>
          <select name="audience" defaultValue={release?.audience ?? "all"}>
            <option value="all">Todos, inclusive visitantes</option>
            <option value="member">Membros cadastrados</option>
            <option value="vip">VIP e administradores</option>
            <option value="admin">Somente administradores</option>
          </select>
        </label>
        <label>
          <span>Destino ao tocar</span>
          <input name="actionUrl" defaultValue={release?.action_url ?? ""} placeholder="Automático: publicação VIP" />
        </label>
        <label>
          <span>Imagem opcional da notificação</span>
          <input name="imageUrl" defaultValue={release?.image_url ?? ""} placeholder="/banner.webp ou https://..." />
        </label>
      </div>

      <div className="release-center-form__channels">
        <label className="admin-checkbox">
          <input
            name="publishNotification"
            type="checkbox"
            checked={publishNotification}
            onChange={(event) => {
              setPublishNotification(event.target.checked);
              if (!event.target.checked) setSendPush(false);
            }}
          />
          <span>Publicar notificação interna</span>
        </label>
        <label className="admin-checkbox">
          <input
            name="sendPush"
            type="checkbox"
            checked={sendPush}
            disabled={!publishNotification}
            onChange={(event) => setSendPush(event.target.checked)}
          />
          <span>Enviar Web Push</span>
        </label>
        <label className="admin-checkbox">
          <input name="featureNotification" type="checkbox" defaultChecked={release?.feature_notification ?? false} />
          <span>Destacar a notificação na Home</span>
        </label>
        <label className="admin-checkbox">
          <input
            name="publishCommunity"
            type="checkbox"
            checked={publishCommunity}
            onChange={(event) => {
              setPublishCommunity(event.target.checked);
              if (!event.target.checked) setPinCommunity(false);
            }}
          />
          <span>Publicar na Comunidade VIP</span>
        </label>
        <label className="admin-checkbox">
          <input
            name="pinCommunity"
            type="checkbox"
            checked={pinCommunity}
            disabled={!publishCommunity}
            onChange={(event) => setPinCommunity(event.target.checked)}
          />
          <span>Fixar a publicação temporariamente</span>
        </label>
        <label className="release-center-form__pin-days">
          <span>Dias fixada</span>
          <input
            name="pinDays"
            type="number"
            min={0}
            max={30}
            defaultValue={release?.pin_days ?? 7}
            disabled={!publishCommunity || !pinCommunity}
          />
        </label>
      </div>

      <label>
        <span>Data e hora para agendar</span>
        <input
          name="scheduledAt"
          type="datetime-local"
          defaultValue={localDateTimeValue(release?.scheduled_at)}
        />
        <small>O agendamento é processado pela rotina protegida de automações. Para publicar agora, deixe em branco.</small>
      </label>

      <section className="release-center-preview" aria-label="Prévia da atualização">
        <header><Eye size={19} /><div><strong>Prévia antes do disparo</strong><span>Nada será enviado enquanto você não escolher Publicar atualização.</span></div></header>
        <div className="release-center-preview__grid">
          <article>
            <span>NOTIFICAÇÃO · {version || "versão"}</span>
            <h3>{notificationTitle || "Título da notificação"}</h3>
            <p>{notificationMessage || "Resumo da atualização."}</p>
          </article>
          <article>
            <span>COMUNIDADE VIP · ATUALIZAÇÃO OFICIAL</span>
            <h3>{communityTitle || "Título da publicação"}</h3>
            <p className="release-center-preview__body">{communityBody || "Texto completo da atualização."}</p>
            {highlightItems.length ? (
              <ul>{highlightItems.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
            ) : null}
          </article>
        </div>
      </section>

      {state.error ? <p className="auth-message auth-message--error">{state.error}</p> : null}
      {state.success ? <p className="auth-message auth-message--success"><CheckCircle2 size={17} /> {state.success}</p> : null}

      <div className="release-center-form__actions">
        <button className="button button--secondary" type="submit" name="intent" value="draft" disabled={pending}>
          <Save size={17} /> {pending ? "Salvando..." : "Salvar rascunho"}
        </button>
        <button className="button button--secondary" type="submit" name="intent" value="schedule" disabled={pending}>
          <CalendarClock size={17} /> Agendar
        </button>
        <button
          className="button button--primary"
          type="submit"
          name="intent"
          value="publish"
          disabled={pending}
          onClick={(event) => {
            if (!window.confirm("Publicar esta atualização agora nos canais selecionados?")) {
              event.preventDefault();
            }
          }}
        >
          {pending ? <Sparkles className="is-spinning" size={18} /> : <Send size={18} />}
          Publicar atualização
        </button>
      </div>
    </form>
  );
}
