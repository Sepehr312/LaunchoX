import { Pagination } from "@/components/store/Pagination";
import { ProductFilters } from "@/components/store/ProductFilters";
import { ProductGrid } from "@/components/store/ProductGrid";
import { toPersianDigits } from "@/lib/format";
import type {
  CategoryDTO,
  PaginatedResult,
  StoreProductDTO,
} from "@/types/dto";
import type { StoreSearchParams } from "@/lib/product-query";

export function CatalogPage({
  eyebrow,
  title,
  description,
  result,
  categories,
  searchParams,
  basePath,
  includeSearch = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  result: PaginatedResult<StoreProductDTO>;
  categories: CategoryDTO[];
  searchParams: StoreSearchParams;
  basePath: string;
  includeSearch?: boolean;
}) {
  return (
    <main className="catalog-page">
      <section className="catalog-hero">
        <div className="store-shell">
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <span>{description}</span>
        </div>
      </section>
      <div className="store-shell grid gap-7 py-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:py-12">
        <aside>
          <ProductFilters
            categories={categories}
            values={searchParams}
            includeSearch={includeSearch}
          />
        </aside>
        <section className="min-w-0" aria-labelledby="results-heading">
          <div className="catalog-results-head">
            <h2 id="results-heading">نتایج محصولات</h2>
            <span>{toPersianDigits(result.total)} کالا</span>
          </div>
          <ProductGrid products={result.items} />
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            basePath={basePath}
            searchParams={searchParams}
          />
        </section>
      </div>
    </main>
  );
}
