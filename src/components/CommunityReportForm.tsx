"use client";

import { useState } from "react";
import { Flag, LoaderCircle, Send, X } from "lucide-react";
import { reportCommunityItemAction } from "@/app/comunidade/actions";

export function CommunityReportForm({
  targetType,
  targetId,
  postId,
}: {
  targetType: "post" | "comment";
  targetId: string;
  postId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await reportCommunityItemAction({}, new FormData(event.currentTarget));
    setPending(false);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    setMessage({ type: "success", text: result.success || "Denúncia enviada." });
  }

  return (
    <div className="community-report-control">
      <button className="text-link" type="button" onClick={() => setOpen((current) => !current)}>
        {open ? <X size={15} /> : <Flag size={15} />}
        {open ? "Fechar" : "Denunciar"}
      </button>
      {open ? (
        <form className="community-report-form" onSubmit={handleSubmit}>
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />
          <input type="hidden" name="postId" value={postId} />
          <label>
            <span>Motivo</span>
            <select name="reason" required defaultValue="">
              <option value="" disabled>Selecione</option>
              <option value="spam">Spam ou propaganda</option>
              <option value="abuse">Ofensa, assédio ou abuso</option>
              <option value="misinformation">Informação perigosa ou enganosa</option>
              <option value="copyright">Direitos autorais</option>
              <option value="other">Outro motivo</option>
            </select>
          </label>
          <label>
            <span>Detalhes opcionais</span>
            <textarea name="details" rows={3} maxLength={1000} />
          </label>
          {message ? <p className={`auth-message auth-message--${message.type}`}>{message.text}</p> : null}
          <button className="button button--secondary" type="submit" disabled={pending}>
            {pending ? <LoaderCircle className="auth-spinner" size={16} /> : <Send size={16} />}
            {pending ? "Enviando..." : "Enviar denúncia"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
