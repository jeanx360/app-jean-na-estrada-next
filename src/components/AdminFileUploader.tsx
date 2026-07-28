"use client";

import { FileUp, LoaderCircle, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export function AdminFileUploader() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    const title = String(data.get("title") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const category = String(data.get("category") ?? "Geral").trim() || "Geral";
    const isPublished = data.get("isPublished") === "on";
    const isFeatured = data.get("isFeatured") === "on";

    if (!(file instanceof File) || !file.size) {
      setMessage({ type: "error", text: "Selecione um arquivo." });
      return;
    }
    if (!title) {
      setMessage({ type: "error", text: "Informe o título do arquivo." });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setMessage({ type: "error", text: "Nesta etapa, o arquivo deve ter no máximo 50 MB." });
      return;
    }

    setPending(true);
    const supabase = createClient();
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${safeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage.from("vip-files").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

    if (uploadError) {
      setPending(false);
      setMessage({ type: "error", text: `Falha no upload: ${uploadError.message}` });
      return;
    }

    const { error: insertError } = await supabase.from("vip_content").insert({
      title,
      description: description || null,
      category,
      content_type: "file",
      file_path: path,
      content: {
        original_name: file.name,
        size: file.size,
        mime_type: file.type || null,
      },
      is_published: isPublished,
      is_featured: isFeatured,
      published_at: new Date().toISOString(),
    });

    if (insertError) {
      await supabase.storage.from("vip-files").remove([path]);
      setPending(false);
      setMessage({ type: "error", text: `Arquivo enviado, mas o cadastro falhou: ${insertError.message}` });
      return;
    }

    form.reset();
    setPending(false);
    setMessage({ type: "success", text: "Arquivo privado cadastrado com sucesso." });
    router.refresh();
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="admin-form__grid admin-form__grid--wide">
        <label>
          <span>Título</span>
          <input name="title" required placeholder="Ex.: GPack para Geely EX2" />
        </label>
        <label>
          <span>Categoria</span>
          <input name="category" defaultValue="APKs" />
        </label>
      </div>
      <label>
        <span>Descrição</span>
        <textarea name="description" rows={3} placeholder="Compatibilidade, versão e observações importantes." />
      </label>
      <label className="admin-file-field">
        <FileUp size={24} />
        <div>
          <strong>Selecionar arquivo privado</strong>
          <span>APK, ZIP, PDF ou documento com até 50 MB.</span>
        </div>
        <input name="file" type="file" required />
      </label>
      <div className="admin-form__checks">
        <label className="admin-checkbox">
          <input name="isPublished" type="checkbox" defaultChecked />
          <span>Publicar imediatamente</span>
        </label>
        <label className="admin-checkbox">
          <input name="isFeatured" type="checkbox" />
          <span>Marcar como destaque</span>
        </label>
      </div>

      <div className="admin-security-note">
        <ShieldCheck size={18} />
        O arquivo ficará no bucket privado e será liberado por link temporário somente para VIP e administradores.
      </div>

      {message ? (
        <p className={`auth-message auth-message--${message.type}`}>{message.text}</p>
      ) : null}

      <button className="button button--primary" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="auth-spinner" size={18} /> : <FileUp size={18} />}
        {pending ? "Enviando..." : "Enviar e cadastrar arquivo"}
      </button>
    </form>
  );
}
