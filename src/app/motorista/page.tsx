import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Car, FileText, Home, Settings2, TrendingUp, WalletCards } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getAuthContext } from "@/lib/auth";
import { DEFAULT_DRIVER_SETTINGS, driverTripMonthKey, formatCurrency, monthKeyInTimeZone, type DriverQuote, type DriverSettings, type DriverTrip } from "@/lib/driver";

export const metadata: Metadata = { title: "Painel do motorista" };
export const dynamic = "force-dynamic";

export default async function DriverDashboardPage() {
  const { supabase, userId, profile } = await getAuthContext();
  if (!userId) redirect("/entrar?next=/motorista");
  if (!profile) redirect("/membros");

  const [{ data: settingsData }, { data: quoteData }, { data: tripData }] = await Promise.all([
    supabase.from("driver_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("driver_quotes").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("driver_trips").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
  ]);

  const settings: DriverSettings = settingsData ? settingsData as DriverSettings : { user_id: userId, ...DEFAULT_DRIVER_SETTINGS };
  const quotes = (quoteData ?? []) as DriverQuote[];
  const trips = (tripData ?? []) as DriverTrip[];
  const currentMonthKey = monthKeyInTimeZone(new Date());
  const monthQuotes = quotes.filter((quote) => monthKeyInTimeZone(quote.created_at) === currentMonthKey);
  const monthTrips = trips.filter((trip) => driverTripMonthKey(trip) === currentMonthKey && trip.status === "completed");
  const monthPotential = monthQuotes.reduce((total, quote) => total + Number(quote.rounded_total || 0), 0);
  const monthNet = monthTrips.reduce((total, trip) => total + Number(trip.net_result || 0), 0);

  if (!profile.is_professional_driver) {
    return (
      <div className="page-stack driver-page">
        <PageHeader icon={<Car size={24} />} eyebrow="MOTORISTA PROFISSIONAL" title="Transforme o JNE App em ferramenta de trabalho" description="Ative o perfil profissional para abrir o app direto neste painel e salvar seus orçamentos." />
        <section className="driver-onboarding-card"><div><h2>Ative no seu perfil</h2><p>A calculadora continua gratuita, mas o painel personalizado, os valores padrão e o histórico ficam vinculados à sua conta.</p></div><Link className="button button--primary" href="/perfil">Configurar perfil <ArrowRight size={18} /></Link></section>
        <Link className="driver-open-calculator-card" href="/motorista/calculadora"><Calculator size={28} /><div><strong>Calcular uma viagem agora</strong><span>Use mesmo antes de ativar o perfil profissional.</span></div><ArrowRight size={20} /></Link>
      </div>
    );
  }

  return (
    <div className="page-stack driver-page">
      <div className="driver-dashboard-hero">
        <div><span className="eyebrow">PAINEL DO MOTORISTA</span><h1>Pronto para o próximo serviço?</h1><p>Calcule, compartilhe o orçamento e acompanhe o que realmente sobrou em cada viagem.</p></div>
        <div className="driver-dashboard-hero__actions"><Link className="button button--primary" href="/motorista/calculadora"><Calculator size={18} /> Calcular viagem</Link><Link className="button button--secondary" href="/?modo=conteudo"><Home size={18} /> Conteúdo JNE</Link></div>
      </div>

      <section className="driver-dashboard-stats">
        <article><FileText size={22} /><span>Orçamentos neste mês</span><strong>{monthQuotes.length}</strong></article>
        <article><TrendingUp size={22} /><span>Valor potencial</span><strong>{formatCurrency(monthPotential)}</strong></article>
        <article><WalletCards size={22} /><span>Líquido concluído</span><strong>{formatCurrency(monthNet)}</strong></article>
        <article><Car size={22} /><span>Seu valor por km</span><strong>{formatCurrency(settings.km_rate)}</strong></article>
      </section>

      <section className="driver-dashboard-grid driver-dashboard-grid--four">
        <article className="driver-dashboard-card driver-dashboard-card--primary"><Calculator size={26} /><div><h2>Novo orçamento</h2><p>Distância, tempo, espera, pedágios e custos em uma conta só.</p></div><Link className="button button--primary" href="/motorista/calculadora">Começar</Link></article>
        <article className="driver-dashboard-card"><FileText size={26} /><div><h2>Histórico</h2><p>Consulte e compartilhe as últimas referências salvas.</p></div><Link className="button button--secondary" href="/motorista/orcamentos">Ver orçamentos</Link></article>
        <article className="driver-dashboard-card"><WalletCards size={26} /><div><h2>Controle financeiro</h2><p>Receitas, despesas, valores pendentes e resultado líquido.</p></div><Link className="button button--secondary" href="/motorista/financeiro">Abrir financeiro</Link></article>
        <article className="driver-dashboard-card"><Settings2 size={26} /><div><h2>Valores padrão</h2><p>Ajuste preço por hora, quilômetro, espera e reserva.</p></div><Link className="button button--secondary" href="/motorista/configuracoes">Configurar</Link></article>
      </section>

      <section className="driver-recent-section">
        <div className="section-heading section-heading--inline"><div><span className="eyebrow">RECENTES</span><h2>Últimos orçamentos</h2></div><Link className="text-link" href="/motorista/orcamentos">Ver todos <ArrowRight size={17} /></Link></div>
        {quotes.length ? <div className="driver-recent-list">{quotes.slice(0, 4).map((quote) => <article key={quote.id}><div><strong>{[quote.origin, quote.destination].filter(Boolean).join(" → ") || "Viagem particular"}</strong><span>{new Date(quote.created_at).toLocaleDateString("pt-BR")}</span></div><b>{formatCurrency(quote.rounded_total)}</b></article>)}</div> : <p className="driver-empty-copy">Seus orçamentos salvos aparecerão aqui.</p>}
      </section>
    </div>
  );
}
