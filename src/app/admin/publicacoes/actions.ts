"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { sendPushNotification } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationCategory } from "@/types/notification";
import type {
  PublicContentActionState,
  PublicContentPublicationStatus,
  PublicContentRow,
  PublicContentType,
} from "@/types/public-content";

const PUBLIC_CONTENT_SELECT =
  "id, content_type, title, slug, summary, category, catalog_category_id, image_url, image_path, external_url, metadata, publication_status, is_published, is_featured, sort_order, published_at, archived_at, created_at, updated_at";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function readPublicationStatus(formData: FormData): PublicContentPublicationStatus {
  const value = readText(formData, "publicationStatus");
  return value === "published" || value === "archived" ? value : "draft";
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
    const deliveryType = readText(formData, "deliveryType") === "upload" ? "upload" : "external";
    const filePath = readText(formData, "appFilePath");
    const fileName = readText(formData, "appFileName");
    const fileSize = Number(readText(formData, "appFileSize") || "0");
    if (deliveryType === "upload" && (!filePath || !fileName)) {
      throw new Error("Envie um arquivo ou mantenha o arquivo já cadastrado antes de salvar.");
    }
    return {
      compatibility: readText(formData, "compatibility") || "Compatibilidade não informada",
      status: readText(formData, "status") || "Disponível",
      origin: readText(formData, "origin") || "Jean na Estrada",
      version: readText(formData, "version") || null,
      deliveryType,
      accessLevel: readText(formData, "accessLevel") === "vip" ? "vip" : "public",
      filePath: deliveryType === "upload" ? filePath : null,
      fileName: deliveryType === "upload" ? fileName : null,
      fileSize: deliveryType === "upload" && Number.isFinite(fileSize) && fileSize > 0 ? fileSize : null,
      checksumSha256: readText(formData, "checksumSha256") || null,
      buttonLabel: readText(formData, "buttonLabel") || (deliveryType === "upload" ? "Baixar arquivo" : "Abrir página oficial"),
      tags: readLines(readText(formData, "tags")),
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
    tags: readLines(readText(formData, "tags")),
  };
}

function revalidatePublicPages(type?: PublicContentType) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/publicacoes");
  revalidatePath("/admin/catalogo");
  revalidatePath("/catalogo");
  revalidatePath("/admin/logs");

  const paths: Record<PublicContentType, string> = {
    tutorial: "/tutoriais",
    application: "/aplicativos",
    partner: "/parceiros",
    product: "/produtos",
  };

  if (type) revalidatePath(paths[type]);
  else Object.values(paths).forEach((path) => revalidatePath(path));
}

async function audit(
  actorUserId: string,
  action: string,
  entityId: string,
  oldData?: unknown,
  newData?: unknown,
) {
  const admin = createAdminClient();
  const { error } = await admin.from("admin_audit_logs").insert({
    actor_user_id: actorUserId,
    action,
    entity_type: "public_contents",
    entity_id: entityId,
    old_data: oldData ?? null,
    new_data: newData ?? null,
  });

  if (error) console.warn("Falha ao registrar auditoria de publicação:", error.message);
}

