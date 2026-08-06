import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  CloudDownload,
  ExternalLink,
  FileArchive,
  Fingerprint,
  Globe2,
  LockKeyhole,
  PackageCheck,
  Search,
  SearchX,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Tag,
} from "lucide-react";
import { CatalogCategorySelect } from "@/components/CatalogCategorySelect";
import { PageHeader } from "@/components/PageHeader";
import { getCatalogCategories } from "@/lib/catalog";
import { getApplications, getProducts } from "@/lib/public-content";
import { publicPath } from "@/lib/public-path";
import type { CatalogType } from "@/types/catalog";

export const metadata: Metadata = {
  title: "Apps e produtos",
  description: "Catálogo organizado de aplicativos automotivos e produtos recomendados pelo Jean na Estrada.",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tipo?: string | string[];
  categoria?: string | string[];
  busca?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const titleCollator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  numeric: true,
  ignorePunctuation: true,
});

function compareTitles(left: string, right: string) {
  return titleCollator.compare(left.trim(), right.trim());
}

function formatFileSize(value?: number) {
  if (!value || value < 1) return null;
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
}

function catalogHref(type: CatalogType, category = "", search = "") {
  const params = new URLSearchParams();
  params.set("tipo", type === "application" ? "aplicativos" : "produtos");
  if (category) params.set("categoria", category);
  if (search) params.set("busca", search);
  return `/catalogo?${params.toString()}`;
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const type: CatalogType = single(params.tipo) === "produtos" ? "product" : "application";
  const categorySlug = single(params.categoria).trim();
  const search = single(params.busca).trim();
  const normalizedSearch = normalize(search);

  const [applications, products, categories] = await Promise.all([
    getApplications(),
    getProducts(),
    getCatalogCategories(type),
  ]);

  const sortedCategories = [...categories].sort((left, right) => compareTitles(left.name, right.name));
  const sortedApplications = [...applications].sort((left, right) => compareTitles(left.name, right.name));
  const sortedProducts = [...products].sort((left, right) => compareTitles(left.name, right.name));

  const selectedCategory = sortedCategories.find((category) => category.slug === categorySlug) ?? null;
  const selectedCategoryName = selectedCategory ? normalize(selectedCategory.name) : "";

  const visibleApplications = sortedApplications.filter((application) => {
    const categoryMatches = !selectedCategoryName || normalize(application.category) === selectedCategoryName;
    const searchMatches = !normalizedSearch || normalize([
      application.name,
      application.description,
      application.category,
      application.compatibility,
      application.origin ?? "",
      application.version ?? "",
      ...(application.tags ?? []),
    ].join(" ")).includes(normalizedSearch);
    return categoryMatches && searchMatches;
  });

  const visibleProducts = sortedProducts.filter((product) => {
    const categoryMatches = !selectedCategoryName || normalize(product.category) === selectedCategoryName;
    const searchMatches = !normalizedSearch || normalize([
      product.name,
      product.description,
      product.category,
      product.retailer,
      product.highlight ?? "",
      ...(product.tags ?? []),
    ].join(" ")).includes(normalizedSearch);
    return categoryMatches && searchMatches;
  });

  const visibleCount = type === "application" ? visibleApplications.length : visibleProducts.length;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="CATÁLOGO JNE"
        title="Apps e produtos"
        description="Aplicativos e produtos recomendados organizados por tipo e categoria, sem misturar os itens e sem alterar os links cadastrados."
      />

      <nav className="catalog-type-tabs" aria-label="Escolher área do catálogo">
        <Link className={type === "application" ? "is-active" : ""} href={catalogHref("application", "", search)}>
          <Smartphone size={18} /> Aplicativos <strong>{applications.length}</strong>
        </Link>
        <Link className={type === "product" ? "is-active" : ""} href={catalogHref("product", "", search)}>
          <ShoppingBag size={18} /> Produtos recomendados <strong>{products.length}</strong>
        </Link>
      </nav>

      <section className="catalog-toolbar" aria-label="Filtros do catálogo">
        <form method="get" className="catalog-search-form">
          <input type="hidden" name="tipo" value={type === "application" ? "aplicativos" : "produtos"} />
          {categorySlug ? <input type="hidden" name="categoria" value={categorySlug} /> : null}
          <label>
            <Search size={18} />
            <input name="busca" defaultValue={search} placeholder={type === "application" ? "Buscar aplicativo, compatibilidade..." : "Buscar produto, loja, categoria..."} />
          </label>
          <button className="button button--primary" type="submit">Buscar</button>
          {search ? <Link className="button button--secondary" href={catalogHref(type, categorySlug)}>Limpar</Link> : null}
        </form>

        <CatalogCategorySelect
          typeValue={type === "application" ? "aplicativos" : "produtos"}
          selectedCategory={selectedCategory?.slug ?? ""}
          search={search}
          totalCount={type === "application" ? sortedApplications.length : sortedProducts.length}
          categories={sortedCategories.map((category) => ({
            id: category.id,
            slug: category.slug,
            name: category.name,
            count: type === "application"
              ? sortedApplications.filter((item) => normalize(item.category) === normalize(category.name)).length
              : sortedProducts.filter((item) => normalize(item.category) === normalize(category.name)).length,
          }))}
        />
      </section>

      <section className="catalog-results-summary" aria-live="polite">
        <div>
          <span>{type === "application" ? "APLICATIVOS" : "PRODUTOS RECOMENDADOS"}</span>
          <strong>{visibleCount} item(ns)</strong>
        </div>
        <p>{selectedCategory ? `Categoria: ${selectedCategory.name}` : "Todas as categorias"}{search ? ` · Busca: “${search}”` : ""}</p>
      </section>

      {type === "application" ? (
        <section className="apps-grid" aria-label="Aplicativos disponíveis">
          {visibleApplications.map((application) => {
            const isUpload = application.deliveryType === "upload";
            const isVip = application.accessLevel === "vip";
            const size = formatFileSize(application.fileSize);
            const imageSrc = application.image
              ? /^https?:\/\//i.test(application.image)
                ? application.image
                : publicPath(application.image)
              : null;

            return (
              <article className={`app-card app-card--complete${imageSrc ? " app-card--with-banner" : ""}`} key={application.id ?? application.name}>
                {imageSrc ? <div className="app-card__banner"><img src={imageSrc} alt={`Imagem do aplicativo ${application.name}`} loading="lazy" /></div> : null}
                <div className="app-card__body">
                  <div className="app-card__topline">
                    <span className="app-card__icon"><PackageCheck size={24} /></span>
                    <div className="app-card__badges">
                      <span className="status-pill">{application.category}</span>
                      <span className="status-pill">{application.status}</span>
                      {isVip ? <span className="status-pill status-pill--vip"><LockKeyhole size={12} /> VIP</span> : null}
                    </div>
                  </div>
                  <div className="app-card__heading">
                    <div><span>{isUpload ? "ARQUIVO NO JNE APP" : "APLICATIVO EXTERNO"}</span><h2>{application.name}</h2></div>
                    {application.version ? <strong>v{application.version}</strong> : null}
                  </div>
                  <p>{application.description}</p>
                  <dl>
                    <div><dt>Compatibilidade informada</dt><dd>{application.compatibility}</dd></div>
                    <div><dt>Origem</dt><dd>{application.origin || "Origem não informada"}</dd></div>
                    <div><dt>Forma de acesso</dt><dd>{isUpload ? <><FileArchive size={14} /> Download pelo JNE App{size ? ` · ${size}` : ""}</> : <><Globe2 size={14} /> Site ou repositório externo</>}</dd></div>
                    {application.fileName ? <div><dt>Arquivo</dt><dd>{application.fileName}</dd></div> : null}
                  </dl>
                  {application.checksumSha256 ? <details className="app-checksum"><summary><Fingerprint size={15} /> Ver checksum SHA-256</summary><code>{application.checksumSha256}</code></details> : null}
                  <a className="button button--primary app-card__action" href={application.href} target="_blank" rel="noreferrer">
                    {isUpload ? <CloudDownload size={17} /> : <ExternalLink size={17} />}
                    {application.buttonLabel || (isUpload ? "Baixar arquivo" : "Abrir aplicativo")}
                  </a>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="product-grid catalog-product-grid" aria-label="Produtos recomendados">
          {visibleProducts.map((product) => {
            const imageSrc = product.image
              ? /^https?:\/\//i.test(product.image)
                ? product.image
                : publicPath(product.image)
              : null;
            return (
              <article className={`product-card${imageSrc ? " product-card--with-image" : ""}`} key={product.id ?? product.name}>
                {imageSrc ? <div className="product-card__image"><img src={imageSrc} alt={`Imagem do produto ${product.name}`} loading="lazy" /></div> : null}
                <div className="product-card__topline"><span><Tag size={16} /> {product.category}</span><small>{product.retailer}</small></div>
                <div className="product-card__body"><h2>{product.name}</h2><p>{product.description}</p>{product.highlight ? <strong>{product.highlight}</strong> : null}</div>
                <a className="button button--secondary" href={product.href} target="_blank" rel="noreferrer sponsored">Consultar produto <ExternalLink size={16} /></a>
              </article>
            );
          })}
        </section>
      )}

      {!visibleCount ? (
        <section className="catalog-search-empty">
          <SearchX size={28} />
          <strong>Nenhum item encontrado.</strong>
          <p>Escolha outra categoria, tente outro termo ou limpe os filtros.</p>
          <Link className="button button--secondary" href={catalogHref(type)}>Ver todos</Link>
        </section>
      ) : null}

      {type === "product" ? (
        <section className="affiliate-notice"><ShoppingBag size={20} /><div><strong>Links cadastrados manualmente</strong><p>Os endereços informados pelo administrador são preservados. Algumas compras podem gerar comissão sem alterar o preço final para você. Confira vendedor, compatibilidade, estoque e condições antes de comprar.</p></div></section>
      ) : (
        <section className="security-panel"><div className="security-panel__icon"><ShieldCheck size={28} /></div><div><span>CATÁLOGO ORGANIZADO</span><h2>Arquivos próprios e fontes externas no mesmo lugar.</h2><p>Use aplicativos somente com o veículo parado e confira origem, compatibilidade, versão e checksum antes da instalação.</p></div><BadgeCheck size={25} /></section>
      )}
    </div>
  );
}
