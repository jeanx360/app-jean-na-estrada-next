import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, QrCode } from "lucide-react";
import { redirect } from "next/navigation";
import { DriverQrCard } from "@/components/DriverQrCard";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import type { DriverPublicProfile } from "@/lib/driver-public";

export const metadata: Metadata = { title: "QR e cartão profissional" };
export const dynamic = "force-dynamic";

export default async function DriverCardPage() {
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista/cartao");
  if (!profile?.is_professional_driver || profile.is_blocked) redirect("/perfil");
  const { data } = await supabase.from("driver_public_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (!data) redirect("/motorista/perfil-publico");
  return <div className="page-stack driver-page"><Link className="text-link driver-back-link" href="/motorista"><ArrowLeft size={17} /> Voltar ao painel</Link><PageHeader icon={<QrCode size={24} />} eyebrow="CARTÃO DIGITAL" title="Seu QR profissional" description="Baixe, compartilhe ou imprima. O passageiro abre seu perfil e pode solicitar uma corrida." /><DriverQrCard profile={data as DriverPublicProfile} /></div>;
}
