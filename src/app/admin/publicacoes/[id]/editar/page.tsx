import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ImageUp, Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminApplicationFileUploader } from "@/components/AdminApplicationFileUploader";
import { AdminPublicAssetUploader } from "@/components/AdminPublicAssetUploader";
import { AdminPublicContentForm } from "@/components/AdminPublicContentForm";
import { requireAdmin } from "@/lib/admin";
import type { PublicContentRow } from "@/types/public-content";

export const metadata: Metadata = { title: "Editar publicação" };

export default async function EditPublicContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("public_contents")
    .select(
      "id, content_type, title, slug, summary, category, image_url, image_path, external_url, metadata, is_published, is_featured, sort_order, published_at, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();
  const item = data as PublicContentRow;

  return (
    <div className="admin-content-stack">
      <div>
        <Link className="text-link" href="/admin/publicacoes"><ArrowLeft size={16} /> Voltar às publicações</Link>
      </div>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>ALTERAR IMAGEM</span><h2><ImageUp size={22} /> Enviar nova imagem</h2></div>
        </div>
        <AdminPublicAssetUploader />
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>NOVO ARQUIVO DO APP</span><h2><ImageUp size={22} /> Substituir arquivo hospedado</h2></div>
        </div>
        <AdminApplicationFileUploader />
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>EDIÇÃO</span><h2><Pencil size={22} /> {item.title}</h2></div>
        </div>
        <AdminPublicContentForm initialData={item} />
      </section>
    </div>
  );
}
