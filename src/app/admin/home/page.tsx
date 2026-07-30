import type { Metadata } from "next";
import Link from "next/link";
import { Eye, EyeOff, Images, ImageUp, LayoutGrid, Pencil, Trash2 } from "lucide-react";
import {
  deleteHomeSlideAction,
  deleteQuickAccessItemAction,
  toggleHomeSlideAction,
  toggleQuickAccessItemAction,
} from "@/app/admin/home/actions";
import { AdminHomeCarouselForm } from "@/components/AdminHomeCarouselForm";
import { AdminPublicAssetUploader } from "@/components/AdminPublicAssetUploader";
import { AdminQuickAccessForm } from "@/components/AdminQuickAccessForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { requireAdmin } from "@/lib/admin";
import type { HomeCarouselRow } from "@/types/home-carousel";
import type { HomeQuickAccessRow } from "@/types/home-quick-access";

export const metadata: Metadata = { title: "Personalização da página inicial" };

type Props = { searchParams: Promise<{ edit?: string; quickEdit?: string }> };

const sourceLabels = {
  custom: "Personalizado",
  latest_video: "Último vídeo",
  latest_news: "Última notícia",
  public_content: "Publicação",
} as const;

export default async function AdminHomePage({ searchParams }: Props) {
  const { edit, quickEdit } = await searchParams;
  const { supabase } = await requireAdmin();
  const [quickItemsResult, slidesResult, contentsResult] = await Promise.all([
    supabase
      .from("home_quick_access_items")
      .select("id, title, description, href, icon, accent, sort_order, is_published, created_at, updated_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("home_carousel_slides")
      .select(
        "id, source_type, public_content_id, badge, title, description, action_label, action_url, image_url, image_path, sort_order, is_published, starts_at, ends_at, created_at, updated_at, public_contents(id, content_type, title, summary, image_url, external_url, slug)",
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("public_contents")
      .select("id, title, content_type")
      .eq("is_published", true)
      .order("content_type", { ascending: true })
      .order("title", { ascending: true }),
  ]);

  const quickItems = (quickItemsResult.data ?? []) as HomeQuickAccessRow[];
  const slides = (slidesResult.data ?? []) as unknown as HomeCarouselRow[];
  const contents = (contentsResult.data ?? []) as Array<{ id: string; title: string; content_type: string }>;
  const initialQuickItem = quickEdit ? quickItems.find((item) => item.id === quickEdit) ?? null : null;
  const initialSlide = edit ? slides.find((item) => item.id === edit) ?? null : null;

  return (
    <div className="admin-content-stack">
      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>{initialQuickItem ? "EDITAR ATALHO" : "NOVO ATALHO"}</span><h2><LayoutGrid size={22} /> Acesso rápido da home</h2></div>
          <strong>{quickItems.length}</strong>
        </div>
        <p className="admin-section__intro">
          Escolha os cartões que aparecem logo abaixo do carrossel. Você controla título, descrição, ícone, cor, destino, ordem e visibilidade.
        </p>

        {quickItemsResult.error ? (
          <p className="auth-message auth-message--error">
            A tabela dos atalhos ainda não existe. Execute a migração 1.4.1 no Supabase.
          </p>
        ) : <AdminQuickAccessForm initialData={initialQuickItem} />}

        <div className="admin-quick-access-list">
          {quickItems.map((item) => (
            <article key={item.id}>
              <div>
                <span className={`admin-status ${item.is_published ? "" : "admin-status--warning"}`}>
                  {item.is_published ? "Visível" : "Oculto"}
                </span>
                <small>Ordem {item.sort_order} · {item.icon} · {item.accent}</small>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <code>{item.href}</code>
              </div>
              <div className="admin-inline-actions">
                <Link className="button button--secondary" href={`/admin/home?quickEdit=${item.id}#quick-access-form`}>
                  <Pencil size={16} /> Editar
                </Link>
                <form action={toggleQuickAccessItemAction}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="publish" value={item.is_published ? "false" : "true"} />
                  <button className="button button--secondary" type="submit">
                    {item.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                    {item.is_published ? "Ocultar" : "Exibir"}
                  </button>
                </form>
                <form action={deleteQuickAccessItemAction}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <ConfirmSubmitButton className="button button--danger" message="Excluir este atalho da página inicial?">
                    <Trash2 size={16} /> Excluir
                  </ConfirmSubmitButton>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>IMAGENS DO CARROSSEL</span><h2><ImageUp size={22} /> Enviar imagem</h2></div>
        </div>
        <p className="admin-section__intro">
          A imagem enviada será aplicada automaticamente ao formulário abaixo. Prefira arquivos horizontais, com boa leitura também no celular.
        </p>
        <AdminPublicAssetUploader />
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>{initialSlide ? "EDITAR DESTAQUE" : "NOVO DESTAQUE"}</span><h2><Images size={22} /> Carrossel da página inicial</h2></div>
        </div>
        <p className="admin-section__intro">
          Combine mensagens próprias, último vídeo, notícia recente e publicações cadastradas. A ordem menor aparece primeiro.
        </p>
        <AdminHomeCarouselForm initialData={initialSlide} contents={contents} />
      </section>

      <section className="admin-section">
        <div className="admin-section__heading">
          <div><span>DESTAQUES CADASTRADOS</span><h2>Ordem e visibilidade</h2></div>
          <strong>{slides.length}</strong>
        </div>

        {slidesResult.error ? (
          <p className="auth-message auth-message--error">
            {slidesResult.error.message.includes("home_carousel_slides")
              ? "A tabela do carrossel ainda não existe. Execute a migração 1.1.0 no Supabase."
              : slidesResult.error.message}
          </p>
        ) : null}

        <div className="admin-list admin-list--grid">
          {slides.map((slide) => (
            <article className="admin-list-card admin-list-card--stacked" key={slide.id}>
              {slide.image_url ? <img className="admin-list-card__cover" src={slide.image_url} alt="" /> : null}
              <div>
                <div className="admin-list-card__meta">
                  <span className={`admin-status ${slide.is_published ? "" : "admin-status--warning"}`}>
                    {slide.is_published ? "Publicado" : "Oculto"}
                  </span>
                  <span>{sourceLabels[slide.source_type]}</span>
                  <span>Ordem {slide.sort_order}</span>
                </div>
                <h3>{slide.title || slide.public_contents?.title || sourceLabels[slide.source_type]}</h3>
                <p>{slide.description || slide.public_contents?.summary || "Conteúdo resolvido automaticamente na página inicial."}</p>
                {slide.starts_at || slide.ends_at ? (
                  <small>
                    {slide.starts_at ? `Início: ${new Date(slide.starts_at).toLocaleString("pt-BR")}` : "Início imediato"}
                    {" · "}
                    {slide.ends_at ? `Término: ${new Date(slide.ends_at).toLocaleString("pt-BR")}` : "Sem término"}
                  </small>
                ) : null}
              </div>

              <div className="admin-inline-actions">
                <Link className="button button--secondary" href={`/admin/home?edit=${slide.id}#home-carousel-form`}>
                  <Pencil size={16} /> Editar
                </Link>
                <form action={toggleHomeSlideAction}>
                  <input type="hidden" name="slideId" value={slide.id} />
                  <input type="hidden" name="publish" value={slide.is_published ? "false" : "true"} />
                  <button className="button button--secondary" type="submit">
                    {slide.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                    {slide.is_published ? "Ocultar" : "Publicar"}
                  </button>
                </form>
                <form action={deleteHomeSlideAction}>
                  <input type="hidden" name="slideId" value={slide.id} />
                  <ConfirmSubmitButton className="button button--danger" message="Excluir definitivamente este destaque do carrossel?">
                    <Trash2 size={16} /> Excluir
                  </ConfirmSubmitButton>
                </form>
              </div>
            </article>
          ))}
          {!slides.length && !slidesResult.error ? <p className="admin-empty">Nenhum destaque cadastrado.</p> : null}
        </div>
      </section>
    </div>
  );
}
