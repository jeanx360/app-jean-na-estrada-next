import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  LockKeyhole,
  MessageCircle,
  Pin,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Unlock,
  UsersRound,
} from "lucide-react";
import { AdminCommunityCategoryForm } from "@/components/AdminCommunityCategoryForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import {
  moderateCommunityCommentAction,
  moderateCommunityPostAction,
  resolveCommunityReportAction,
  toggleCommunityCategoryAction,
  updateCommunityRestrictionAction,
} from "@/app/comunidade/actions";
import { requireAdmin } from "@/lib/admin";
import { formatCommunityDate } from "@/lib/community";
import type { CommunityCategory, CommunityCommentRow, CommunityPostRow } from "@/types/community";

type MemberRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "member" | "vip" | "admin";
  is_blocked: boolean;
};

type ReportRow = {
  id: string;
  reporter_id: string;
  target_type: "post" | "comment";
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

type RestrictionRow = {
  user_id: string;
  can_post: boolean;
  can_comment: boolean;
  restricted_until: string | null;
  reason: string | null;
};

const reasonLabels: Record<string, string> = {
  spam: "Spam ou propaganda",
  abuse: "Ofensa, assédio ou abuso",
  misinformation: "Informação perigosa ou enganosa",
  copyright: "Direitos autorais",
  other: "Outro motivo",
};

export default async function AdminCommunityPage() {
  const { supabase, userId } = await requireAdmin();

  const [categoriesResult, reportsResult, postsResult, restrictionsResult, membersResult] = await Promise.all([
    supabase
      .from("community_categories")
      .select("id, slug, name, description, icon, sort_order, is_active")
      .order("sort_order", { ascending: true }),
    supabase
      .from("community_reports")
      .select("id, reporter_id, target_type, post_id, comment_id, reason, details, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("community_posts")
      .select("id, author_id, category_id, title, body, image_path, poll_question, is_pinned, is_locked, is_hidden, hidden_reason, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("community_member_restrictions")
      .select("user_id, can_post, can_comment, restricted_until, reason"),
    supabase.rpc("admin_list_members"),
  ]);

  const categories = (categoriesResult.data ?? []) as CommunityCategory[];
  const reports = (reportsResult.data ?? []) as ReportRow[];
  const posts = (postsResult.data ?? []) as CommunityPostRow[];
  const restrictions = (restrictionsResult.data ?? []) as RestrictionRow[];
  const allMembers = (membersResult.data ?? []) as MemberRow[];
  const eligibleMembers = allMembers.filter(
    (member) => member.role === "vip" || member.role === "admin",
  );

  const reportCommentIds = reports
    .map((report) => report.comment_id)
    .filter((id): id is string => Boolean(id));
  const { data: reportCommentsData } = reportCommentIds.length
    ? await supabase
        .from("community_comments")
        .select("id, post_id, author_id, parent_comment_id, body, is_hidden, hidden_reason, created_at, updated_at")
        .in("id", reportCommentIds)
    : { data: [] as CommunityCommentRow[] };
  const reportComments = (reportCommentsData ?? []) as CommunityCommentRow[];

  const memberMap = new Map(allMembers.map((member) => [member.id, member]));
  const postMap = new Map(posts.map((post) => [post.id, post]));
  const commentMap = new Map(reportComments.map((comment) => [comment.id, comment]));
  const activeRestrictions = restrictions.filter((restriction) =>
    (!restriction.can_post || !restriction.can_comment)
    && (!restriction.restricted_until || new Date(restriction.restricted_until) > new Date()),
  );

  return (
    <div className="admin-section-stack admin-community-page">
      <section className="admin-summary-grid admin-community-summary">
        <article><MessageCircle size={22} /><span>Publicações recentes</span><strong>{posts.length}</strong></article>
        <article><Flag size={22} /><span>Denúncias pendentes</span><strong>{reports.length}</strong></article>
        <article><Ban size={22} /><span>Restrições ativas</span><strong>{activeRestrictions.length}</strong></article>
        <article><UsersRound size={22} /><span>Participantes elegíveis</span><strong>{eligibleMembers.length}</strong></article>
      </section>

      <section className="admin-panel-card">
        <div className="admin-panel-card__heading">
          <div><span>CATEGORIAS</span><h2>Organização da comunidade</h2></div>
          <ShieldCheck size={24} />
        </div>
        <AdminCommunityCategoryForm />
        <div className="admin-community-category-list">
          {categories.map((category) => (
            <article key={category.id} className={!category.is_active ? "is-inactive" : ""}>
              <div><strong>{category.name}</strong><span>/{category.slug} · ordem {category.sort_order}</span><p>{category.description}</p></div>
              <form action={toggleCommunityCategoryAction}>
                <input type="hidden" name="categoryId" value={category.id} />
                <input type="hidden" name="active" value={category.is_active ? "false" : "true"} />
                <button className="button button--secondary" type="submit">
                  {category.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                  {category.is_active ? "Desativar" : "Ativar"}
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-panel-card">
        <div className="admin-panel-card__heading">
          <div><span>MODERAÇÃO</span><h2>Denúncias pendentes</h2></div>
          <AlertTriangle size={24} />
        </div>
        <div className="admin-community-report-list">
          {reports.map((report) => {
            const reporter = memberMap.get(report.reporter_id);
            const post = report.post_id ? postMap.get(report.post_id) : null;
            const comment = report.comment_id ? commentMap.get(report.comment_id) : null;
            const relatedPost = post || (comment ? postMap.get(comment.post_id) : null);
            return (
              <article key={report.id}>
                <header>
                  <span>{reasonLabels[report.reason] || report.reason}</span>
                  <small>{formatCommunityDate(report.created_at)}</small>
                </header>
                <h3>{relatedPost?.title || "Conteúdo não disponível"}</h3>
                <p>{comment?.body || post?.body || report.details || "Sem detalhes adicionais."}</p>
                <small>Denunciado por {reporter?.full_name || reporter?.email || report.reporter_id}</small>

                <div className="admin-community-report-actions">
                  {report.target_type === "post" && report.post_id ? (
                    <form action={moderateCommunityPostAction}>
                      <input type="hidden" name="postId" value={report.post_id} />
                      <input type="hidden" name="operation" value="hide" />
                      <input type="hidden" name="reason" value={reasonLabels[report.reason] || report.reason} />
                      <button className="button button--secondary" type="submit"><EyeOff size={16} /> Ocultar publicação</button>
                    </form>
                  ) : null}
                  {report.target_type === "comment" && report.comment_id && comment ? (
                    <form action={moderateCommunityCommentAction}>
                      <input type="hidden" name="commentId" value={report.comment_id} />
                      <input type="hidden" name="postId" value={comment.post_id} />
                      <input type="hidden" name="operation" value="hide" />
                      <input type="hidden" name="reason" value={reasonLabels[report.reason] || report.reason} />
                      <button className="button button--secondary" type="submit"><EyeOff size={16} /> Ocultar comentário</button>
                    </form>
                  ) : null}
                  <form action={resolveCommunityReportAction} className="admin-community-resolution-form">
                    <input type="hidden" name="reportId" value={report.id} />
                    <select name="status" defaultValue="actioned">
                      <option value="actioned">Ação tomada</option>
                      <option value="reviewed">Analisada</option>
                      <option value="dismissed">Descartada</option>
                    </select>
                    <input name="notes" placeholder="Observação da análise" maxLength={500} />
                    <button className="button button--primary" type="submit"><CheckCircle2 size={16} /> Concluir</button>
                  </form>
                </div>
              </article>
            );
          })}
          {!reports.length ? <div className="admin-empty-state"><CheckCircle2 size={30} /><strong>Nenhuma denúncia pendente</strong><p>A fila de moderação está limpa.</p></div> : null}
        </div>
      </section>

      <section className="admin-panel-card">
        <div className="admin-panel-card__heading">
          <div><span>PUBLICAÇÕES</span><h2>Controle do feed</h2></div>
          <MessageCircle size={24} />
        </div>
        <div className="admin-community-post-list">
          {posts.map((post) => {
            const author = memberMap.get(post.author_id);
            return (
              <article key={post.id} className={post.is_hidden ? "is-hidden" : ""}>
                <div>
                  <span>{post.is_pinned ? "FIXADO" : "PUBLICAÇÃO"} · {formatCommunityDate(post.created_at)}</span>
                  <h3>{post.title}</h3>
                  <p>{post.body.slice(0, 220)}{post.body.length > 220 ? "…" : ""}</p>
                  <small>{author?.full_name || author?.email || post.author_id}</small>
                </div>
                <div className="admin-community-post-actions">
                  <form action={moderateCommunityPostAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="operation" value={post.is_pinned ? "unpin" : "pin"} />
                    <button className="icon-button" type="submit" title={post.is_pinned ? "Desafixar" : "Fixar"}><Pin size={17} /></button>
                  </form>
                  <form action={moderateCommunityPostAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="operation" value={post.is_locked ? "unlock" : "lock"} />
                    <button className="icon-button" type="submit" title={post.is_locked ? "Desbloquear" : "Bloquear comentários"}>{post.is_locked ? <Unlock size={17} /> : <LockKeyhole size={17} />}</button>
                  </form>
                  <form action={moderateCommunityPostAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="operation" value={post.is_hidden ? "restore" : "hide"} />
                    <button className="icon-button" type="submit" title={post.is_hidden ? "Restaurar" : "Ocultar"}>{post.is_hidden ? <RotateCcw size={17} /> : <EyeOff size={17} />}</button>
                  </form>
                  <form action={moderateCommunityPostAction}>
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="operation" value="delete" />
                    <ConfirmSubmitButton className="icon-button" message="Excluir definitivamente esta publicação?"><Trash2 size={17} /></ConfirmSubmitButton>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="admin-panel-card">
        <div className="admin-panel-card__heading">
          <div><span>PARTICIPAÇÃO</span><h2>Restrições da comunidade</h2></div>
          <Ban size={24} />
        </div>
        <form action={updateCommunityRestrictionAction} className="admin-community-restriction-form">
          <label>
            <span>Membro VIP</span>
            <select name="userId" required defaultValue="">
              <option value="" disabled>Selecione uma conta</option>
              {eligibleMembers.filter((member) => member.id !== userId).map((member) => (
                <option value={member.id} key={member.id}>{member.full_name || member.email} · {member.role}</option>
              ))}
            </select>
          </label>
          <label className="admin-community-check"><input type="checkbox" name="canPost" defaultChecked /><span>Pode publicar</span></label>
          <label className="admin-community-check"><input type="checkbox" name="canComment" defaultChecked /><span>Pode comentar</span></label>
          <label><span>Até (dd/mm/aaaa)</span><input type="date" lang="pt-BR" name="restrictedUntil" /></label>
          <label className="admin-community-restriction-form__reason"><span>Motivo</span><input name="reason" maxLength={500} placeholder="Motivo visível ao membro" /></label>
          <button className="button button--primary" type="submit"><ShieldCheck size={17} /> Salvar permissão</button>
        </form>

        <div className="admin-community-restriction-list">
          {activeRestrictions.map((restriction) => {
            const member = memberMap.get(restriction.user_id);
            return (
              <article key={restriction.user_id}>
                <div><strong>{member?.full_name || member?.email || restriction.user_id}</strong><span>{restriction.reason || "Sem motivo informado"}</span></div>
                <small>Publicar: {restriction.can_post ? "sim" : "não"} · Comentar: {restriction.can_comment ? "sim" : "não"}{restriction.restricted_until ? ` · até ${formatCommunityDate(restriction.restricted_until)}` : " · sem data final"}</small>
              </article>
            );
          })}
          {!activeRestrictions.length ? <p className="admin-inline-empty">Nenhum membro possui restrição ativa.</p> : null}
        </div>
      </section>
    </div>
  );
}
