"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CatalogCategoryRow, CatalogType } from "@/types/catalog";

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
    .slice(0, 80);
}

function readCatalogType(formData: FormData): CatalogType {
  const value = readText(formData, "catalogType");
  if (value !== "application" && value !== "product") throw new Error("Tipo de catálogo inválido.");
  return value;
}

function revalidateCatalog() {
  revalidatePath("/catalogo");
  revalidatePath("/aplicativos");
  revalidatePath("/produtos");
  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/publicacoes");
}

async function audit(actorUserId: string, action: string, entityId: string, oldData?: unknown, newData?: unknown) {
  const admin = createAdminClient();
  const { error } = await admin.from("admin_audit_logs").insert({
    actor_user_id: actorUserId,
    action,
    entity_type: "catalog_categories",
    entity_id: entityId,
    old_data: oldData ?? null,
    new_data: newData ?? null,
  });
  if (error) console.warn("Falha ao registrar auditoria do catálogo:", error.message);
}

export async function saveCatalogCategoryAction(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  if (!userId) throw new Error("Sessão administrativa inválida.");

  const categoryId = readText(formData, "categoryId");
  const catalogType = readCatalogType(formData);
  const name = readText(formData, "name");
  const requestedSlug = readText(formData, "slug");
  const description = readText(formData, "description");
  const sortOrder = Number(readText(formData, "sortOrder") || "100");
  const isActive = readBoolean(formData, "isActive");

  if (!name) throw new Error("Informe o nome da categoria.");
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) {
    throw new Error("A ordem precisa ser um número inteiro entre 0 e 100.000.");
  }

  const slug = slugify(requestedSlug || name);
  if (!slug) throw new Error("Não foi possível gerar o identificador da categoria.");

  let previous: CatalogCategoryRow | null = null;
  if (categoryId) {
    const { data, error } = await supabase
      .from("catalog_categories")
      .select("id, catalog_type, name, slug, description, sort_order, is_active, created_at, updated_at")
      .eq("id", categoryId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Categoria não encontrada.");
    previous = data as unknown as CatalogCategoryRow;
  }

  const payload = {
    catalog_type: catalogType,
    name,
    slug,
    description: description || null,
    sort_order: sortOrder,
    is_active: isActive,
  };

  const query = categoryId
    ? supabase.from("catalog_categories").update(payload).eq("id", categoryId)
    : supabase.from("catalog_categories").insert({ ...payload, created_by: userId });

  const { data, error } = await query
    .select("id, catalog_type, name, slug, description, sort_order, is_active, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Já existe uma categoria com esse nome ou identificador.");
    throw new Error(error.message);
  }

  const saved = data as unknown as CatalogCategoryRow;
  await audit(userId, categoryId ? "UPDATE" : "INSERT", saved.id, previous, saved);
  revalidateCatalog();
}

export async function toggleCatalogCategoryAction(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const categoryId = readText(formData, "categoryId");
  const isActive = readBoolean(formData, "isActive");
  if (!userId || !categoryId) throw new Error("Categoria inválida.");

  const { data: previous, error: readError } = await supabase
    .from("catalog_categories")
    .select("id, catalog_type, name, slug, description, sort_order, is_active, created_at, updated_at")
    .eq("id", categoryId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!previous) throw new Error("Categoria não encontrada.");

  if (!isActive) {
    const { count, error: countError } = await supabase
      .from("public_contents")
      .select("id", { count: "exact", head: true })
      .eq("catalog_category_id", categoryId);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) throw new Error("Mova os itens desta categoria antes de ocultá-la.");
  }

  const { data, error } = await supabase
    .from("catalog_categories")
    .update({ is_active: isActive })
    .eq("id", categoryId)
    .select("id, catalog_type, name, slug, description, sort_order, is_active, created_at, updated_at")
    .single();
  if (error) throw new Error(error.message);

  await audit(userId, isActive ? "RESTORE" : "ARCHIVE", categoryId, previous, data);
  revalidateCatalog();
}

export async function deleteCatalogCategoryAction(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const categoryId = readText(formData, "categoryId");
  if (!userId || !categoryId) throw new Error("Categoria inválida.");

  const { data: previous, error: readError } = await supabase
    .from("catalog_categories")
    .select("id, catalog_type, name, slug, description, sort_order, is_active, created_at, updated_at")
    .eq("id", categoryId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!previous) throw new Error("Categoria não encontrada.");

  const { count, error: countError } = await supabase
    .from("public_contents")
    .select("id", { count: "exact", head: true })
    .eq("catalog_category_id", categoryId);
  if (countError) throw new Error(countError.message);
  if ((count ?? 0) > 0) throw new Error("Mova os itens desta categoria antes de excluí-la.");

  const { error } = await supabase.from("catalog_categories").delete().eq("id", categoryId);
  if (error) throw new Error(error.message);

  await audit(userId, "DELETE", categoryId, previous, null);
  revalidateCatalog();
}

export async function assignCatalogCategoryAction(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  if (!userId) throw new Error("Sessão administrativa inválida.");

  const catalogType = readCatalogType(formData);
  const categoryId = readText(formData, "catalogCategoryId");
  const contentIds = formData
    .getAll("contentIds")
    .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    .map((value) => value.trim());

  if (!categoryId) throw new Error("Escolha a categoria de destino.");
  if (!contentIds.length) throw new Error("Selecione pelo menos um item.");

  const { data: category, error: categoryError } = await supabase
    .from("catalog_categories")
    .select("id, catalog_type, name")
    .eq("id", categoryId)
    .maybeSingle();
  if (categoryError) throw new Error(categoryError.message);
  const categoryRow = category as unknown as { id: string; catalog_type: string; name: string } | null;
  if (!categoryRow || categoryRow.catalog_type !== catalogType) throw new Error("A categoria não pertence a esta área do catálogo.");

  const { data: previous, error: readError } = await supabase
    .from("public_contents")
    .select("id, title, category, catalog_category_id")
    .eq("content_type", catalogType)
    .in("id", contentIds);
  if (readError) throw new Error(readError.message);
  if ((previous ?? []).length !== contentIds.length) throw new Error("Um ou mais itens selecionados são inválidos.");

  const { data: updated, error } = await supabase
    .from("public_contents")
    .update({ catalog_category_id: categoryId, category: categoryRow.name })
    .eq("content_type", catalogType)
    .in("id", contentIds)
    .select("id, title, category, catalog_category_id");
  if (error) throw new Error(error.message);

  await audit(userId, "BULK_ASSIGN", categoryId, previous, updated);
  revalidateCatalog();
}
