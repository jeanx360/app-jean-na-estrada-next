import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { deleteQuickAccessItemAction } from "@/app/admin/home/actions";
import { AdminHomeEditControl } from "@/components/AdminHomeEditControl";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { HomeCarousel } from "@/components/HomeCarousel";
import { LiveVideoGrid } from "@/components/LiveVideoGrid";
import { videos } from "@/data/content";
import { getAuthContext } from "@/lib/auth";
import { getHomeCarouselSlides } from "@/lib/home-carousel";
import {
  getHomeQuickAccessIcon,
  getHomeQuickAccessItems,
} from "@/lib/home-quick-access";
import {
  getHomeVisualBlockIcon,
  getHomeVisualBlocks,
} from "@/lib/home-visual-blocks";
import type { HomeVisualBlockRow } from "@/types/home-visual-block";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ modo?: string }> };

type EditableSurfaceProps = {
  admin: boolean;
  block: HomeVisualBlockRow;
  children: ReactNode;
  className?: string;
};

function EditableSurface({ admin, block, children, className = "admin-editable-block" }: EditableSurfaceProps) {
  if (!admin) return <>{children}</>;

  return (
    <div className={className}>
      <AdminHomeEditControl blockId={block.id} blockKey={block.block_key} />
      {children}
    </div>
  );
}

function HomeActionLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  if (/^https:\/\//i.test(href)) {
    return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
  }
  return <Link className={className} href={href}>{children}</Link>;
}

