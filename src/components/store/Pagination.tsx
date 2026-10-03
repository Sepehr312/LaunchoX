import Link from "next/link";
import { ChevronIcon } from "@/components/store/Icons";
import { toPersianDigits } from "@/lib/format";

function pageHref(basePath: string, params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  if (page <= 1) next.delete("page");
  else next.set("page", String(page));
  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (totalPages <= 1) return null;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  return (
    <nav className="pagination" aria-label="صفحه‌بندی محصولات">
      {page > 1 ? (
        <Link
          href={pageHref(basePath, params, page - 1)}
          aria-label="صفحه قبلی"
        >
          <ChevronIcon className="size-5 rotate-180" />
        </Link>
      ) : (
        <span aria-hidden="true">
          <ChevronIcon className="size-5 rotate-180" />
        </span>
      )}
      <strong>
        صفحهٔ {toPersianDigits(page)} از {toPersianDigits(totalPages)}
      </strong>
      {page < totalPages ? (
        <Link
          href={pageHref(basePath, params, page + 1)}
          aria-label="صفحه بعدی"
        >
          <ChevronIcon className="size-5" />
        </Link>
      ) : (
        <span aria-hidden="true">
          <ChevronIcon className="size-5" />
        </span>
      )}
    </nav>
  );
}
