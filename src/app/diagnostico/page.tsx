import type { Metadata } from "next";
import { BellRing, CheckCircle2, Clock3, Database, Server, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Diagnóstico",
  description: "Diagnóstico do backend do JNE App.",
};

export const dynamic = "force-dynamic";

export default async function DiagnosticoPage() {
  const envReady = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const serviceRoleReady = Boolean(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);
  const pushReady = Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT,
  );
  const cronReady = Boolean(process.env.CRON_SECRET);
  const publicUrlReady = Boolean(process.env.NEXT_PUBLIC_APP_URL);
  const { userId, profile } = await getAuthContext();

  const checks = [
    { icon: Server, title: "Servidor Next.js", value: "Ativo na Vercel", ok: true },
    { icon: Database, title: "Variáveis do Supabase", value: envReady ? "Configuradas" : "Ausentes", ok: envReady },
    { icon: ShieldCheck, title: "Chave administrativa", value: serviceRoleReady ? "Configurada no servidor" : "Ausente", ok: serviceRoleReady },
    { icon: BellRing, title: "Web Push", value: pushReady ? "Chaves VAPID configuradas" : "Pendente", ok: pushReady },
    { icon: Clock3, title: "Automação diária", value: cronReady ? "CRON_SECRET configurado" : "Pendente", ok: cronReady },
    { icon: Server, title: "URL pública", value: publicUrlReady ? "Configurada para SEO" : "Usando endereço provisório", ok: publicUrlReady },
    { icon: ShieldCheck, title: "Sessão de usuário", value: userId ? `Autenticado como ${profile?.role ?? "member"}` : "Visitante", ok: true },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        icon={<CheckCircle2 size={24} />}
        eyebrow="BACKEND"
        title="Diagnóstico"
        description="Verificação rápida da estrutura Node, autenticação, Supabase, notificações, SEO e automações."
      />
      <section className="diagnostic-grid">
        {checks.map((check) => {
          const Icon = check.icon;
          return (
            <article className="diagnostic-card" key={check.title}>
              <Icon size={24} />
              <div><h2>{check.title}</h2><p>{check.value}</p></div>
              <span className={check.ok ? "is-ok" : "is-error"}>{check.ok ? "OK" : "ATENÇÃO"}</span>
            </article>
          );
        })}
      </section>
    </div>
  );
}
