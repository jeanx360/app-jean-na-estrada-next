import type { MemberRole } from "@/types/auth";

export type CommunityCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
};

export type CommunityAuthor = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: MemberRole;
};

export type CommunityPostRow = {
  id: string;
  author_id: string;
  category_id: string;
  title: string;
  body: string;
  image_path: string | null;
  poll_question: string | null;
  is_pinned: boolean;
  is_locked: boolean;
  is_hidden: boolean;
  hidden_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunityCommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  parent_comment_id: string | null;
  body: string;
  is_hidden: boolean;
  hidden_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunityPollOption = {
  id: string;
  post_id: string;
  label: string;
  sort_order: number;
  voteCount: number;
  selectedByCurrentUser: boolean;
};

export type CommunityFeedPost = CommunityPostRow & {
  author: CommunityAuthor | null;
  category: CommunityCategory | null;
  imageUrl: string | null;
  likeCount: number;
  likedByCurrentUser: boolean;
  commentCount: number;
  pollOptions: CommunityPollOption[];
};

export type CommunityCommentView = CommunityCommentRow & {
  author: CommunityAuthor | null;
  likeCount: number;
  likedByCurrentUser: boolean;
  replies: CommunityCommentView[];
};

export type CommunityActionState = {
  error?: string;
  success?: string;
  postId?: string;
};
