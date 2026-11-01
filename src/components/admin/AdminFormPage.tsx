import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export function AdminFormPage({
  title,
  description,
  listLabel,
  listHref,
  children,
}: {
  title: string;
  description: string;
  listLabel: string;
  listHref: string;
  children: ReactNode;
}) {
  return (
    <section className="admin-panel admin-editor-page">
      <header className="admin-page-header admin-editor-header">
        <div>
          <h1>{title}</h1>
          <p className="admin-hint mt-2">{description}</p>
        </div>
        <Link className="admin-editor-back" href={listHref}>
          <ArrowRight size={18} aria-hidden="true" />
          بازگشت به {listLabel}
        </Link>
      </header>
      {children}
    </section>
  );
}
