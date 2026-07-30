"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { getAuthContext } from "@/lib/auth";
import { hasCommunityAccess } from "@/lib/community";
import type { CommunityActionState } from "@/types/community";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "true" || formData.get(key) === "on";
}


function titleFromBody(body: string) {
  const firstLine = body.split(/\r?\n/).find((line) => line.trim())?.trim() ?? body.trim();
  return firstLine.length <= 110 ? firstLine : `${firstLine.slice(0, 107).trim()}...`;
}

function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function communityActionContext() {
  const context = await getAuthContext();
  if (!context.userId || !hasCommunityAccess(context.profile)) return null;
  return context;
}

function revalidateCommunity(postId?: string) {
  revalidatePath("/comunidade");
  revalidatePath("/comunidade/notificacoes");
  revalidatePath("/admin/comunidade");
  if (postId) revalidatePath(`/comunidade/${postId}`);
}

export async function createCommunityPostAction(
  formData: FormData,
): Promise<CommunityActionState> {
  const context = await communityActionContext();
  if (!context) return { error: "Seu acesso VIP não está ativo." };

  const { supabase, userId } = context;
  const body = readText(formData, "body");
  const explicitTitle = readText(formData, "title");
  const title = explicitTitle || titleFromBody(body);
  let categoryId = readText(formData, "categoryId");
  const imagePath = readText(formData, "imagePath");
  const pollQuestion = readText(formData, "pollQuestion");
  const pollOptions = formData
    .getAll("pollOption")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  if (body.length < 3 || body.length > 4000) {
    return { error: "A publicação precisa ter entre 3 e 4.000 caracteres." };
  }
  if (imagePath && !imagePath.startsWith(`${userId}/`)) {
    return { error: "O arquivo enviado não pertence à sua conta." };
  }
  if (pollQuestion) {
    if (pollQuestion.length > 180) return { error: "A pergunta da enquete pode ter até 180 caracteres." };
    if (pollOptions.length < 2 || pollOptions.length > 6) {
      return { error: "A enquete precisa ter entre 2 e 6 opções." };
    }
    if (pollOptions.some((option) => option.length > 120)) {
      return { error: "Cada opção da enquete pode ter até 120 caracteres." };
    }
  }

  const { data: canPost, error: permissionError } = await supabase.rpc("community_can_post");
  if (permissionError || !canPost) {
    return { error: "Sua conta está temporariamente impedida de criar publicações." };
  }

  if (!categoryId) {
    const { data: defaultCategory } = await supabase
      .from("community_categories")
      .select("id")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    categoryId = defaultCategory?.id ?? "";
  }

  const { data: category } = await supabase
    .from("community_categories")
    .select("id")
    .eq("id", categoryId)
    .eq("is_active", true)
    .maybeSingle();
  if (!category) return { error: "Nenhuma categoria disponível para publicar." };

  const { data: post, error } = await supabase
    .from("community_posts")
    .insert({
      author_id: userId,
      category_id: categoryId,
      title,
      body,
      image_path: imagePath || null,
      poll_question: pollQuestion || null,
    })
    .select("id")
    .single();

  if (error || !post) {
    if (imagePath) await supabase.storage.from("community-images").remove([imagePath]);
    return { error: `Não foi possível publicar: ${error?.message ?? "erro desconhecido"}` };
  }

  if (pollQuestion) {
    const { error: optionsError } = await supabase.from("community_poll_options").insert(
      pollOptions.map((label, index) => ({
        post_id: post.id,
        label,
        sort_order: index,
      })),
    );

    if (optionsError) {
      await supabase.from("community_posts").delete().eq("id", post.id);
      if (imagePath) await supabase.storage.from("community-images").remove([imagePath]);
      return { error: `Não foi possível criar a enquete: ${optionsError.message}` };
    }
  }

  revalidateCommunity(post.id);
  return { success: "Publicado na comunidade.", postId: post.id };
}

export async function toggleCommunityPostLikeAction(formData: FormData) {
  const context = await communityActionContext();
  if (!context) return;
  const postId = readText(formData, "postId");
  if (!postId) return;

  const { data: current } = await context.supabase
    .from("community_post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (current) {
    await context.supabase
      .from("community_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", context.userId);
  } else {
    await context.supabase.from("community_post_likes").insert({
      post_id: postId,
      user_id: context.userId,
    });
  }

  revalidateCommunity(postId);
}

export async function createCommunityCommentAction(
  _previousState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const context = await communityActionContext();
  if (!context) return { error: "Seu acesso VIP não está ativo." };

  const postId = readText(formData, "postId");
  const parentCommentId = readText(formData, "parentCommentId");
  const body = readText(formData, "body");

  if (!postId) return { error: "Publicação inválida." };
  if (!body || body.length > 1500) {
    return { error: "O comentário precisa ter entre 1 e 1.500 caracteres." };
  }

  const { data: canComment, error: permissionError } = await context.supabase.rpc("community_can_comment");
  if (permissionError || !canComment) {
    return { error: "Sua conta está temporariamente impedida de comentar." };
  }

  const { error } = await context.supabase.from("community_comments").insert({
    post_id: postId,
    author_id: context.userId,
    parent_comment_id: parentCommentId || null,
    body,
  });

  if (error) return { error: `Não foi possível comentar: ${error.message}` };
  revalidateCommunity(postId);
  return { success: parentCommentId ? "Resposta publicada." : "Comentário publicado." };
}

