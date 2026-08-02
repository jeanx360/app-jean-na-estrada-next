"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import type { VehicleLibraryActionState, VehicleDocumentAccess, VehicleDocumentSource, VehicleDocumentType } from "@/types/vehicle-library";

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
    .replace(/^-|-$/g, "");
}

function parseOrder(value: string) {
  const order = Number(value || "100");
  return Number.isInteger(order) && order >= 0 && order <= 100000 ? order : null;
}

function parseYears(value: string) {
  const years = Array.from(
    new Set(
      value
        .split(/[\s,;/|]+/)
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item >= 1990 && item <= 2100),
    ),
  ).sort((a, b) => b - a);
  return years;
}

function revalidateLibrary() {
  revalidatePath("/guia");
  revalidatePath("/admin");
  revalidatePath("/admin/manuais");
}

export async function saveVehicleBrandAction(
  _previousState: VehicleLibraryActionState,
  formData: FormData,
): Promise<VehicleLibraryActionState> {
  const { supabase } = await requireAdmin();
  const brandId = readText(formData, "brandId");
  const name = readText(formData, "name");
  const sortOrder = parseOrder(readText(formData, "sortOrder"));
  if (!name) return { error: "Informe o nome da marca." };
  if (sortOrder === null) return { error: "A ordem deve ser um inteiro entre 0 e 100.000." };

  const payload = {
    name,
    slug: slugify(readText(formData, "slug") || name),
    logo_url: readText(formData, "logoUrl") || null,
    sort_order: sortOrder,
    is_published: readBoolean(formData, "isPublished"),
  };
  const query = brandId
    ? supabase.from("vehicle_brands").update(payload).eq("id", brandId)
    : supabase.from("vehicle_brands").insert(payload);
  const { error } = await query;
  if (error) return { error: `Não foi possível salvar a marca: ${error.message}` };
  revalidateLibrary();
  return { success: brandId ? "Marca atualizada." : "Marca cadastrada." };
}

export async function saveVehicleModelAction(
  _previousState: VehicleLibraryActionState,
  formData: FormData,
): Promise<VehicleLibraryActionState> {
  const { supabase } = await requireAdmin();
  const modelId = readText(formData, "modelId");
  const brandId = readText(formData, "brandId");
  const name = readText(formData, "name");
  const sortOrder = parseOrder(readText(formData, "sortOrder"));
  if (!brandId || !name) return { error: "Selecione a marca e informe o nome do veículo." };
  if (sortOrder === null) return { error: "A ordem deve ser um inteiro entre 0 e 100.000." };

  const payload = {
    brand_id: brandId,
    name,
    slug: slugify(readText(formData, "slug") || name),
    image_url: readText(formData, "imageUrl") || null,
    image_path: readText(formData, "imagePath") || null,
    sort_order: sortOrder,
    is_published: readBoolean(formData, "isPublished"),
  };
  if (modelId) {
    const { data: previous } = await supabase
      .from("vehicle_models")
      .select("image_path")
      .eq("id", modelId)
      .maybeSingle();

    const { error } = await supabase.from("vehicle_models").update(payload).eq("id", modelId);
    if (error) return { error: `Não foi possível salvar o veículo: ${error.message}` };

    if (previous?.image_path && previous.image_path !== payload.image_path) {
      await supabase.storage.from("public-assets").remove([previous.image_path]);
    }
  } else {
    const { error } = await supabase.from("vehicle_models").insert(payload);
    if (error) return { error: `Não foi possível salvar o veículo: ${error.message}` };
  }

  revalidateLibrary();
  return { success: modelId ? "Veículo atualizado." : "Veículo cadastrado." };
}

export async function saveVehicleDocumentAction(
  _previousState: VehicleLibraryActionState,
  formData: FormData,
): Promise<VehicleLibraryActionState> {
  const { supabase } = await requireAdmin();
  const documentId = readText(formData, "documentId");
  const modelId = readText(formData, "modelId");
  const title = readText(formData, "title");
  const documentType = readText(formData, "documentType") as VehicleDocumentType;
  const sourceType = readText(formData, "sourceType") as VehicleDocumentSource;
  const accessLevel = readText(formData, "accessLevel") as VehicleDocumentAccess;
  const years = parseYears(readText(formData, "years"));
  const sortOrder = parseOrder(readText(formData, "sortOrder"));
  const externalUrl = readText(formData, "externalUrl");
  const filePath = readText(formData, "filePath");

  if (!modelId || !title) return { error: "Selecione o veículo e informe o título do documento." };
  if (!years.length) return { error: "Informe ao menos um ano/modelo válido, por exemplo 2024, 2025." };
  if (!(["owner", "maintenance", "warranty", "multimedia", "quick-guide", "technical", "other"] as string[]).includes(documentType)) {
    return { error: "Tipo de documento inválido." };
  }
  if (!(["upload", "external"] as string[]).includes(sourceType)) return { error: "Origem do documento inválida." };
  if (!(["public", "vip"] as string[]).includes(accessLevel)) return { error: "Nível de acesso inválido." };
  if (sourceType === "external" && !/^https:\/\//i.test(externalUrl)) return { error: "Informe um link externo iniciado por https://." };
  if (sourceType === "upload" && !filePath) return { error: "Envie o PDF antes de salvar o documento." };
  if (sortOrder === null) return { error: "A ordem deve ser um inteiro entre 0 e 100.000." };

  const isPublished = readBoolean(formData, "isPublished");
  const payload = {
    model_id: modelId,
    title,
    document_type: documentType,
    description: readText(formData, "description") || null,
    years,
    source_type: sourceType,
    external_url: sourceType === "external" ? externalUrl : null,
    file_path: sourceType === "upload" ? filePath : null,
    file_name: sourceType === "upload" ? readText(formData, "fileName") || null : null,
    file_size: sourceType === "upload" ? Number(readText(formData, "fileSize") || "0") || null : null,
    language: readText(formData, "language") || "Português",
    source_name: readText(formData, "sourceName") || null,
    access_level: accessLevel,
    is_published: isPublished,
    sort_order: sortOrder,
    published_at: isPublished ? new Date().toISOString() : null,
  };

  if (documentId) {
    const { data: previous } = await supabase.from("vehicle_documents").select("file_path").eq("id", documentId).maybeSingle();
    const { error } = await supabase.from("vehicle_documents").update(payload).eq("id", documentId);
    if (error) return { error: `Não foi possível atualizar: ${error.message}` };
    if (previous?.file_path && previous.file_path !== payload.file_path) {
      await supabase.storage.from("vehicle-documents").remove([previous.file_path]);
    }
  } else {
    const { error } = await supabase.from("vehicle_documents").insert(payload);
    if (error) return { error: `Não foi possível cadastrar: ${error.message}` };
  }

  revalidateLibrary();
  return { success: documentId ? "Documento atualizado." : "Documento cadastrado." };
}

export async function toggleVehicleDocumentAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = readText(formData, "documentId");
  const publish = readText(formData, "publish") === "true";
  if (!id) throw new Error("Documento inválido.");
  const { error } = await supabase
    .from("vehicle_documents")
    .update({ is_published: publish, published_at: publish ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateLibrary();
}

export async function deleteVehicleDocumentAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = readText(formData, "documentId");
  if (!id) throw new Error("Documento inválido.");
  const { data } = await supabase.from("vehicle_documents").select("file_path").eq("id", id).maybeSingle();
  if (data?.file_path) await supabase.storage.from("vehicle-documents").remove([data.file_path]);
  const { error } = await supabase.from("vehicle_documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateLibrary();
}
