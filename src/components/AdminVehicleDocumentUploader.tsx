"use client";

import { CheckCircle2, FileUp, LoaderCircle } from "lucide-react";
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

function formatSize(value: number) {
  return value >= 1024 * 1024
    ? `${(value / 1024 / 1024).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`
    : `${Math.max(1, Math.round(value / 1024))} KB`;
}

export function AdminVehicleDocumentUploader() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ path: string; name: string; size: number } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");

    if (!(file instanceof File) || !file.size) {
      setError("Selecione um arquivo PDF.");
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("A biblioteca aceita manuais em PDF.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("O documento deve ter no máximo 50 MB.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("vehicle-documents").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/pdf",
    });

    if (uploadError) {
      setPending(false);
      setError(`Falha no upload: ${uploadError.message}`);
      return;
    }

    const uploaded = { path, name: file.name, size: file.size };
    setResult(uploaded);
    setPending(false);
    form.reset();
    window.dispatchEvent(new CustomEvent("jne-vehicle-document-ready", { detail: uploaded }));
  }

  return (
    <form className="admin-form admin-asset-uploader" onSubmit={handleSubmit}>
      <label className="admin-file-field">
        <FileUp size={24} />
        <div>
          <strong>Selecionar manual em PDF</strong>
          <span>Arquivo privado com até 50 MB. O acesso será entregue por link temporário.</span>
        </div>
        <input name="file" type="file" accept="application/pdf,.pdf" required />
      </label>

      {error ? <p className="auth-message auth-message--error">{error}</p> : null}
      {result ? (
        <div className="admin-upload-summary">
          <CheckCircle2 size={20} />
          <div><strong>Documento enviado e aplicado ao formulário</strong><small>{result.name} · {formatSize(result.size)}</small></div>
        </div>
      ) : null}

      <button className="button button--primary" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="auth-spinner" size={18} /> : <FileUp size={18} />}
        {pending ? "Enviando..." : "Enviar documento"}
      </button>
    </form>
  );
}
