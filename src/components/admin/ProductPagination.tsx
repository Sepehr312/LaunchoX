import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { toPersianDigits } from "@/lib/format";

export function ProductPagination({
  page,
  totalPages,
  q,
}: {
  page: number;
  totalPages: number;
  q?: string;
}) {
  if (totalPages <= 1) return null;
  function href(target: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (target > 1) params.set("page", String(target));
    return `/admin/products${params.size ? `?${params}` : ""}`;
  }
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => start + index,
  );
  return (
    <nav className="admin-product-pagination" aria-label="صفحه‌بندی محصولات">
      {page > 1 ? (
        <Link href={href(page - 1)} aria-label="صفحه قبلی">
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
      ) : (
        <span aria-hidden="true">
          <ChevronRight size={18} />
        </span>
      )}
      {pages.map((number) => (
        <Link
          key={number}
          href={href(number)}
          aria-label={`صفحه ${toPersianDigits(number)}`}
          aria-current={page === number ? "page" : undefined}
        >
          {toPersianDigits(number)}
        </Link>
      ))}
      {page < totalPages ? (
        <Link href={href(page + 1)} aria-label="صفحه بعدی">
          <ChevronLeft size={18} aria-hidden="true" />
        </Link>
      ) : (
        <span aria-hidden="true">
          <ChevronLeft size={18} />
        </span>
      )}
    </nav>
  );
}
