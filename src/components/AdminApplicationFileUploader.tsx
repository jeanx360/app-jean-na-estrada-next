"use client";

import { CheckCircle2, FileArchive, LoaderCircle, UploadCloud } from "lucide-react";
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

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function AdminApplicationFileUploader() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ path: string; name: string; size: number; checksum: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");

    if (!(file instanceof File) || !file.size) {
      setError("Selecione um arquivo.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("O arquivo deve ter no máximo 100 MB.");
      return;
    }

    setPending(true);
    try {
      const checksum = toHex(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()));
      const supabase = createClient();
      const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("app-files").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });
      if (uploadError) throw uploadError;

      const uploaded = { path, name: file.name, size: file.size, checksum };
      setResult(uploaded);
      form.reset();
      window.dispatchEvent(new CustomEvent("jne-application-file-ready", { detail: uploaded }));
    } catch (uploadError) {
      setError(`Falha no upload: ${uploadError instanceof Error ? uploadError.message : "erro desconhecido"}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="admin-form admin-asset-uploader" onSubmit={handleSubmit}>
      <label className="admin-file-field">
        <FileArchive size={24} />
        <div>
          <strong>Selecionar arquivo do aplicativo</strong>
          <span>APK, XAPK, APKS, ZIP ou outro arquivo com até 100 MB.</span>
        </div>
        <input name="file" type="file" accept=".apk,.xapk,.apks,.zip,.rar,.7z,application/zip,application/octet-stream" required />
      </label>

      {error ? <p className="auth-message auth-message--error">{error}</p> : null}
      {result ? (
        <div className="admin-upload-summary">
          <CheckCircle2 size={20} />
          <div><strong>Arquivo enviado e aplicado ao formulário</strong><small>{result.name} · {result.path}</small></div>
        </div>
      ) : null}

      <button className="button button--primary" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="auth-spinner" size={18} /> : <UploadCloud size={18} />}
        {pending ? "Calculando e enviando..." : "Enviar arquivo"}
      </button>
    </form>
  );
}
