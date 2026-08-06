import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Aplicativos",
  description: "Aplicativos automotivos organizados no Catálogo JNE.",
};

type SearchParams = Promise<{ busca?: string | string[]; categoria?: string | string[] }>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AppsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const target = new URLSearchParams({ tipo: "aplicativos" });
  const search = single(params.busca).trim();
  const category = single(params.categoria).trim();
  if (search) target.set("busca", search);
  if (category) target.set("categoria", category);
  redirect(`/catalogo?${target.toString()}`);
}
