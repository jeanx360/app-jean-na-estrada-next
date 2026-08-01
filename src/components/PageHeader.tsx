import type { ReactNode } from "react";

type PageHeaderProps = {
  icon?: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeader({ icon, eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="page-header">
      <span className="eyebrow">
        {icon ? <span aria-hidden="true">{icon}</span> : null}
        {eyebrow}
      </span>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
