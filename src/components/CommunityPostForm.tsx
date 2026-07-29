"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, FileImage, LoaderCircle, Plus, Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createCommunityPostAction } from "@/app/comunidade/actions";
import type { CommunityCategory } from "@/types/community";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export function CommunityPostForm({
  userId,
  categories,
}: {
  userId: string;
  categories: CommunityCategory[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function updatePollOption(index: number, value: string) {
    setPollOptions((current) => current.map((option, optionIndex) => (optionIndex === index ? value : option)));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const imageFile = formData.get("imageFile");
    const supabase = createClient();
    let uploadedPath = "";

    try {
      if (imageFile instanceof File && imageFile.size > 0) {
        if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) throw new Error("Use uma imagem JPG, PNG ou WebP.");
        if (imageFile.size > MAX_IMAGE_SIZE) throw new Error("A imagem deve ter no máximo 5 MB.");

        uploadedPath = `${userId}/${crypto.randomUUID()}-${safeFileName(imageFile.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("community-images")
          .upload(uploadedPath, imageFile, {
            cacheControl: "3600",
            contentType: imageFile.type,
            upsert: false,
          });
        if (uploadError) throw uploadError;
      }

      formData.delete("imageFile");
      formData.set("imagePath", uploadedPath);
      formData.delete("pollOption");

      if (pollEnabled) {
        pollOptions.forEach((option) => formData.append("pollOption", option));
      } else {
        formData.delete("pollQuestion");
      }

      const result = await createCommunityPostAction(formData);
      if (result.error) {
        if (uploadedPath) await supabase.storage.from("community-images").remove([uploadedPath]);
        throw new Error(result.error);
      }

      setMessage({ type: "success", text: result.success || "Publicação criada." });
      form.reset();
      setPollEnabled(false);
      setPollOptions(["", ""]);
      if (result.postId) router.push(`/comunidade/${result.postId}`);
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Não foi possível publicar.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="community-composer" onSubmit={handleSubmit}>
      <div className="community-composer__grid">
        <label>
          <span>Categoria</span>
          <select name="categoryId" required defaultValue={categories[0]?.id ?? ""}>
            {categories.map((category) => (
              <option value={category.id} key={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Título</span>
          <input name="title" required minLength={3} maxLength={120} placeholder="Sobre o que você quer conversar?" />
        </label>
      </div>

      <label>
        <span>Publicação</span>
        <textarea
          name="body"
          required
          minLength={3}
          maxLength={4000}
          rows={8}
          placeholder="Compartilhe uma dúvida, experiência, informação ou dica com os membros VIP."
        />
      </label>

      <label className="community-image-field">
        <FileImage size={23} />
        <div>
          <strong>Adicionar imagem</strong>
          <span>JPG, PNG ou WebP de até 5 MB.</span>
        </div>
        <input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp" />
      </label>

      <section className="community-poll-editor">
        <button
          className="button button--secondary"
          type="button"
          onClick={() => setPollEnabled((current) => !current)}
        >
          <BarChart3 size={18} /> {pollEnabled ? "Remover enquete" : "Adicionar enquete"}
        </button>

        {pollEnabled ? (
          <div className="community-poll-editor__fields">
            <label>
              <span>Pergunta da enquete</span>
              <input name="pollQuestion" required maxLength={180} placeholder="Qual opção você prefere?" />
            </label>
            {pollOptions.map((option, index) => (
              <label className="community-poll-editor__option" key={`poll-${index}`}>
                <span>Opção {index + 1}</span>
                <input
                  value={option}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => updatePollOption(index, event.target.value)}
                  required
                  maxLength={120}
                />
                {pollOptions.length > 2 ? (
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Excluir opção ${index + 1}`}
                    onClick={() => setPollOptions((current) => current.filter((_, optionIndex) => optionIndex !== index))}
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </label>
            ))}
            {pollOptions.length < 6 ? (
              <button
                className="text-link"
                type="button"
                onClick={() => setPollOptions((current) => [...current, ""])}
              >
                <Plus size={16} /> Adicionar opção
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {message ? <p className={`auth-message auth-message--${message.type}`}>{message.text}</p> : null}

      <div className="community-composer__footer">
        <small>Respeite as regras da comunidade e não publique dados pessoais de terceiros.</small>
        <button className="button button--primary" type="submit" disabled={pending || !categories.length}>
          {pending ? <LoaderCircle className="auth-spinner" size={18} /> : <Send size={18} />}
          {pending ? "Publicando..." : "Publicar na comunidade"}
        </button>
      </div>
    </form>
  );
}