export async function toggleCommunityCommentLikeAction(formData: FormData) {
  const context = await communityActionContext();
  if (!context) return;
  const commentId = readText(formData, "commentId");
  const postId = readText(formData, "postId");
  if (!commentId || !postId) return;

  const { data: current } = await context.supabase
    .from("community_comment_likes")
    .select("comment_id")
    .eq("comment_id", commentId)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (current) {
    await context.supabase
      .from("community_comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", context.userId);
  } else {
    await context.supabase.from("community_comment_likes").insert({
      comment_id: commentId,
      user_id: context.userId,
    });
  }

  revalidateCommunity(postId);
}

export async function voteCommunityPollAction(formData: FormData) {
  const context = await communityActionContext();
  if (!context) return;
  const postId = readText(formData, "postId");
  const optionId = readText(formData, "optionId");
  if (!postId || !optionId) return;

  const { data: current } = await context.supabase
    .from("community_poll_votes")
    .select("option_id")
    .eq("post_id", postId)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (current) {
    await context.supabase
      .from("community_poll_votes")
      .update({ option_id: optionId })
      .eq("post_id", postId)
      .eq("user_id", context.userId);
  } else {
    await context.supabase.from("community_poll_votes").insert({
      post_id: postId,
      option_id: optionId,
      user_id: context.userId,
    });
  }

  revalidateCommunity(postId);
}

export async function reportCommunityItemAction(
  _previousState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const context = await communityActionContext();
  if (!context) return { error: "Seu acesso VIP não está ativo." };

  const targetType = readText(formData, "targetType");
  const targetId = readText(formData, "targetId");
  const postId = readText(formData, "postId");
  const reason = readText(formData, "reason");
  const details = readText(formData, "details");

  if (!['post', 'comment'].includes(targetType) || !targetId) {
    return { error: "Item denunciado inválido." };
  }
  if (!['spam', 'abuse', 'misinformation', 'copyright', 'other'].includes(reason)) {
    return { error: "Selecione o motivo da denúncia." };
  }
  if (details.length > 1000) return { error: "Os detalhes podem ter até 1.000 caracteres." };

  const payload = {
    reporter_id: context.userId,
    target_type: targetType,
    post_id: targetType === "post" ? targetId : null,
    comment_id: targetType === "comment" ? targetId : null,
    reason,
    details: details || null,
  };

  const { error } = await context.supabase.from("community_reports").insert(payload);
  if (error?.code === "23505") return { error: "Você já enviou uma denúncia para este item." };
  if (error) return { error: `Não foi possível enviar a denúncia: ${error.message}` };

  revalidateCommunity(postId || (targetType === "post" ? targetId : undefined));
  return { success: "Denúncia enviada para análise." };
}

export async function deleteOwnCommunityPostAction(formData: FormData) {
  const context = await communityActionContext();
  if (!context) return;
  const postId = readText(formData, "postId");
  if (!postId) return;

  const { data: post } = await context.supabase
    .from("community_posts")
    .select("author_id, image_path")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return;
  if (post.author_id !== context.userId && context.profile?.role !== "admin") return;

  if (post.image_path) {
    await context.supabase.storage.from("community-images").remove([post.image_path]);
  }
  await context.supabase.from("community_posts").delete().eq("id", postId);
  revalidateCommunity();
}

export async function deleteOwnCommunityCommentAction(formData: FormData) {
  const context = await communityActionContext();
  if (!context) return;
  const commentId = readText(formData, "commentId");
  const postId = readText(formData, "postId");
  if (!commentId || !postId) return;

  const { data: comment } = await context.supabase
    .from("community_comments")
    .select("author_id")
    .eq("id", commentId)
    .maybeSingle();
  if (!comment) return;
  if (comment.author_id !== context.userId && context.profile?.role !== "admin") return;

  await context.supabase.from("community_comments").delete().eq("id", commentId);
  revalidateCommunity(postId);
}

export async function markCommunityNotificationsReadAction(formData: FormData) {
  const context = await communityActionContext();
  if (!context) return;
  const notificationId = readText(formData, "notificationId");

  let query = context.supabase
    .from("community_notifications")
    .update({ is_read: true })
    .eq("user_id", context.userId);
  if (notificationId) query = query.eq("id", notificationId);
  await query;
  revalidateCommunity();
}

