"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import type { PublicContentActionState, PublicContentType } from "@/types/public-content";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function isHttpUrl(value: string) {
  return /^https:\/\//i.test(value);
}

function isImageReference(value: string) {
  return !value || value.startsWith("/") || isHttpUrl(value);
}

function readLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function tutorialResources(formData: FormData) {
  return [1, 2, 3]
    .map((index) => {
      const label = readText(formData, `resource${index}Label`);
      const description = readText(formData, `resource${index}Description`);
      const href = readText(formData, `resource${index}Url`);
      const kind = readText(formData, `resource${index}Kind`);

      if (!label && !href) return null;
      if (!label || !isHttpUrl(href) || !["video", "pdf", "drive"].includes(kind)) {
        throw new Error(`Preencha corretamente o recurso ${index} do tutorial.`);
      }

      return {
        label,
        description: description || "Abrir recurso de apoio.",
        href,
        kind,
      };
    })
    .filter(Boolean);
}

function buildMetadata(type: PublicContentType, formData: FormData) {
  if (type === "tutorial") {
    const resources = tutorialResources(formData);
    if (!resources.length) throw new Error("Cadastre pelo menos um recurso para o tutorial.");

    return {
      vehicle: readText(formData, "vehicle") || "Geral",
      level: readText(formData, "level") || "Básico",
      status: readText(formData, "status") || "Disponível",
      resources,
    };
  }

  if (type === "application") {
    return {
      compatibility: readText(formData, "compatibility") || "Compatibilidade não informada",
      status: readText(formData, "status") || "Disponível no Drive",
      origin: readText(formData, "origin") || "Jean na Estrada",
    };
  }

  if (type === "partner") {
    return {
      actionLabel: readText(formData, "actionLabel") || "Conhecer parceiro",
      services: readLines(readText(formData, "services")),
    };
  }

  return {
    retailer: readText(formData, "retailer") || "Mercado Livre",
    highlight: readText(formData, "highlight") || null,
    affiliate: true,
  };
}

function revalidatePublicPages(type?: PublicContentType) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/publicacoes");

  const paths: Record<PublicContentType, string> = {
    tutorial: "/tutoriais",
    application: "/aplicativos",
    partner: "/parceiros",
    product: "/produtos",
  };

  if (type) revalidatePath(paths[type]);
  else Object.values(paths).forEach((path) => revalidatePath(path));
}

export async function savePublicContentAction(
  _previousState: PublicContentActionState,
  formData: FormData,
): Promise<PublicContentActionState> {
  const { supabase, userId } = await requireAdmin();
  const contentId = readText(formData, "contentId");
  const type = readText(formData, "contentType") as PublicContentType;
  const title = readText(formData, "title");
  const summary = readText(formData, "summary");
  const category = readText(formData, "category");
  const externalUrl = readText(formData, "externalUrl");
  const imageUrl = readText(formData, "imageUrl");
  const imagePath = readText(formData, "imagePath");
  const requestedSlug = readText(formData, "slug");
  const sortOrder = Number(readText(formData, "sortOrder") || "100");
  const isPublished = readBoolean(formData, "isPublished");
  const isFeatured = readBoolean(formData, "isFeatured");

  if (!["tutorial", "application", "partner", "product"].includes(type)) {
    return { error: "Tipo de publicação inválido." };
  }
  if (!title) return { error: "Informe o título da publicação." };
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) {
    return { error: "A ordem precisa ser um número inteiro entre 0 e 100.000." };
  }
  if (!isImageReference(imageUrl)) {
    return { error: "A imagem precisa começar com https:// ou usar um caminho interno iniciado por /." };
  }
  if (type !== "tutorial" && !isHttpUrl(externalUrl)) {
    return { error: "Informe um endereço externo iniciado por https://." };
  }

  const slug = slugify(requestedSlug || title);
  if (!slug) return { error: "Não foi possível gerar um identificador para a publicação." };

  let metadata: Record<string, unknown>;
  try {
    metadata = buildMetadata(type, formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Dados específicos inválidos." };
  }

  const payload = {
    content_type: type,
    title,
    slug,
    summary: summary || null,
    category: category || null,
    image_url: imageUrl || null,
    image_path: imagePath || null,
    external_url: type === "tutorial" ? null : externalUrl,
    metadata,
    is_published: isPublished,
    is_featured: isFeatured,
    sort_order: sortOrder,
    published_at: isPublished ? new Date().toISOString() : null,
    created_by: userId,
  };

  const query = contentId
    ? supabase.from("public_contents").update(payload).eq("id", contentId)
    : supabase.from("public_contents").insert(payload);

  const { error } = await query;
  if (error) {
    if (error.code === "23505") return { error: "Já existe uma publicação usando esse identificador." };
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePublicPages(type);
  return { success: contentId ? "Publicação atualizada." : isPublished ? "Publicação criada e publicada." : "Rascunho salvo." };
}

export async function togglePublicContentAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const contentId = readText(formData, "contentId");
  const type = readText(formData, "contentType") as PublicContentType;
  const publish = readText(formData, "publish") === "true";

  if (!contentId) throw new Error("Publicação inválida.");

  const { error } = await supabase
    .from("public_contents")
    .update({ is_published: publish, published_at: publish ? new Date().toISOString() : null })
    .eq("id", contentId);

  if (error) throw new Error(error.message);
  revalidatePublicPages(type);
}

export async function deletePublicContentAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const contentId = readText(formData, "contentId");
  const type = readText(formData, "contentType") as PublicContentType;

  if (!contentId) throw new Error("Publicação inválida.");

  const { data: item, error: readError } = await supabase
    .from("public_contents")
    .select("image_path")
    .eq("id", contentId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (item?.image_path) {
    const { error: storageError } = await supabase.storage.from("public-assets").remove([item.image_path]);
    if (storageError) throw new Error(storageError.message);
  }

  const { error } = await supabase.from("public_contents").delete().eq("id", contentId);
  if (error) throw new Error(error.message);
  revalidatePublicPages(type);
}
