"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ChevronLeft,
  ChevronDown,
  SlidersHorizontal,
  Snowflake,
  RotateCcw,
  X,
} from "lucide-react";
import { z } from "zod";
import { ProductCard } from "@/components/store/ProductCard";
import { BrandHero, BrandAbout } from "@/components/store/BrandDetail";
import type {
  CategoryDTO,
  PaginatedResult,
  StoreProductDTO,
  ProductFilterOptionsDTO,
  StoreBrandDetailDTO,
} from "@/types/dto";
import type { ProductQueryInput } from "@/validations/product";
import { usePreviewTheme } from "@/components/preview/frostic/use-preview-theme";
import themeStyles from "@/components/preview/frostic/frostic-theme.module.css";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { parseProductQuery } from "@/lib/product-query";

import styles from "./ProductsCatalog.module.css";

const filterSchema = z.object({
  category: z.string(),
  min: z.coerce.number().int().min(0),
  max: z.coerce.number().int().min(0),
  inStock: z.boolean(),
  brands: z.array(z.string()),
  energies: z.array(z.string()),
  capacity: z.enum(["all", "small", "medium", "large"]),
  discounted: z.boolean(),
});
type Filters = z.infer<typeof filterSchema>;
const emptyFilters: Filters = {
  category: "",
  min: 0,
  max: 150000000,
  inStock: false,
  brands: [],
  energies: [],
  capacity: "all",
  discounted: false,
};
const sorts = [
  "newest",
  "price_asc",
  "price_desc",
  "bestselling",
  "discount",
] as const;
const sortLabels = [
  "جدیدترین",
  "ارزان‌ترین",
  "گران‌ترین",
  "پرفروش‌ترین",
  "بیشترین تخفیف",
];

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className={styles.filterSection}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        {title}
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <fieldset>
        <legend className="sr-only">{title}</legend>
        {children}
      </fieldset>
    </details>
  );
}

