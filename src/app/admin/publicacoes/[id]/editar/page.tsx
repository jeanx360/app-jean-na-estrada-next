import type { Metadata } from "next";
import { SmartBackButton } from "@/components/SmartBackButton";
import { ImageUp, Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminApplicationFileUploader } from "@/components/AdminApplicationFileUploader";
import { AdminPublicAssetUploader } from "@/components/AdminPublicAssetUploader";
import { AdminPublicContentForm } from "@/components/AdminPublicContentForm";
import { requireAdmin } from "@/lib/admin";
import type { CatalogCategoryRow } from "@/types/catalog";
import type { PublicContentRow } from "@/types/public-content";

export const metadata: Metadata = { title: "Editar publicação" };

export default async function EditPublicContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [itemResult, categoriesResult] = await Promise.all([
    supabase
      .from("public_contents")
      .select(
        "id, content_type, title, slug, summary, category, catalog_category_id, image_url, image_path, external_url, metadata, publication_status, is_published, is_featured, sort_order, published_at, archived_at, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("catalog_categories")
      .select("id, catalog_type, name, slug, description, sort_order, is_active, created_at, updated_at")
      .order("catalog_type", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (itemResult.error || !itemResult.data) notFound();
  const item = itemResult.data as unknown as PublicContentRow;
  const catalogCategories = (categoriesResult.data ?? []) as unknown as CatalogCategoryRow[];

  return (
    <div className="admin-content-stack">
      <div>
        <SmartBackButton className="text-link" fallbackHref="/admin/publicacoes" label="Voltar às publicações" />
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
        <AdminPublicContentForm initialData={item} catalogCategories={catalogCategories} />
      </section>
    </div>
  );
}
