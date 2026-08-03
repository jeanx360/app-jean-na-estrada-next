import Link from "next/link";
import { adminNavigationItems } from "@/data/admin-navigation";

export function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Navegação administrativa">
      {adminNavigationItems.map((item) => {
        const Icon = item.icon;
        return <Link href={item.href} key={item.href}><Icon size={18} /><span>{item.label}</span></Link>;
      })}
    </nav>
  );
}
