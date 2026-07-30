"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import type { HomeCarouselActionState, HomeCarouselSource } from "@/types/home-carousel";
import type {
  HomeQuickAccessAccent,
  HomeQuickAccessActionState,
  HomeQuickAccessIcon,
} from "@/types/home-quick-access";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}
function optionalDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Data ou horário inválido.");
  return date.toISOString();
}

export async function saveQuickAccessItemAction(
  _previousState: HomeQuickAccessActionState,
  formData: FormData,
): Promise<HomeQuickAccessActionState> {
  const { supabase } = await requireAdmin();
  const itemId = readText(formData, "itemId");
  const title = readText(formData, "title");
  const description = readText(formData, "description");
  const href = readText(formData, "href");
  const icon = readText(formData, "icon") as HomeQuickAccessIcon;
  const accent = readText(formData, "accent") as HomeQuickAccessAccent;
  const sortOrder = Number(readText(formData, "sortOrder") || "100");

  const validIcons: HomeQuickAccessIcon[] = [
    "videos", "manuals", "apps", "products", "calculator", "vip", "community", "news", "partners",
  ];
  const validAccents: HomeQuickAccessAccent[] = ["blue", "cyan", "orange", "violet"];

  if (title.length < 2 || title.length > 70) return { error: "O título precisa ter entre 2 e 70 caracteres." };
  if (description.length < 3 || description.length > 180) return { error: "A descrição precisa ter entre 3 e 180 caracteres." };
  if (!href.startsWith("/") && !/^https:\/\//i.test(href)) return { error: "O destino deve começar com / ou https://." };
  if (!validIcons.includes(icon)) return { error: "Ícone inválido." };
  if (!validAccents.includes(accent)) return { error: "Cor inválida." };
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) return { error: "A ordem deve ser um número inteiro entre 0 e 100.000." };

  const payload = {
    title,
    description,
    href,
    icon,
    accent,
    sort_order: sortOrder,
    is_published: readBoolean(formData, "isPublished"),
  };

  const query = itemId
    ? supabase.from("home_quick_access_items").update(payload).eq("id", itemId)
    : supabase.from("home_quick_access_items").insert(payload);
  const { error } = await query;
  if (error) return { error: `Não foi possível salvar o atalho: ${error.message}` };

  revalidatePath("/");
  revalidatePath("/admin/home");
  return { success: itemId ? "Atalho atualizado." : "Atalho criado." };
}

export async function toggleQuickAccessItemAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = readText(formData, "itemId");
  const publish = readText(formData, "publish") === "true";
  if (!id) throw new Error("Atalho inválido.");
  const { error } = await supabase.from("home_quick_access_items").update({ is_published: publish }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin/home");
}

export async function deleteQuickAccessItemAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = readText(formData, "itemId");
  if (!id) throw new Error("Atalho inválido.");
  const { error } = await supabase.from("home_quick_access_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin/home");
}

export async function saveHomeSlideAction(
  _previousState: HomeCarouselActionState,
  formData: FormData,
): Promise<HomeCarouselActionState> {
  const { supabase, userId } = await requireAdmin();
  const slideId = readText(formData, "slideId");
  const sourceType = readText(formData, "sourceType") as HomeCarouselSource;
  const publicContentId = readText(formData, "publicContentId");
  const title = readText(formData, "title");
  const description = readText(formData, "description");
  const actionUrl = readText(formData, "actionUrl");
  const imageUrl = readText(formData, "imageUrl");
  const imagePath = readText(formData, "imagePath");
  const sortOrder = Number(readText(formData, "sortOrder") || "100");

  if (!["custom", "latest_video", "latest_news", "public_content"].includes(sourceType)) {
    return { error: "Tipo de destaque inválido." };
  }
  if (sourceType === "custom" && (!title || !description)) {
    return { error: "Informe título e descrição para o destaque personalizado." };
  }
  if (sourceType === "public_content" && !publicContentId) {
    return { error: "Selecione uma publicação para este destaque." };
  }
  if (actionUrl && !actionUrl.startsWith("/") && !/^https:\/\//i.test(actionUrl)) {
    return { error: "O link deve começar com / ou https://." };
  }
  if (imageUrl && !imageUrl.startsWith("/") && !/^https:\/\//i.test(imageUrl)) {
    return { error: "A imagem deve começar com / ou https://." };
  }
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) {
    return { error: "A ordem deve ser um inteiro entre 0 e 100.000." };
  }

  let startsAt: string | null;
  let endsAt: string | null;
  try {
    startsAt = optionalDate(readText(formData, "startsAt"));
    endsAt = optionalDate(readText(formData, "endsAt"));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Data inválida." };
  }
  if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return { error: "O término precisa ser posterior ao início." };
  }

  const payload = {
    source_type: sourceType,
    public_content_id: sourceType === "public_content" ? publicContentId : null,
    badge: readText(formData, "badge") || null,
    title: title || null,
    description: description || null,
    action_label: readText(formData, "actionLabel") || null,
    action_url: actionUrl || null,
    image_url: imageUrl || null,
    image_path: imagePath || null,
    sort_order: sortOrder,
    is_published: readBoolean(formData, "isPublished"),
    starts_at: startsAt,
    ends_at: endsAt,
    created_by: userId,
  };

  const query = slideId
    ? supabase.from("home_carousel_slides").update(payload).eq("id", slideId)
    : supabase.from("home_carousel_slides").insert(payload);
  const { error } = await query;
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/home");
  return { success: slideId ? "Destaque atualizado." : "Destaque criado." };
}

export async function toggleHomeSlideAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = readText(formData, "slideId");
  const publish = readText(formData, "publish") === "true";
  if (!id) throw new Error("Destaque inválido.");
  const { error } = await supabase.from("home_carousel_slides").update({ is_published: publish }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin/home");
}

export async function deleteHomeSlideAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = readText(formData, "slideId");
  if (!id) throw new Error("Destaque inválido.");
  const { data: slide } = await supabase.from("home_carousel_slides").select("image_path").eq("id", id).maybeSingle();
  if (slide?.image_path) await supabase.storage.from("public-assets").remove([slide.image_path]);
  const { error } = await supabase.from("home_carousel_slides").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin/home");
}
