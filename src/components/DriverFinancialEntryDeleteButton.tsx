"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { revalidateDriverData } from "@/lib/driver-client";

export function DriverFinancialEntryDeleteButton({ entryId, tripId }: { entryId: string; tripId?: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  async function remove() {
    if (!window.confirm("Excluir este lançamento?")) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("driver_financial_entries").delete().eq("id", entryId);
    if (!error) await revalidateDriverData(tripId);
    setDeleting(false);
    router.refresh();
  }
  return <button className="icon-button driver-entry-delete" type="button" onClick={remove} disabled={deleting} aria-label="Excluir lançamento">{deleting ? <LoaderCircle className="auth-spinner" size={16} /> : <Trash2 size={16} />}</button>;
}
