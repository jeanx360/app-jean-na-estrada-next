"use client";

type CatalogCategoryOption = {
  id: string;
  slug: string;
  name: string;
  count: number;
};

type CatalogCategorySelectProps = {
  typeValue: "aplicativos" | "produtos";
  selectedCategory: string;
  search: string;
  totalCount: number;
  categories: CatalogCategoryOption[];
};

export function CatalogCategorySelect({
  typeValue,
  selectedCategory,
  search,
  totalCount,
  categories,
}: CatalogCategorySelectProps) {
  return (
    <form method="get" className="catalog-category-select-form">
      <input type="hidden" name="tipo" value={typeValue} />
      {search ? <input type="hidden" name="busca" value={search} /> : null}

      <label htmlFor="catalog-category-select">
        <span>Categoria</span>
        <select
          id="catalog-category-select"
          name="categoria"
          value={selectedCategory}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="">Todas as categorias ({totalCount})</option>
          {categories.map((category) => (
            <option value={category.slug} key={category.id}>
              {category.name} ({category.count})
            </option>
          ))}
        </select>
      </label>

      <noscript>
        <button className="button button--secondary" type="submit">
          Aplicar categoria
        </button>
      </noscript>
    </form>
  );
}
