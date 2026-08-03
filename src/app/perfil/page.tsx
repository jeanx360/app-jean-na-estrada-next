import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2, LockKeyhole, ShieldAlert, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { PageHeader } from "@/components/PageHeader";
import { ProfileEditor } from "@/components/ProfileEditor";
import { getAuthContext } from "@/lib/auth";
import { getLegalAcceptanceStatus } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Meu perfil",
  description: "Edite seus dados e preferências da conta JNE.",
};

export default async function ProfilePage() {
  const { supabase, userId, email, profile } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/perfil");
  if (!profile) redirect("/membros");

  const legal = await getLegalAcceptanceStatus(supabase, userId);
  const { data: authData } = await supabase.auth.getUser();
  const metadata = authData.user?.user_metadata ?? {};
  const initialPhone = typeof metadata.phone === "string" ? metadata.phone : "";
  const initialVehicleModel = typeof metadata.vehicle_model === "string" ? metadata.vehicle_model : "";
  const initialVehiclePlate = typeof metadata.vehicle_plate === "string" ? metadata.vehicle_plate : "";

  return (
    <div className="page-stack">
      <PageHeader
        icon={<UserRound size={24} />}
        eyebrow="CONTA JNE"
        title="Meu perfil"
        description="Atualize sua conta, foto e escolha se deseja usar o JNE App como motorista profissional."
      />

      {profile.is_blocked ? (
        <div className="member-warning"><ShieldAlert size={20} /><div><strong>Conta bloqueada</strong><p>Algumas alterações podem ficar indisponíveis.</p></div></div>
      ) : null}

      <ProfileEditor
        profile={profile}
        email={email}
        initialPhone={initialPhone}
        initialVehicleModel={initialVehicleModel}
        initialVehiclePlate={initialVehiclePlate}
      />

      <section className="profile-security-grid">
        <article><LockKeyhole size={22} /><h2>Senha e acesso</h2><p>Atualize sua senha caso suspeite de acesso indevido.</p><Link className="button button--secondary" href="/atualizar-senha">Alterar senha</Link></article>
        <article><FileCheck2 size={22} /><h2>Documentos aceitos</h2><p>{legal.complete ? "Termos e política atuais confirmados." : "Existe um aceite pendente."}</p><Link className="button button--secondary" href="/aceite?next=/perfil">Revisar documentos</Link></article>
      </section>

      <section className="danger-zone">
        <div><ShieldAlert size={22} /><div><span>ZONA DE RISCO</span><h2>Excluir conta</h2><p>A exclusão remove o acesso e os dados vinculados. Esta ação não pode ser desfeita.</p></div></div>
        <DeleteAccountForm disabled={profile.role === "admin"} />
      </section>
    </div>
  );
}
