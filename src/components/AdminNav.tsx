import Link from "next/link";
import { Crown, KeyRound, LayoutDashboard, Megaphone, UsersRound } from "lucide-react";

const items = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/membros", label: "Membros", icon: UsersRound },
  { href: "/admin/convites", label: "Convites VIP", icon: KeyRound },
  { href: "/admin/recados", label: "Recados", icon: Megaphone },
  { href: "/admin/conteudos", label: "Conteúdo VIP", icon: Crown },
];

export function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Navegação administrativa">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link href={item.href} key={item.href}>
            <Icon size={18} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
