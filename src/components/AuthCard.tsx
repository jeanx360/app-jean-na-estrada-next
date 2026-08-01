import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-card__icon">
          <ShieldCheck size={28} />
        </div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="auth-card__description">{description}</p>
        {children}
      </div>
    </section>
  );
}
