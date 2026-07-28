import type { Metadata } from "next";
import { ExternalLink, ShoppingBag, Tag } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { products } from "@/data/content";

export const metadata: Metadata = { title: "Produtos recomendados" };

export default function ProductsPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="SELEÇÃO DO JEAN"
        title="Produtos recomendados"
        description="Acessórios, tecnologia e itens automotivos reunidos em uma lista organizada para facilitar sua pesquisa."
      />

      <section className="content-summary" aria-label="Resumo da lista de produtos">
        <div>
          <ShoppingBag size={24} />
          <span>
            <strong>{products.length}</strong>
            produtos cadastrados
          </span>
        </div>
        <p>Preços, estoque e condições são definidos pelas lojas e podem mudar sem aviso.</p>
      </section>

      <section className="product-grid" aria-label="Produtos recomendados">
        {products.map((product) => (
          <article className="product-card" key={product.name}>
            <div className="product-card__topline">
              <span><Tag size={16} /> {product.category}</span>
              <small>{product.retailer}</small>
            </div>
            <div className="product-card__body">
              <h2>{product.name}</h2>
              <p>{product.description}</p>
              {product.highlight ? <strong>{product.highlight}</strong> : null}
            </div>
            <a
              className="button button--secondary"
              href={product.href}
              target="_blank"
              rel="noreferrer sponsored"
            >
              Consultar produto
              <ExternalLink size={16} />
            </a>
          </article>
        ))}
      </section>

      <section className="affiliate-notice">
        <ShoppingBag size={20} />
        <div>
          <strong>Links de afiliado</strong>
          <p>
            Algumas compras podem gerar comissão para o Jean na Estrada sem alterar o preço final para você. Sempre confira compatibilidade, vendedor e condições antes de comprar.
          </p>
        </div>
      </section>
    </div>
  );
}
