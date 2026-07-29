"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, LoaderCircle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createSubscriptionRequestAction } from "@/app/assinar/actions";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export function SubscriptionRequestForm({
  userId,
  paymentLinkEnabled,
  pixEnabled,
}: {
  userId: string;
  paymentLinkEnabled: boolean;
  pixEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("proofFile");
    let uploadedPath = "";
    const supabase = createClient();

    try {
      if (file instanceof File && file.size > 0) {
        if (!ALLOWED_TYPES.has(file.type)) throw new Error("Use JPG, PNG, WebP ou PDF.");
        if (file.size > MAX_FILE_SIZE) throw new Error("O comprovante deve ter no máximo 5 MB.");

        uploadedPath = `${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("vip-payment-proofs")
          .upload(uploadedPath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });
        if (uploadError) throw uploadError;
      }

      formData.delete("proofFile");
      formData.set("proofPath", uploadedPath);
      const result = await createSubscriptionRequestAction(formData);
      if (result.error) {
        if (uploadedPath) await supabase.storage.from("vip-payment-proofs").remove([uploadedPath]);
        throw new Error(result.error);
      }

      form.reset();
      setMessage({ type: "success", text: result.success || "Pedido enviado." });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível enviar o pedido." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="subscription-request-form" onSubmit={handleSubmit}>
      <div className="subscription-request-form__grid">
        <label>
          <span>Forma utilizada</span>
          <select name="paymentMethod" required defaultValue={paymentLinkEnabled ? "payment_link" : "pix"}>
            {paymentLinkEnabled ? <option value="payment_link">Link de assinatura</option> : null}
            {pixEnabled ? <option value="pix">Pix mensal</option> : null}
          </select>
        </label>
        <label>
          <span>Referência do pagamento</span>
          <input name="paymentReference" placeholder="ID, e-mail usado ou identificação do pagamento" maxLength={160} />
        </label>
      </div>

      <label className="subscription-proof-field">
        <FileUp size={22} />
        <div>
          <strong>Enviar comprovante</strong>
          <span>JPG, PNG, WebP ou PDF de até 5 MB.</span>
        </div>
        <input name="proofFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
      </label>

      <label>
        <span>Observação opcional</span>
        <textarea name="notes" rows={3} maxLength={500} placeholder="Informe algum detalhe que facilite a conferência." />
      </label>

      {message ? (
        <p className={`auth-message auth-message--${message.type}`}>
          {message.type === "success" ? <CheckCircle2 size={18} /> : null}
          {message.text}
        </p>
      ) : null}

      <button className="button button--primary" type="submit" disabled={pending || (!paymentLinkEnabled && !pixEnabled)}>
        {pending ? <LoaderCircle className="auth-spinner" size={18} /> : <Send size={18} />}
        {pending ? "Enviando..." : "Enviar para análise"}
      </button>
    </form>
  );
}
