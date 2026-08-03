import Link from "next/link";
import {
  BellRing,
  BookOpenText,
  CarFront,
  CreditCard,
  Crown,
  FileText,
  Images,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  RefreshCw,
  ScrollText,
  UsersRound,
} from "lucide-react";

const items = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/membros", label: "Membros e VIP", icon: UsersRound },
  { href: "/admin/motoristas", label: "Motoristas e viagens", icon: CarFront },
  { href: "/admin/assinatura", label: "Assinatura e pagamentos", icon: CreditCard },
  { href: "/admin/comunidade", label: "Comunidade VIP", icon: MessageCircle },
  { href: "/admin/convites", label: "Convites VIP", icon: KeyRound },
  { href: "/admin/recados", label: "Recados", icon: Megaphone },
  { href: "/admin/notificacoes", label: "Notificações", icon: BellRing },
  { href: "/admin/automacoes", label: "Automações", icon: RefreshCw },
  { href: "/admin/publicacoes", label: "Conteúdo público", icon: FileText },
  { href: "/admin/manuais", label: "Veículos e manuais", icon: BookOpenText },
  { href: "/admin/home", label: "Carrossel da home", icon: Images },
  { href: "/admin/conteudos", label: "Conteúdo VIP", icon: Crown },
  { href: "/admin/logs", label: "Logs", icon: ScrollText },
];

export function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Navegação administrativa">
      {items.map((item) => {
        const Icon = item.icon;
        return <Link href={item.href} key={item.href}><Icon size={18} /><span>{item.label}</span></Link>;
      })}
    </nav>
  );
}
