import type { Metadata } from "next";
import { Archive, ArchiveRestore, FolderCog, Plus, Trash2 } from "lucide-react";
import {
  deleteCatalogCategoryAction,
  saveCatalogCategoryAction,
  toggleCatalogCategoryAction,
} from "@/app/admin/catalogo/actions";
import { AdminCatalogAssignmentForm } from "@/components/AdminCatalogAssignmentForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { requireAdmin } from "@/lib/admin";
import type { CatalogAssignmentItem, CatalogCategoryRow, CatalogType } from "@/types/catalog";

export const metadata: Metadata = { title: "Catálogo de apps e produtos" };

const typeLabels: Record<CatalogType, string> = {
  application: "Aplicativos",
  product: "Produtos recomendados",
};

export default async function AdminCatalogPage() {
  const { supabase } = await requireAdmin();
  const [categoriesResult, contentsResult] = await Promise.all([
    supabase
      .from("catalog_categories")
      .select("id, catalog_type, name, slug, description, sort_order, is_active, created_at, updated_at")
      .order("catalog_type", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("public_contents")
      .select("id, content_type, title, category, catalog_category_id, publication_status, is_published")
      .in("content_type", ["application", "product"])
      .order("content_type", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
  ]);

  const categories = (categoriesResult.data ?? []) as unknown as CatalogCategoryRow[];
  const items = (contentsResult.data ?? []) as unknown as CatalogAssignmentItem[];
  const migrationMissing = Boolean(categoriesResult.error?.message.includes("catalog_categories") || contentsResult.error?.message.includes("catalog_category_id"));

  return (
    <div className="admin-content-stack">
      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>CATÁLOGO JNE</span><h2><FolderCog size={22} /> Apps e produtos organizados</h2></div>
          <strong>{categories.length} categorias</strong>
        </div>
        <p className="admin-section__intro">Crie categorias, oculte as que não estiverem em uso e mova vários aplicativos ou produtos de uma vez. Os links manuais, arquivos e metadados dos itens não são alterados.</p>
        {migrationMissing ? <p className="auth-message auth-message--error">A migration 2.2.3 ainda não foi aplicada no Supabase.</p> : null}
      </section>

      <section className="admin-section">
        <div className="admin-section__heading"><div><span>NOVA CATEGORIA</span><h2><Plus size={22} /> Adicionar categoria</h2></div></div>
        <form className="admin-form" action={saveCatalogCategoryAction}>
          <div className="admin-form__grid admin-form__grid--wide">
            <label><span>Área</span><select name="catalogType" defaultValue="application"><option value="application">Aplicativos</option><option value="product">Produtos recomendados</option></select></label>
            <label><span>Nome</span><input name="name" required placeholder="Ex.: Players de vídeo" /></label>
            <label><span>Identificador</span><input name="slug" placeholder="Gerado automaticamente" /></label>
            <label><span>Ordem</span><input name="sortOrder" type="number" min="0" max="100000" defaultValue="100" /></label>
          </div>
          <label><span>Descrição</span><input name="description" placeholder="Explique o que pertence a esta categoria" /></label>
          <label className="admin-checkbox"><input name="isActive" type="checkbox" defaultChecked /><span>Categoria visível no catálogo</span></label>
          <button className="button button--primary" type="submit"><Plus size={17} /> Criar categoria</button>
        </form>
      </section>

      {(["application", "product"] as CatalogType[]).map((type) => {
        const typeCategories = categories.filter((category) => category.catalog_type === type);
        const typeItems = items.filter((item) => item.content_type === type);
        return (
          <section className="admin-section" key={type}>
            <div className="admin-section__heading"><div><span>{typeLabels[type].toUpperCase()}</span><h2>Categorias e itens</h2></div><strong>{typeItems.length} itens</strong></div>

            <div className="admin-catalog-category-grid">
              {typeCategories.map((category) => (
                <article className={`admin-catalog-category-card${category.is_active ? "" : " is-inactive"}`} key={category.id}>
                  <form className="admin-form" action={saveCatalogCategoryAction}>
                    <input type="hidden" name="categoryId" value={category.id} />
                    <input type="hidden" name="catalogType" value={category.catalog_type} />
                    <div className="admin-form__grid">
                      <label><span>Nome</span><input name="name" required defaultValue={category.name} /></label>
                      <label><span>Identificador</span><input name="slug" required defaultValue={category.slug} /></label>
                      <label><span>Ordem</span><input name="sortOrder" type="number" min="0" max="100000" defaultValue={category.sort_order} /></label>
                    </div>
                    <label><span>Descrição</span><input name="description" defaultValue={category.description ?? ""} /></label>
                    <label className="admin-checkbox"><input name="isActive" type="checkbox" defaultChecked={category.is_active} /><span>Visível</span></label>
                    <button className="button button--secondary" type="submit">Salvar categoria</button>
                  </form>
                  <div className="admin-inline-actions">
                    <form action={toggleCatalogCategoryAction}>
                      <input type="hidden" name="categoryId" value={category.id} />
                      <input type="hidden" name="isActive" value={category.is_active ? "false" : "true"} />
                      <button className="button button--secondary" type="submit">{category.is_active ? <><Archive size={16} /> Ocultar</> : <><ArchiveRestore size={16} /> Restaurar</>}</button>
                    </form>
                    <form action={deleteCatalogCategoryAction}>
                      <input type="hidden" name="categoryId" value={category.id} />
                      <ConfirmSubmitButton className="button button--danger" message="Excluir esta categoria? A exclusão só será permitida se ela estiver vazia."><Trash2 size={16} /> Excluir</ConfirmSubmitButton>
                    </form>
                  </div>
                </article>
              ))}
            </div>

            <AdminCatalogAssignmentForm type={type} items={typeItems} categories={typeCategories} />
          </section>
        );
      })}
    </div>
  );
}
