"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  FileImage,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Send,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
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
  compact = false,
  avatarUrl,
}: {
  userId: string;
  categories: CommunityCategory[];
  compact?: boolean;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function updatePollOption(index: number, value: string) {
    setPollOptions((current) =>
      current.map((option, optionIndex) => (optionIndex === index ? value : option)),
    );
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
        if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
          throw new Error("Use uma imagem JPG, PNG ou WebP.");
        }
        if (imageFile.size > MAX_IMAGE_SIZE) {
          throw new Error("A imagem deve ter no máximo 5 MB.");
        }

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
        if (uploadedPath) {
          await supabase.storage.from("community-images").remove([uploadedPath]);
        }
        throw new Error(result.error);
      }

      form.reset();
      setFileName("");
      setPollEnabled(false);
      setPollOptions(["", ""]);
      setMessage({ type: "success", text: result.success || "Publicado." });
      if (!compact && result.postId) router.push(`/comunidade/${result.postId}`);
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
    <form
      className={`community-composer community-composer--minimal ${compact ? "community-composer--compact" : ""}`}
      onSubmit={handleSubmit}
    >
      <div className="community-composer__main">
        <div className="community-composer__avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={20} />}
        </div>
        <textarea
          name="body"
          required
          minLength={3}
          maxLength={4000}
          rows={compact ? 3 : 6}
          placeholder="O que você quer compartilhar?"
          aria-label="Texto da publicação"
        />
      </div>

      {fileName ? (
        <div className="community-composer__attachment">
          <FileImage size={17} />
          <span>{fileName}</span>
          <button
            type="button"
            onClick={() => {
              const input = document.getElementById(
                `community-image-${userId}`,
              ) as HTMLInputElement | null;
              if (input) input.value = "";
              setFileName("");
            }}
            aria-label="Remover imagem"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}

      {pollEnabled ? (
        <div className="community-poll-editor community-poll-editor--minimal">
          <div className="community-poll-editor__heading">
            <strong>Enquete</strong>
            <button
              className="community-icon-tool"
              type="button"
              aria-label="Remover enquete"
              data-tooltip="Remover enquete"
              onClick={() => setPollEnabled(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="community-poll-editor__fields">
            <label>
              <span>Pergunta</span>
              <input
                name="pollQuestion"
                required
                maxLength={180}
                placeholder="Qual opção você prefere?"
              />
            </label>
            {pollOptions.map((option, index) => (
              <label className="community-poll-editor__option" key={`poll-${index}`}>
                <span>Opção {index + 1}</span>
                <input
                  value={option}
                  onChange={(event) => updatePollOption(index, event.target.value)}
                  required
                  maxLength={120}
                />
                {pollOptions.length > 2 ? (
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Excluir opção ${index + 1}`}
                    onClick={() =>
                      setPollOptions((current) =>
                        current.filter((_, optionIndex) => optionIndex !== index),
                      )
                    }
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
        </div>
      ) : null}

      {message ? (
        <p className={`auth-message auth-message--${message.type}`}>{message.text}</p>
      ) : null}

      <div className="community-composer__toolbar">
        <div className="community-composer__tools" aria-label="Ferramentas da publicação">
          <label
            className="community-icon-tool community-image-button"
            data-tooltip="Adicionar imagem"
            aria-label="Adicionar imagem"
          >
            <FileImage size={20} />
            <input
              id={`community-image-${userId}`}
              name="imageFile"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
            />
          </label>

          <button
            className={`community-icon-tool ${pollEnabled ? "is-active" : ""}`}
            type="button"
            aria-label={pollEnabled ? "Remover enquete" : "Adicionar enquete"}
            aria-pressed={pollEnabled}
            data-tooltip={pollEnabled ? "Remover enquete" : "Adicionar enquete"}
            onClick={() => setPollEnabled((current) => !current)}
          >
            <BarChart3 size={20} />
          </button>

          <details className="community-composer__advanced">
            <summary
              className="community-icon-tool"
              aria-label="Mais opções"
              data-tooltip="Mais opções"
            >
              <MoreHorizontal size={21} />
            </summary>
            <div className="community-composer__advanced-panel">
              <label>
                <span>Categoria</span>
                <select name="categoryId" required defaultValue={categories[0]?.id ?? ""}>
                  {categories.map((category) => (
                    <option value={category.id} key={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>
        </div>

        <button
          className="community-icon-tool community-send-button"
          type="submit"
          disabled={pending || !categories.length}
          aria-label={pending ? "Publicando" : "Publicar"}
          data-tooltip={pending ? "Publicando" : "Publicar"}
        >
          {pending ? <LoaderCircle className="auth-spinner" size={19} /> : <Send size={19} />}
        </button>
      </div>
    </form>
  );
}
