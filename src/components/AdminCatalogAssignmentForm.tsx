import { FolderInput } from "lucide-react";
import { assignCatalogCategoryAction } from "@/app/admin/catalogo/actions";
import type { CatalogAssignmentItem, CatalogCategoryRow, CatalogType } from "@/types/catalog";

export function AdminCatalogAssignmentForm({
  type,
  items,
  categories,
}: {
  type: CatalogType;
  items: CatalogAssignmentItem[];
  categories: CatalogCategoryRow[];
}) {
  return (
    <form className="admin-catalog-assignment" action={assignCatalogCategoryAction}>
      <input type="hidden" name="catalogType" value={type} />
      <div className="admin-catalog-assignment__toolbar">
        <label>
          <span>Categoria de destino</span>
          <select name="catalogCategoryId" required defaultValue="">
            <option value="" disabled>Escolha uma categoria</option>
            {categories.map((category) => <option value={category.id} key={category.id}>{category.name}{category.is_active ? "" : " (oculta)"}</option>)}
          </select>
        </label>
        <button className="button button--primary" type="submit"><FolderInput size={17} /> Aplicar aos selecionados</button>
      </div>

      <div className="admin-catalog-assignment__items">
        {items.map((item) => (
          <label className="admin-catalog-assignment__item" key={item.id}>
            <input type="checkbox" name="contentIds" value={item.id} />
            <span>
              <strong>{item.title}</strong>
              <small>{item.category || "Sem categoria"} · {item.publication_status === "published" || item.is_published ? "Publicado" : item.publication_status === "archived" ? "Arquivado" : "Rascunho"}</small>
            </span>
          </label>
        ))}
      </div>
      {!items.length ? <p className="admin-empty-state">Nenhum item cadastrado nesta área.</p> : null}
    </form>
  );
}
