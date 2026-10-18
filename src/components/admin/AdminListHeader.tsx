import Link from "next/link";
import { Plus } from "lucide-react";

export function AdminListHeader({
  title,
  section,
  description,
  create,
}: {
  title: string;
  section: string;
  description: string;
  create?: { href: string; label: string };
}) {
  return (
    <header className="admin-panel admin-page-header admin-approved-header">
      <div>
        <p className="admin-eyebrow">پنل مدیریت / {section}</p>
        <h1>{title}</h1>
        <p className="admin-hint mt-2">{description}</p>
      </div>
      {create && (
        <Link
          className="admin-primary admin-create-button"
          href={create.href}
          aria-label={create.label}
          title={create.label}
        >
          <Plus size={20} aria-hidden="true" />
          <span className="admin-create-label">{create.label}</span>
        </Link>
      )}
    </header>
  );
}