function FilterControls({
  filters,
  update,
  reset,
  brands,
  energies,
  priceCeiling,
  hideBrands = false,
}: {
  filters: Filters;
  update: (next: Filters) => void;
  reset: () => void;
  brands: string[];
  energies: string[];
  priceCeiling: number;
  hideBrands?: boolean;
}) {
  const id = useId();
  return (
    <div className={styles.filters}>
      <div className={styles.filterHeading}>
        <h2>
          <SlidersHorizontal size={18} /> فیلترها
        </h2>
        <button onClick={reset} type="button" className={styles.reset}>
          <RotateCcw size={14} /> پاک کردن
        </button>
      </div>
      {!hideBrands && (
        <FilterSection title="برند">
          <div className={styles.optionGrid}>
            {brands.map((brand) => (
              <label key={brand} className={styles.choice}>
                <input
                  type="checkbox"
                  checked={filters.brands.includes(brand)}
                  onChange={(event) =>
                    update({
                      ...filters,
                      brands: event.target.checked
                        ? [...filters.brands, brand]
                        : filters.brands.filter((item) => item !== brand),
                    })
                  }
                />
                {brand}
              </label>
            ))}
          </div>
        </FilterSection>
      )}
      <FilterSection title="محدوده قیمت">
        <label htmlFor={`${id}-min`} className={styles.priceValue}>
          از <output>{formatPrice(filters.min)}</output>
        </label>
        <input
          id={`${id}-min`}
          aria-label="حداقل قیمت"
          type="range"
          min={0}
          max={priceCeiling}
          step={1000000}
          value={filters.min}
          aria-valuetext={formatPrice(filters.min)}
          style={
            {
              "--range-progress": `${(filters.min / priceCeiling) * 100}%`,
            } as CSSProperties
          }
          onChange={(event) =>
            update({
              ...filters,
              min: Math.min(Number(event.target.value), filters.max),
            })
          }
        />
        <label htmlFor={`${id}-max`} className={styles.priceValue}>
          تا <output>{formatPrice(filters.max)}</output>
        </label>
        <input
          id={`${id}-max`}
          aria-label="حداکثر قیمت"
          type="range"
          min={0}
          max={priceCeiling}
          step={1000000}
          value={filters.max}
          aria-valuetext={formatPrice(filters.max)}
          style={
            {
              "--range-progress": `${(filters.max / priceCeiling) * 100}%`,
            } as CSSProperties
          }
          onChange={(event) =>
            update({
              ...filters,
              max: Math.max(Number(event.target.value), filters.min),
            })
          }
        />
      </FilterSection>
      <FilterSection title="ظرفیت">
        <div className={styles.capacityOptions}>
          {(
            [
              ["all", "همه ظرفیت‌ها"],
              ["small", "کمتر از ۴۰۰ لیتر"],
              ["medium", "۴۰۰ تا ۶۰۰ لیتر"],
              ["large", "بیشتر از ۶۰۰ لیتر"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={styles.choice}>
              <input
                type="radio"
                name={`${id}-capacity`}
                value={value}
                checked={filters.capacity === value}
                onChange={() => update({ ...filters, capacity: value })}
              />
              {label}
            </label>
          ))}
        </div>
      </FilterSection>
      <FilterSection title="رده انرژی">
        <div className={styles.energyOptions}>
          {energies.map((energy) => (
            <label key={energy} className={styles.choice}>
              <input
                type="checkbox"
                checked={filters.energies.includes(energy)}
                onChange={(event) =>
                  update({
                    ...filters,
                    energies: event.target.checked
                      ? [...filters.energies, energy]
                      : filters.energies.filter((item) => item !== energy),
                  })
                }
              />
              <bdi>{energy}</bdi>
            </label>
          ))}
        </div>
      </FilterSection>
      <fieldset className={styles.productStatus}>
        <legend>وضعیت محصول</legend>
        <label className={styles.switchRow}>
          <input
            type="checkbox"
            role="switch"
            checked={filters.inStock}
            onChange={(event) =>
              update({ ...filters, inStock: event.target.checked })
            }
          />
          فقط کالاهای موجود
        </label>
        <label className={styles.switchRow}>
          <input
            type="checkbox"
            role="switch"
            checked={filters.discounted}
            onChange={(event) =>
              update({ ...filters, discounted: event.target.checked })
            }
          />
          فقط کالاهای تخفیف‌دار
        </label>
      </fieldset>
    </div>
  );
}

export function ProductsCatalog({
  categories,
  options,
  result: initialResult,
  query: initialQuery,
  error,
  selectedCategory,
  brand,
  loadProducts,
}: {
  categories: CategoryDTO[];
  options: ProductFilterOptionsDTO;
  result: PaginatedResult<StoreProductDTO>;
  query: ProductQueryInput;
  error?: string;
  selectedCategory?: CategoryDTO;
  brand?: StoreBrandDetailDTO;
  loadProducts?: (
    values: Record<string, string | string[]>,
  ) => Promise<PaginatedResult<StoreProductDTO>>;
}) {
  const basePath = brand
    ? `/brands/${encodeURIComponent(brand.slug)}`
    : selectedCategory
      ? `/categories/${encodeURIComponent(selectedCategory.slug)}`
      : "/products";
  const propsKey = JSON.stringify(initialQuery);
  const [catalog, setCatalog] = useState({
    propsKey,
    query: initialQuery,
    result: initialResult,
  });
  if (catalog.propsKey !== propsKey) {
    setCatalog({ propsKey, query: initialQuery, result: initialResult });
  }
  const { query, result } =
    catalog.propsKey === propsKey
      ? catalog
      : { query: initialQuery, result: initialResult };
  const [pending, setPending] = useState(false);
  const [requestError, setRequestError] = useState<string>();
  const request = useRef<AbortController | null>(null);
  const load = useCallback(
    async (params: URLSearchParams, push = true, append = false) => {
      const requestParams = new URLSearchParams(params);
      if (brand) {
        requestParams.delete("brands");
        requestParams.delete("brandSlug");
      }
      if (selectedCategory) {
        requestParams.set("category", selectedCategory.id);
      }
      if (!requestParams.has("limit")) {
        requestParams.set("limit", String(initialResult.limit));
      }
      const values: Record<string, string | string[]> = {};
      for (const key of requestParams.keys()) {
        const entries = requestParams.getAll(key);
        values[key] = entries.length > 1 ? entries : entries[0];
      }
      const parsed = parseProductQuery(values);
      if (!parsed.success) {
        setRequestError(parsed.error.issues[0]?.message);
        return;
      }
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setPending(true);
      setRequestError(undefined);
      try {
        let body: { data: PaginatedResult<StoreProductDTO> };
        if (loadProducts) {
          body = { data: await loadProducts(values) };
        } else {
          const response = await fetch(`/api/products?${requestParams}`, {
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("Catalog request failed");
          body = (await response.json()) as {
            data: PaginatedResult<StoreProductDTO>;
          };
        }
        if (controller.signal.aborted) return;
        setCatalog((previous) => {
          const existing = append ? previous.result.items : [];
          const ids = new Set(existing.map((product) => product.id));
          return {
            propsKey,
            query: append ? previous.query : parsed.data,
            result: {
              ...body.data,
              items: [
                ...existing,
                ...body.data.items.filter((product) => !ids.has(product.id)),
              ],
            },
          };
        });
        if (push) {
          const urlParams = new URLSearchParams(params);
          if (brand) {
            urlParams.delete("brands");
            urlParams.delete("brandSlug");
          }
          if (selectedCategory) urlParams.delete("category");
          window.history.pushState(
            null,
            "",
            `${basePath}${urlParams.size ? `?${urlParams}` : ""}`,
          );
        }
      } catch {
        if (!controller.signal.aborted) {
          setRequestError("دریافت محصولات انجام نشد؛ دوباره تلاش کنید.");
        }
      } finally {
        if (!controller.signal.aborted) {
          request.current = null;
          setPending(false);
        }
      }
    },
    [
      propsKey,
      initialResult.limit,
      selectedCategory,
      basePath,
      brand,
      loadProducts,
    ],
  );
  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      params.delete("page");
      if (!params.has("limit"))
        params.set("limit", String(initialResult.limit));
      void load(params, false);
    };
    window.addEventListener("popstate", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      request.current?.abort();
    };
  }, [load, initialResult.limit]);
  const priceCeiling = Math.max(
    brand ? 1000000 : 150000000,
    Math.ceil(options.maxPrice / 1000000) * 1000000,
    query.minPrice ?? 0,
    query.maxPrice ?? 0,
  );
  const initialFilters = {
    ...emptyFilters,
    category: selectedCategory?.id ?? "",
    max: priceCeiling,
  };
  const { theme } = usePreviewTheme();
  const queryKey = JSON.stringify(query);
  const queryFilters: Filters = {
    category: query.category ?? "",
    min: query.minPrice ?? 0,
    max: query.maxPrice ?? priceCeiling,
    inStock: query.inStock ?? false,
    brands: query.brands ?? [],
    energies: query.energies ?? [],
    capacity: query.capacity ?? "all",
    discounted: query.discounted ?? false,
  };
  const [filterState, setFilterState] = useState({
    queryKey,
    filters: queryFilters,
  });
  if (filterState.queryKey !== queryKey) {
    setFilterState({ queryKey, filters: queryFilters });
  }
  const filters =
    filterState.queryKey === queryKey ? filterState.filters : queryFilters;
  const sort = query.sort;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const drawerId = useId();
  const sentinel = useRef<HTMLDivElement>(null);
  const loadMore = useCallback(() => {
    if (request.current || result.page >= result.totalPages) return;
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(result.page + 1));
    params.set("limit", String(result.limit));
    void load(params, false, true);
  }, [load, result.page, result.totalPages, result.limit]);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || pending || requestError || drawerOpen) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "0px 0px 400px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [loadMore, pending, requestError, drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const element = dialog.current;
    const trigger = opener.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    const media = matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (media.matches) setDrawerOpen(false);
    };
    media.addEventListener("change", closeOnDesktop);
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      media.removeEventListener("change", closeOnDesktop);
      trigger?.focus();
    };
  }, [drawerOpen]);

  function navigate(next: Filters, nextSort = sort) {
    const params = new URLSearchParams();
    if (query.brandSlug) params.set("brandSlug", query.brandSlug);
    if (next.category) params.set("category", next.category);
    if (next.min > 0) params.set("minPrice", String(next.min));
    if (next.max !== priceCeiling) params.set("maxPrice", String(next.max));
    if (next.inStock) params.set("inStock", "true");
    for (const brand of next.brands) params.append("brands", brand);
    for (const energy of next.energies) params.append("energies", energy);
    if (next.capacity !== "all") params.set("capacity", next.capacity);
    if (next.discounted) params.set("discounted", "true");
    if (query.q) params.set("q", query.q);
    params.set("sort", nextSort);
    params.set("limit", String(result.limit));
    void load(params);
  }
  function update(next: Filters) {
    const parsed = filterSchema.safeParse(next);
    if (parsed.success) {
      setFilterState({ queryKey, filters: parsed.data });
      navigate(parsed.data);
    }
  }
  function reset() {
    setFilterState({ queryKey, filters: initialFilters });
    void load(new URLSearchParams());
  }
  const visible = result.items;
  const activeCount =
    Number(Boolean(!brand && query.brandSlug)) +
    Number(query.minPrice !== undefined || query.maxPrice !== undefined) +
    Number(Boolean(query.inStock)) +
    (query.brands?.length ?? 0) +
    (query.energies?.length ?? 0) +
    Number(Boolean(query.capacity && query.capacity !== "all")) +
    Number(Boolean(query.discounted));
  const hasFilters =
    activeCount > 0 ||
    Boolean(!selectedCategory && query.category) ||
    Boolean(query.q);
  const controls = {
    filters,
    update,
    reset,
    priceCeiling,
    hideBrands: Boolean(brand),
    brands: [...new Set([...options.brands, ...(query.brands ?? [])])],
    energies: [...new Set([...options.energies, ...(query.energies ?? [])])],
  };

  return (
    <div
      className={`${themeStyles.theme} ${styles.page}`}
      data-theme={brand ? "light" : theme}
      data-products-catalog
      data-brand-catalog={brand ? "true" : undefined}
    >
      <main className={styles.shell}>
        <nav aria-label="مسیر صفحه" className={styles.breadcrumb}>
          <Link href="/">خانه</Link>
          <ChevronLeft size={14} />
          {brand && (
            <>
              <Link href="/brands">برندها</Link>
              <ChevronLeft size={14} />
            </>
          )}
          {selectedCategory && (
            <>
              <Link href="/products">محصولات</Link>
              <ChevronLeft size={14} />
            </>
          )}
          <span aria-current="page">
            {brand?.name ?? selectedCategory?.name ?? "محصولات"}
          </span>
        </nav>
        {brand ? (
          <BrandHero brand={brand} />
        ) : (
          <section className={styles.intro} aria-labelledby="products-title">
            <div>
              <p className={styles.eyebrow}>
                <Snowflake size={16} /> انتخابی برای سال‌های پیش رو
              </p>
              <div className={styles.titleRow}>
                <h1 id="products-title">
                  {selectedCategory?.name ?? "یخچال و فریزر"}
                </h1>
                <span>{toPersianDigits(result.total)} محصول</span>
              </div>
              <p className={styles.subtitle}>
                {selectedCategory?.description ??
                  "تازگی بیشتر، آرامش بیشتر. همراه مناسب آشپزخانه‌تان را پیدا کنید."}
              </p>
            </div>
            <Snowflake className={styles.iceMark} aria-hidden="true" />
          </section>
        )}
        {!selectedCategory && (
          <div
            className={styles.categories}
            role="group"
            aria-label="دسته‌بندی محصولات"
          >
            {[{ id: "", name: "همه", slug: "" }, ...categories].map(
              (category) => (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={
                    query.category === category.id ||
                    (!query.category && !category.id)
                  }
                  onClick={() => update({ ...filters, category: category.id })}
                >
                  {category.name}
                </button>
              ),
            )}
          </div>
        )}
        {(requestError || error) && (
          <p role="alert" className={styles.activeFilters}>
            {requestError || error}
          </p>
        )}
        <div className={styles.layout}>
          <aside className={styles.sidebar} aria-label="فیلتر محصولات">
            <FilterControls {...controls} />
          </aside>
          <div
            className={styles.results}
            ref={results}
            tabIndex={-1}
            aria-busy={pending}
          >
            <div className={styles.toolbar}>
              <button
                className={styles.mobileFilters}
                ref={opener}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={drawerOpen}
                aria-controls={drawerId}
                onClick={() => setDrawerOpen(true)}
              >
                <SlidersHorizontal size={16} /> فیلترها{" "}
                {activeCount > 0 && <span>{toPersianDigits(activeCount)}</span>}
              </button>
              <label className={styles.sort}>
                مرتب‌سازی
                <select
                  aria-label="مرتب‌سازی محصولات"
                  value={sort}
                  onChange={(event) => {
                    const parsed = z.enum(sorts).safeParse(event.target.value);
                    if (parsed.success) {
                      navigate(filters, parsed.data);
                    }
                  }}
                >
                  {sorts.map((value, index) => (
                    <option key={value} value={value}>
                      {sortLabels[index]}
                    </option>
                  ))}
                </select>
              </label>
              <p role="status" aria-live="polite" data-result-count>
                {pending
                  ? "در حال به‌روزرسانی…"
                  : `${toPersianDigits(result.total)} محصول`}
                {visible.length > 0 &&
                  ` · نمایش ${toPersianDigits(visible.length)} محصول`}
              </p>
            </div>
            {hasFilters && (
              <div className={styles.activeFilters}>
                <span>فیلترهای انتخاب‌شده اعمال شدند</span>
                <button type="button" onClick={reset}>
                  <X size={14} /> پاک کردن فیلترها
                </button>
              </div>
            )}
            {visible.length ? (
              <div className={styles.grid} data-product-grid>
                {visible.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <Snowflake size={44} />
                <h2>محصولی با این مشخصات پیدا نشد</h2>
                <p>محدوده قیمت یا فیلترهای انتخابی را تغییر دهید.</p>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={reset}
                >
                  پاک کردن فیلترها
                </button>
              </div>
            )}
            {visible.length > 0 && (
              <div
                ref={sentinel}
                className={styles.loadMore}
                data-catalog-load-more
              >
                {result.page < result.totalPages ? (
                  <button
                    type="button"
                    className={styles.primary}
                    disabled={pending}
                    onClick={loadMore}
                  >
                    {pending
                      ? "در حال دریافت محصولات…"
                      : requestError
                        ? "تلاش دوباره"
                        : "نمایش محصولات بیشتر"}
                  </button>
                ) : (
                  <p role="status">همهٔ محصولات نمایش داده شدند</p>
                )}
              </div>
            )}
          </div>
        </div>
        {brand && <BrandAbout brand={brand} />}
      </main>
      <dialog
        ref={dialog}
        id={drawerId}
        className={styles.drawer}
        aria-labelledby={`${drawerId}-title`}
        onCancel={(event) => {
          event.preventDefault();
          setDrawerOpen(false);
        }}
        onClose={() => setDrawerOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < rect.x ||
              event.clientX > rect.right ||
              event.clientY < rect.y ||
              event.clientY > rect.bottom
            )
              setDrawerOpen(false);
          }
        }}
      >
        <div className={styles.drawerHeading}>
          <h2 id={`${drawerId}-title`}>فیلتر محصولات</h2>
          <button
            type="button"
            aria-label="بستن فیلترها"
            onClick={() => setDrawerOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className={styles.drawerContent}>
          <FilterControls {...controls} />
        </div>
        <div className={styles.drawerFooter}>
          <button
            type="button"
            className={styles.primary}
            onClick={() => setDrawerOpen(false)}
          >
            اعمال فیلترها
          </button>
        </div>
      </dialog>
    </div>
  );
}
