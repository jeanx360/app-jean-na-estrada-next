import { createCommunityImageUrl } from "@/lib/community";
import type {
  CommunityAuthor,
  CommunityCategory,
  CommunityCommentRow,
  CommunityCommentView,
  CommunityFeedPost,
  CommunityPollOption,
  CommunityPostRow,
} from "@/types/community";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ProfileRow = CommunityAuthor;
type LikeRow = { post_id: string; user_id: string };
type CommentCountRow = { id: string; post_id: string };
type PollOptionRow = { id: string; post_id: string; label: string; sort_order: number };
type PollVoteRow = { post_id: string; option_id: string; user_id: string };
type CommentLikeRow = { comment_id: string; user_id: string };

async function enrichPosts(
  supabase: SupabaseServerClient,
  userId: string,
  rows: CommunityPostRow[],
): Promise<CommunityFeedPost[]> {
  if (!rows.length) return [];

  const postIds = rows.map((post) => post.id);
  const authorIds = Array.from(new Set(rows.map((post) => post.author_id)));
  const categoryIds = Array.from(new Set(rows.map((post) => post.category_id)));

  const [profilesResult, categoriesResult, likesResult, commentsResult, optionsResult, votesResult] = await Promise.all([
    supabase.rpc("community_list_profiles", { target_ids: authorIds }),
    supabase
      .from("community_categories")
      .select("id, slug, name, description, icon, sort_order, is_active")
      .in("id", categoryIds),
    supabase.from("community_post_likes").select("post_id, user_id").in("post_id", postIds),
    supabase.from("community_comments").select("id, post_id").in("post_id", postIds).eq("is_hidden", false),
    supabase
      .from("community_poll_options")
      .select("id, post_id, label, sort_order")
      .in("post_id", postIds)
      .order("sort_order", { ascending: true }),
    supabase.from("community_poll_votes").select("post_id, option_id, user_id").in("post_id", postIds),
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const categories = (categoriesResult.data ?? []) as CommunityCategory[];
  const likes = (likesResult.data ?? []) as LikeRow[];
  const comments = (commentsResult.data ?? []) as CommentCountRow[];
  const options = (optionsResult.data ?? []) as PollOptionRow[];
  const votes = (votesResult.data ?? []) as PollVoteRow[];

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return Promise.all(
    rows.map(async (post) => {
      const postLikes = likes.filter((like) => like.post_id === post.id);
      const postOptions: CommunityPollOption[] = options
        .filter((option) => option.post_id === post.id)
        .map((option) => ({
          ...option,
          voteCount: votes.filter((vote) => vote.option_id === option.id).length,
          selectedByCurrentUser: votes.some(
            (vote) => vote.option_id === option.id && vote.user_id === userId,
          ),
        }));

      return {
        ...post,
        author: profileMap.get(post.author_id) ?? null,
        category: categoryMap.get(post.category_id) ?? null,
        imageUrl: await createCommunityImageUrl(supabase, post.image_path),
        likeCount: postLikes.length,
        likedByCurrentUser: postLikes.some((like) => like.user_id === userId),
        commentCount: comments.filter((comment) => comment.post_id === post.id).length,
        pollOptions: postOptions,
      };
    }),
  );
}

export async function loadCommunityFeed(
  supabase: SupabaseServerClient,
  userId: string,
  categorySlug?: string,
) {
  let categoryId: string | null = null;
  if (categorySlug) {
    const { data: category } = await supabase
      .from("community_categories")
      .select("id")
      .eq("slug", categorySlug)
      .eq("is_active", true)
      .maybeSingle();
    categoryId = category?.id ?? null;
    if (!categoryId) return [];
  }

  let query = supabase
    .from("community_posts")
    .select(
      "id, author_id, category_id, title, body, image_path, poll_question, is_pinned, is_locked, is_hidden, hidden_reason, created_at, updated_at",
    )
    .eq("is_hidden", false)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(40);

  if (categoryId) query = query.eq("category_id", categoryId);
  const { data } = await query;
  return enrichPosts(supabase, userId, (data ?? []) as CommunityPostRow[]);
}

export async function loadCommunityPost(
  supabase: SupabaseServerClient,
  userId: string,
  postId: string,
) {
  const { data } = await supabase
    .from("community_posts")
    .select(
      "id, author_id, category_id, title, body, image_path, poll_question, is_pinned, is_locked, is_hidden, hidden_reason, created_at, updated_at",
    )
    .eq("id", postId)
    .maybeSingle();

  if (!data) return null;
  const [post] = await enrichPosts(supabase, userId, [data as CommunityPostRow]);
  return post ?? null;
}

export async function loadCommunityComments(
  supabase: SupabaseServerClient,
  userId: string,
  postId: string,
): Promise<CommunityCommentView[]> {
  const { data } = await supabase
    .from("community_comments")
    .select(
      "id, post_id, author_id, parent_comment_id, body, is_hidden, hidden_reason, created_at, updated_at",
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as CommunityCommentRow[];
  if (!rows.length) return [];

  const authorIds = Array.from(new Set(rows.map((comment) => comment.author_id)));
  const commentIds = rows.map((comment) => comment.id);
  const [profilesResult, likesResult] = await Promise.all([
    supabase.rpc("community_list_profiles", { target_ids: authorIds }),
    supabase.from("community_comment_likes").select("comment_id, user_id").in("comment_id", commentIds),
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const likes = (likesResult.data ?? []) as CommentLikeRow[];
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const viewMap = new Map<string, CommunityCommentView>();

  for (const row of rows) {
    const commentLikes = likes.filter((like) => like.comment_id === row.id);
    viewMap.set(row.id, {
      ...row,
      author: profileMap.get(row.author_id) ?? null,
      likeCount: commentLikes.length,
      likedByCurrentUser: commentLikes.some((like) => like.user_id === userId),
      replies: [],
    });
  }

  const roots: CommunityCommentView[] = [];
  for (const row of rows) {
    const view = viewMap.get(row.id);
    if (!view) continue;
    if (row.parent_comment_id && viewMap.has(row.parent_comment_id)) {
      viewMap.get(row.parent_comment_id)?.replies.push(view);
    } else {
      roots.push(view);
    }
  }

  return roots;
}