export default async function Home({ searchParams }: Props) {
  const { modo } = await searchParams;
  const { profile } = await getAuthContext();

  if (profile?.is_professional_driver && profile.preferred_home === "driver" && modo !== "conteudo") {
    redirect("/motorista");
  }

  const [carouselSlides, quickAccessItems, visualBlocks] = await Promise.all([
    getHomeCarouselSlides(),
    getHomeQuickAccessItems(),
    getHomeVisualBlocks(),
  ]);
  const isAdmin = profile?.role === "admin";
  const renderedGroups = new Set<string>();

  return (
    <div className="page-stack">
      {visualBlocks.map((block) => {
        if (block.block_type === "carousel") {
          return (
            <EditableSurface admin={isAdmin} block={block} key={block.id}>
              <HomeCarousel slides={carouselSlides} />
            </EditableSurface>
          );
        }

        if (block.block_type === "cta" && block.variant !== "community") {
          const Icon = getHomeVisualBlockIcon(block.icon);
          return (
            <EditableSurface admin={isAdmin} block={block} key={block.id}>
              <section className="commercial-start-section">
                <div>
                  {block.eyebrow ? <span className="eyebrow"><Icon size={15} /> {block.eyebrow}</span> : null}
                  {block.title ? <h2>{block.title}</h2> : null}
                  {block.description ? <p>{block.description}</p> : null}
                </div>
                <div className="commercial-start-section__actions">
                  {block.action_url && block.action_label ? (
                    <HomeActionLink className="button button--primary" href={block.action_url}>
                      {block.action_label} <ArrowRight size={17} />
                    </HomeActionLink>
                  ) : null}
                  {block.secondary_action_url && block.secondary_action_label ? (
                    <HomeActionLink className="button button--secondary" href={block.secondary_action_url}>
                      {block.secondary_action_label}
                    </HomeActionLink>
                  ) : null}
                </div>
              </section>
            </EditableSurface>
          );
        }

        if (block.block_type === "utility") {
          if (renderedGroups.has("utility")) return null;
          renderedGroups.add("utility");
          const utilityBlocks = visualBlocks.filter((item) => item.block_type === "utility");
          return (
            <section className="home-utility-section" key="home-utility-group">
              <div className="home-utility-grid">
                {utilityBlocks.map((utility) => {
                  const Icon = getHomeVisualBlockIcon(utility.icon);
                  const card = utility.action_url ? (
                    <HomeActionLink
                      className={`home-utility-card home-utility-card--${utility.variant}`}
                      href={utility.action_url}
                    >
                      <div className="home-utility-card__icon"><Icon size={27} /></div>
                      <div>
                        {utility.eyebrow ? <span>{utility.eyebrow}</span> : null}
                        {utility.title ? <h2>{utility.title}</h2> : null}
                        {utility.description ? <p>{utility.description}</p> : null}
                      </div>
                      {utility.action_label ? <strong>{utility.action_label} <ArrowRight size={18} /></strong> : null}
                    </HomeActionLink>
                  ) : (
                    <article className={`home-utility-card home-utility-card--${utility.variant}`}>
                      <div className="home-utility-card__icon"><Icon size={27} /></div>
                      <div>
                        {utility.eyebrow ? <span>{utility.eyebrow}</span> : null}
                        {utility.title ? <h2>{utility.title}</h2> : null}
                        {utility.description ? <p>{utility.description}</p> : null}
                      </div>
                    </article>
                  );

                  return (
                    <EditableSurface admin={isAdmin} block={utility} className="admin-editable-card" key={utility.id}>
                      {card}
                    </EditableSurface>
                  );
                })}
              </div>
            </section>
          );
        }

        if (block.block_type === "quick_access") {
          return (
            <EditableSurface admin={isAdmin} block={block} key={block.id}>
              <section className="section-block">
                <div className="section-heading">
                  <div>
                    {block.eyebrow ? <span className="eyebrow">{block.eyebrow}</span> : null}
                    {block.title ? <h2>{block.title}</h2> : null}
                  </div>
                  {block.description ? <p>{block.description}</p> : null}
                </div>
                <div className="quick-access-grid">
                  {quickAccessItems.map((item) => {
                    const Icon = getHomeQuickAccessIcon(item.icon);
                    const card = (
                      <Link href={item.href} className={`quick-card quick-card--${item.accent}`}>
                        <div className="quick-card__icon"><Icon size={24} /></div>
                        <div><h3>{item.title}</h3><p>{item.description}</p></div>
                        <ArrowRight className="quick-card__arrow" size={19} />
                      </Link>
                    );

                    if (!isAdmin) return <div className="quick-card-slot" key={item.id}>{card}</div>;

                    return (
                      <div className="admin-editable-card" key={item.id}>
                        <div className="admin-home-edit-controls" aria-label={`Editar atalho ${item.title}`}>
                          <Link
                            className="admin-home-edit-button"
                            href={`/admin/home?quickEdit=${encodeURIComponent(item.id)}#quick-access-form`}
                            title="Editar este atalho"
                            aria-label={`Editar ${item.title}`}
                          >
                            <Pencil size={15} />
                          </Link>
                          <form action={deleteQuickAccessItemAction}>
                            <input type="hidden" name="itemId" value={item.id} />
                            <ConfirmSubmitButton
                              className="admin-home-edit-button admin-home-edit-button--danger"
                              message="Excluir este atalho da home para todos os usuários?"
                              title="Excluir este atalho"
                              aria-label={`Excluir ${item.title}`}
                            >
                              <Trash2 size={15} />
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                        {card}
                      </div>
                    );
                  })}
                </div>
              </section>
            </EditableSurface>
          );
        }

        if (block.block_type === "videos") {
          return (
            <EditableSurface admin={isAdmin} block={block} key={block.id}>
              <section className="section-block" id="videos">
                <div className="section-heading section-heading--inline">
                  <div>
                    {block.eyebrow ? <span className="eyebrow">{block.eyebrow}</span> : null}
                    {block.title ? <h2>{block.title}</h2> : null}
                  </div>
                  {block.action_url && block.action_label ? (
                    <HomeActionLink href={block.action_url} className="text-link">
                      {block.action_label} <ArrowRight size={17} />
                    </HomeActionLink>
                  ) : null}
                </div>
                <LiveVideoGrid fallback={videos} limit={3} />
              </section>
            </EditableSurface>
          );
        }

        if (block.block_type === "cta" && block.variant === "community") {
          const Icon = getHomeVisualBlockIcon(block.icon);
          return (
            <EditableSurface admin={isAdmin} block={block} key={block.id}>
              <section className="community-section">
                <div className="community-section__icon"><Icon size={30} /></div>
                <div className="community-section__content">
                  {block.eyebrow ? <span className="eyebrow">{block.eyebrow}</span> : null}
                  {block.title ? <h2>{block.title}</h2> : null}
                  {block.description ? <p>{block.description}</p> : null}
                </div>
                {block.action_url && block.action_label ? (
                  <HomeActionLink href={block.action_url} className="button button--primary">
                    {block.action_label} <ArrowRight size={17} />
                  </HomeActionLink>
                ) : null}
              </section>
            </EditableSurface>
          );
        }

        if (block.block_type === "trust") {
          if (renderedGroups.has("trust")) return null;
          renderedGroups.add("trust");
          const trustBlocks = visualBlocks.filter((item) => item.block_type === "trust");
          return (
            <section className="trust-grid" key="home-trust-group">
              {trustBlocks.map((trust) => {
                const Icon = getHomeVisualBlockIcon(trust.icon);
                return (
                  <EditableSurface admin={isAdmin} block={trust} className="admin-editable-card" key={trust.id}>
                    <article>
                      <Icon size={23} />
                      <div>
                        {trust.title ? <h2>{trust.title}</h2> : null}
                        {trust.description ? <p>{trust.description}</p> : null}
                      </div>
                    </article>
                  </EditableSurface>
                );
              })}
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}
