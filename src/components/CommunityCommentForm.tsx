"use client";

import { useRef, useState } from "react";
import { LoaderCircle, MessageCircle, Send } from "lucide-react";
import { createCommunityCommentAction } from "@/app/comunidade/actions";

export function CommunityCommentForm({
  postId,
  parentCommentId,
  compact = false,
}: {
  postId: string;
  parentCommentId?: string;
  compact?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await createCommunityCommentAction({}, new FormData(event.currentTarget));
    setPending(false);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }

    formRef.current?.reset();
    setMessage({ type: "success", text: result.success || "Comentário publicado." });
  }

  return (
    <form
      ref={formRef}
      className={`community-comment-form ${compact ? "community-comment-form--compact" : ""}`}
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="postId" value={postId} />
      {parentCommentId ? <input type="hidden" name="parentCommentId" value={parentCommentId} /> : null}
      <label>
        <span>{parentCommentId ? "Responder comentário" : "Adicionar comentário"}</span>
        <textarea
          name="body"
          required
          maxLength={1500}
          rows={compact ? 2 : 4}
          placeholder={parentCommentId ? "Escreva sua resposta..." : "Participe da conversa..."}
        />
      </label>
      {message ? <p className={`auth-message auth-message--${message.type}`}>{message.text}</p> : null}
      <button className="button button--primary" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="auth-spinner" size={17} /> : parentCommentId ? <MessageCircle size={17} /> : <Send size={17} />}
        {pending ? "Enviando..." : parentCommentId ? "Responder" : "Comentar"}
      </button>
    </form>
  );
}
