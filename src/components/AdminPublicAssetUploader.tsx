"use client";

import { Check, Copy, ImageUp, LoaderCircle } from "lucide-react";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export function AdminPublicAssetUploader() {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{ url: string; path: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");

    if (!(file instanceof File) || !file.size) {
      setError("Selecione uma imagem.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Envie uma imagem JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 5 MB.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${safeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage.from("public-assets").upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });

    if (uploadError) {
      setPending(false);
      setError(`Falha no upload: ${uploadError.message}`);
      return;
    }

    const { data: publicData } = supabase.storage.from("public-assets").getPublicUrl(path);
    const uploaded = { url: publicData.publicUrl, path };
    setResult(uploaded);
    setPending(false);
    form.reset();

    window.dispatchEvent(new CustomEvent("jne-public-asset-ready", { detail: uploaded }));
  }

  async function copyUrl() {
    if (!result) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <form className="admin-form admin-asset-uploader" onSubmit={handleSubmit}>
      <label className="admin-file-field">
        <ImageUp size={24} />
        <div>
          <strong>Selecionar imagem pública</strong>
          <span>JPG, PNG ou WebP com até 5 MB.</span>
        </div>
        <input name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
      </label>

      {error ? <p className="auth-message auth-message--error">{error}</p> : null}

      {result ? (
        <div className="admin-asset-result">
          <img src={result.url} alt="Prévia da imagem enviada" />
          <div>
            <strong>Imagem enviada e aplicada ao formulário</strong>
            <small>{result.path}</small>
            <button className="button button--secondary" type="button" onClick={() => void copyUrl()}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "URL copiada" : "Copiar URL"}
            </button>
          </div>
        </div>
      ) : null}

      <button className="button button--primary" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="auth-spinner" size={18} /> : <ImageUp size={18} />}
        {pending ? "Enviando..." : "Enviar imagem"}
      </button>
    </form>
  );
}