function statusDates(
  status: PublicContentPublicationStatus,
  previous?: Pick<PublicContentRow, "published_at" | "archived_at"> | null,
) {
  const now = new Date().toISOString();
  return {
    is_published: status === "published",
    published_at: status === "published" ? previous?.published_at ?? now : null,
    archived_at: status === "archived" ? previous?.archived_at ?? now : null,
  };
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
  const requestedCatalogCategoryId = readText(formData, "catalogCategoryId");
  const externalUrl = readText(formData, "externalUrl");
  const imageUrl = readText(formData, "imageUrl");
  const imagePath = readText(formData, "imagePath");
  const requestedSlug = readText(formData, "slug");
  const sortOrder = Number(readText(formData, "sortOrder") || "100");
  const publicationStatus = readPublicationStatus(formData);
  const isFeatured = readBoolean(formData, "isFeatured");
  const notifyUsers = readBoolean(formData, "notifyUsers");
  const sendPush = readBoolean(formData, "sendPush");

  if (!userId) return { error: "Sessão administrativa inválida." };
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
  const applicationDelivery = readText(formData, "deliveryType") === "upload" ? "upload" : "external";
  const needsExternalUrl = type === "partner" || type === "product" || (type === "application" && applicationDelivery === "external");
  if (needsExternalUrl && !isHttpUrl(externalUrl)) {
    return { error: "Informe um endereço externo iniciado por https://." };
  }

  const slug = slugify(requestedSlug || title);
  if (!slug) return { error: "Não foi possível gerar um identificador para a publicação." };

  let resolvedCategory = category || null;
  let catalogCategoryId: string | null = null;
  if (type === "application" || type === "product") {
    if (!requestedCatalogCategoryId) return { error: "Escolha uma categoria para o item do catálogo." };
    const { data: catalogCategory, error: catalogCategoryError } = await supabase
      .from("catalog_categories")
      .select("id, catalog_type, name")
      .eq("id", requestedCatalogCategoryId)
      .maybeSingle();
    if (catalogCategoryError) return { error: `Não foi possível validar a categoria: ${catalogCategoryError.message}` };
    const catalogCategoryRow = catalogCategory as unknown as { id: string; catalog_type: string; name: string } | null;
    if (!catalogCategoryRow || catalogCategoryRow.catalog_type !== type) return { error: "A categoria escolhida não pertence a este tipo de item." };
    catalogCategoryId = catalogCategoryRow.id;
    resolvedCategory = catalogCategoryRow.name;
  }

  let metadata: Record<string, unknown>;
  try {
    metadata = buildMetadata(type, formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Dados específicos inválidos." };
  }

  let previous: PublicContentRow | null = null;
  if (contentId) {
    const { data, error } = await supabase
      .from("public_contents")
      .select(PUBLIC_CONTENT_SELECT)
      .eq("id", contentId)
      .maybeSingle();
    if (error) return { error: `Não foi possível carregar a publicação: ${error.message}` };
    if (!data) return { error: "Publicação não encontrada." };
    previous = data as unknown as PublicContentRow;
  }

  const payload = {
    content_type: type,
    title,
    slug,
    summary: summary || null,
    category: resolvedCategory,
    catalog_category_id: catalogCategoryId,
    image_url: imageUrl || null,
    image_path: imagePath || null,
    external_url: type === "tutorial" || (type === "application" && applicationDelivery === "upload") ? null : externalUrl,
    metadata,
    publication_status: publicationStatus,
    ...statusDates(publicationStatus, previous),
    is_featured: isFeatured,
    sort_order: sortOrder,
  };

  const query = contentId
    ? supabase.from("public_contents").update(payload).eq("id", contentId)
    : supabase.from("public_contents").insert({ ...payload, created_by: userId });

  const { data: saved, error } = await query.select(PUBLIC_CONTENT_SELECT).single();
  if (error) {
    if (error.code === "23505") return { error: "Já existe uma publicação usando esse identificador." };
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  const savedItem = saved as unknown as PublicContentRow;
  await audit(userId, contentId ? "UPDATE" : "INSERT", savedItem.id, previous, savedItem);

  let notificationMessage = "";
  if (!contentId && publicationStatus === "published" && (notifyUsers || sendPush)) {
    const categoryByType: Record<PublicContentType, NotificationCategory> = {
      tutorial: "tutorials",
      application: "apps",
      partner: "benefits",
      product: "benefits",
    };
    const pathByType: Record<PublicContentType, string> = {
      tutorial: "/tutoriais",
      application: "/catalogo?tipo=aplicativos",
      partner: "/parceiros",
      product: "/catalogo?tipo=produtos",
    };
    const titleByType: Record<PublicContentType, string> = {
      tutorial: `Novo tutorial: ${title}`,
      application: `Novo aplicativo: ${title}`,
      partner: `Novo parceiro: ${title}`,
      product: `Nova recomendação: ${title}`,
    };

    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .insert({
        title: titleByType[type],
        message: summary || "Novo conteúdo disponível no JNE App.",
        audience: "all",
        category: categoryByType[type],
        action_url: pathByType[type],
        image_url: imageUrl || null,
        is_published: true,
        is_featured: isFeatured,
        published_at: new Date().toISOString(),
        push_requested: sendPush,
        created_by: userId,
        source_key: `public-content:${slug}`,
      })
      .select("id, title, message, audience, category, action_url, image_url")
      .single();

    if (notificationError) {
      notificationMessage = ` Conteúdo salvo, mas o aviso não foi criado: ${notificationError.message}`;
    } else if (notification && sendPush) {
      try {
        const pushResult = await sendPushNotification({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          audience: notification.audience,
          category: notification.category,
          actionUrl: notification.action_url,
          imageUrl: notification.image_url,
        });
        await supabase
          .from("notifications")
          .update({
            push_sent_at: pushResult.configured ? new Date().toISOString() : null,
            push_success_count: pushResult.successCount,
            push_failure_count: pushResult.failureCount,
          })
          .eq("id", notification.id);
        notificationMessage = pushResult.configured
          ? ` Notificação enviada para ${pushResult.successCount} dispositivo(s).`
          : " Aviso criado, mas o Web Push ainda não está configurado.";
      } catch (pushError) {
        notificationMessage = ` Aviso criado, mas o push falhou: ${pushError instanceof Error ? pushError.message : "erro desconhecido"}`;
      }
    } else {
      notificationMessage = " Notificação criada na central.";
    }
  }

  revalidatePublicPages(type);
  revalidatePath("/notificacoes");
  revalidatePath("/admin/notificacoes");

  const baseMessage = contentId
    ? "Publicação atualizada."
    : publicationStatus === "published"
      ? "Publicação criada e publicada."
      : publicationStatus === "archived"
        ? "Publicação criada e arquivada."
        : "Rascunho salvo.";

  return { success: `${baseMessage}${notificationMessage}` };
}

export async function setPublicContentStatusAction(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const contentId = readText(formData, "contentId");
  const publicationStatus = readPublicationStatus(formData);

  if (!userId) throw new Error("Sessão administrativa inválida.");
  if (!contentId) throw new Error("Publicação inválida.");

  const { data: previous, error: readError } = await supabase
    .from("public_contents")
    .select(PUBLIC_CONTENT_SELECT)
    .eq("id", contentId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!previous) throw new Error("Publicação não encontrada.");

  const update = {
    publication_status: publicationStatus,
    ...statusDates(publicationStatus, previous as unknown as PublicContentRow),
  };

  const { data: saved, error } = await supabase
    .from("public_contents")
    .update(update)
    .eq("id", contentId)
    .select(PUBLIC_CONTENT_SELECT)
    .single();
  if (error) throw new Error(error.message);

  const action = publicationStatus === "published"
    ? "PUBLISH"
    : publicationStatus === "archived"
      ? "ARCHIVE"
      : (previous as unknown as PublicContentRow).publication_status === "archived"
        ? "RESTORE"
        : "UNPUBLISH";

  await audit(userId, action, contentId, previous, saved);
  revalidatePublicPages((previous as unknown as PublicContentRow).content_type);
}

export async function duplicatePublicContentAction(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const contentId = readText(formData, "contentId");

  if (!userId) throw new Error("Sessão administrativa inválida.");
  if (!contentId) throw new Error("Publicação inválida.");

  const { data: original, error: readError } = await supabase
    .from("public_contents")
    .select(PUBLIC_CONTENT_SELECT)
    .eq("id", contentId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!original) throw new Error("Publicação não encontrada.");

  const source = original as unknown as PublicContentRow;
  const suffix = Date.now().toString(36);
  const duplicatePayload = {
    content_type: source.content_type,
    title: `${source.title} (cópia)`,
    slug: `${source.slug.slice(0, 78)}-copia-${suffix}`,
    summary: source.summary,
    category: source.category,
    catalog_category_id: source.catalog_category_id,
    image_url: source.image_url,
    image_path: source.image_path,
    external_url: source.external_url,
    metadata: source.metadata,
    publication_status: "draft" as const,
    is_published: false,
    is_featured: false,
    sort_order: source.sort_order + 1,
    published_at: null,
    archived_at: null,
    created_by: userId,
  };

  const { data: duplicated, error } = await supabase
    .from("public_contents")
    .insert(duplicatePayload)
    .select(PUBLIC_CONTENT_SELECT)
    .single();
  if (error) throw new Error(error.message);

  await audit(userId, "DUPLICATE", duplicated.id, source, duplicated);
  revalidatePublicPages(source.content_type);
}

export async function movePublicContentAction(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const contentId = readText(formData, "contentId");
  const type = readText(formData, "contentType") as PublicContentType;
  const direction = readText(formData, "direction");

  if (!userId) throw new Error("Sessão administrativa inválida.");
  if (!["tutorial", "application", "partner", "product"].includes(type)) throw new Error("Tipo de publicação inválido.");
  if (!contentId || !["up", "down"].includes(direction)) throw new Error("Movimentação inválida.");

  const { data, error } = await supabase
    .from("public_contents")
    .select("id, title, sort_order, created_at")
    .eq("content_type", type)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const ordered = data ?? [];
  const currentIndex = ordered.findIndex((item) => item.id === contentId);
  if (currentIndex < 0) throw new Error("Publicação não encontrada.");

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= ordered.length) return;

  const reordered = [...ordered];
  [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];

  const admin = createAdminClient();
  const updates = await Promise.all(
    reordered.map((item, index) => admin.from("public_contents").update({ sort_order: (index + 1) * 10 }).eq("id", item.id)),
  );
  const updateError = updates.find((result) => result.error)?.error;
  if (updateError) throw new Error(updateError.message);

  await audit(userId, "REORDER", contentId, { position: currentIndex + 1 }, { position: targetIndex + 1 });
  revalidatePublicPages(type);
}

export async function deletePublicContentAction(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const contentId = readText(formData, "contentId");

  if (!userId) throw new Error("Sessão administrativa inválida.");
  if (!contentId) throw new Error("Publicação inválida.");

  const { data: item, error: readError } = await supabase
    .from("public_contents")
    .select(PUBLIC_CONTENT_SELECT)
    .eq("id", contentId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!item) throw new Error("Publicação não encontrada.");

  const { data: otherItems, error: referencesError } = await supabase
    .from("public_contents")
    .select("id, image_path, metadata")
    .neq("id", contentId);
  if (referencesError) throw new Error(referencesError.message);

  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  const appFilePath = typeof metadata.filePath === "string" ? metadata.filePath : "";
  const imageIsShared = Boolean(item.image_path && otherItems?.some((other) => other.image_path === item.image_path));
  const appFileIsShared = Boolean(
    appFilePath && otherItems?.some((other) => {
      const otherMetadata = (other.metadata ?? {}) as Record<string, unknown>;
      return otherMetadata.filePath === appFilePath;
    }),
  );

  const { error } = await supabase.from("public_contents").delete().eq("id", contentId);
  if (error) throw new Error(error.message);

  if (item.image_path && !imageIsShared) {
    const { error: storageError } = await supabase.storage.from("public-assets").remove([item.image_path]);
    if (storageError) console.warn("Publicação excluída, mas a imagem não foi removida:", storageError.message);
  }
  if (appFilePath && !appFileIsShared) {
    const { error: appStorageError } = await supabase.storage.from("app-files").remove([appFilePath]);
    if (appStorageError) console.warn("Publicação excluída, mas o arquivo não foi removido:", appStorageError.message);
  }

  await audit(userId, "DELETE", contentId, item, null);
  revalidatePublicPages((item as unknown as PublicContentRow).content_type);
}
