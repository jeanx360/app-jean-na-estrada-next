export async function revalidateDriverData(tripId?: string) {
  try {
    await fetch("/api/motorista/revalidar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId }),
      cache: "no-store",
    });
  } catch {
    // A mutação principal já foi concluída. A tela atual ainda será atualizada pelo router.refresh().
  }
}
