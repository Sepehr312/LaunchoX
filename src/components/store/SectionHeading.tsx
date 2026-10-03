import Link from "next/link";
import { ChevronIcon } from "@/components/store/Icons";

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p>{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <span>{description}</span>}
      </div>
      {href && (
        <Link href={href}>
          مشاهده همه <ChevronIcon className="size-4" />
        </Link>
      )}
    </div>
  );
}