export async function createCommunityCategoryAction(
  _previousState: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const { supabase, userId } = await requireAdmin();
  const name = readText(formData, "name");
  const description = readText(formData, "description");
  const requestedSlug = readText(formData, "slug");
  const icon = readText(formData, "icon") || "message-circle";
  const sortOrder = Number(readText(formData, "sortOrder") || "0");
  const slug = normalizeSlug(requestedSlug || name);

  if (name.length < 2 || name.length > 60 || !slug) {
    return { error: "Informe um nome válido para a categoria." };
  }

  const { error } = await supabase.from("community_categories").insert({
    name,
    slug,
    description: description || null,
    icon,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    created_by: userId,
  });
  if (error) return { error: `Não foi possível criar a categoria: ${error.message}` };

  revalidateCommunity();
  return { success: "Categoria criada." };
}

export async function toggleCommunityCategoryAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const categoryId = readText(formData, "categoryId");
  const active = readBoolean(formData, "active");
  if (!categoryId) return;
  await supabase.from("community_categories").update({ is_active: active }).eq("id", categoryId);
  revalidateCommunity();
}

export async function moderateCommunityPostAction(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const postId = readText(formData, "postId");
  const operation = readText(formData, "operation");
  const reason = readText(formData, "reason");
  if (!postId) return;

  const { data: post } = await supabase
    .from("community_posts")
    .select("author_id, image_path")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return;

  if (operation === "delete") {
    if (post.image_path) await supabase.storage.from("community-images").remove([post.image_path]);
    await supabase.from("community_posts").delete().eq("id", postId);
  } else {
    const updates: Record<string, unknown> = {};
    if (operation === "pin") updates.is_pinned = true;
    if (operation === "unpin") updates.is_pinned = false;
    if (operation === "lock") updates.is_locked = true;
    if (operation === "unlock") updates.is_locked = false;
    if (operation === "hide") {
      updates.is_hidden = true;
      updates.hidden_reason = reason || "Ocultado pela moderação.";
    }
    if (operation === "restore") {
      updates.is_hidden = false;
      updates.hidden_reason = null;
    }
    if (Object.keys(updates).length) await supabase.from("community_posts").update(updates).eq("id", postId);
  }

  if (["hide", "delete", "lock"].includes(operation) && post.author_id !== userId) {
    await supabase.from("community_notifications").insert({
      user_id: post.author_id,
      actor_id: userId,
      notification_type: "moderation",
      post_id: operation === "delete" ? null : postId,
      message: operation === "lock"
        ? "Uma publicação sua foi bloqueada para novos comentários."
        : "Uma publicação sua recebeu uma ação da moderação.",
    });
  }

  revalidateCommunity(postId);
}

export async function moderateCommunityCommentAction(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const commentId = readText(formData, "commentId");
  const postId = readText(formData, "postId");
  const operation = readText(formData, "operation");
  const reason = readText(formData, "reason");
  if (!commentId || !postId) return;

  const { data: comment } = await supabase
    .from("community_comments")
    .select("author_id")
    .eq("id", commentId)
    .maybeSingle();
  if (!comment) return;

  if (operation === "delete") {
    await supabase.from("community_comments").delete().eq("id", commentId);
  } else if (operation === "hide") {
    await supabase
      .from("community_comments")
      .update({ is_hidden: true, hidden_reason: reason || "Ocultado pela moderação." })
      .eq("id", commentId);
  } else if (operation === "restore") {
    await supabase
      .from("community_comments")
      .update({ is_hidden: false, hidden_reason: null })
      .eq("id", commentId);
  }

  if (["hide", "delete"].includes(operation) && comment.author_id !== userId) {
    await supabase.from("community_notifications").insert({
      user_id: comment.author_id,
      actor_id: userId,
      notification_type: "moderation",
      post_id: postId,
      message: "Um comentário seu recebeu uma ação da moderação.",
    });
  }

  revalidateCommunity(postId);
}

export async function resolveCommunityReportAction(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const reportId = readText(formData, "reportId");
  const status = readText(formData, "status");
  const notes = readText(formData, "notes");
  if (!reportId || !['reviewed', 'dismissed', 'actioned'].includes(status)) return;

  await supabase
    .from("community_reports")
    .update({
      status,
      resolution_notes: notes || null,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  revalidateCommunity();
}

export async function updateCommunityRestrictionAction(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const targetUserId = readText(formData, "userId");
  const canPost = readBoolean(formData, "canPost");
  const canComment = readBoolean(formData, "canComment");
  const restrictedUntil = readText(formData, "restrictedUntil");
  const reason = readText(formData, "reason");
  if (!targetUserId || targetUserId === userId) return;

  await supabase.from("community_member_restrictions").upsert({
    user_id: targetUserId,
    can_post: canPost,
    can_comment: canComment,
    restricted_until: restrictedUntil ? new Date(`${restrictedUntil}T23:59:59-03:00`).toISOString() : null,
    reason: reason || null,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  });

  await supabase.from("community_notifications").insert({
    user_id: targetUserId,
    actor_id: userId,
    notification_type: "moderation",
    message: canPost && canComment
      ? "As restrições da sua conta na comunidade foram removidas."
      : "Sua conta recebeu uma restrição temporária na comunidade.",
  });

  revalidateCommunity();
}
