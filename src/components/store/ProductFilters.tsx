import type { CategoryDTO } from "@/types/dto";

export function ProductFilters({
  categories,
  values,
  includeSearch = false,
}: {
  categories: CategoryDTO[];
  values: Record<string, string | string[] | undefined>;
  includeSearch?: boolean;
}) {
  const value = (key: string) =>
    typeof values[key] === "string" ? values[key] : "";
  return (
    <form className="filter-panel" method="get">
      <div className="filter-panel-title">
        <strong>فیلتر محصولات</strong>
        <span>انتخاب دقیق‌تر</span>
      </div>
      {includeSearch && (
        <label>
          <span>عبارت جستجو</span>
          <input
            type="search"
            name="q"
            defaultValue={value("q")}
            placeholder="نام یا مشخصات محصول"
          />
        </label>
      )}
      <label>
        <span>دسته‌بندی</span>
        <select name="category" defaultValue={value("category")}>
          <option value="">همه دسته‌ها</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span>حداقل قیمت</span>
          <input
            name="minPrice"
            inputMode="numeric"
            defaultValue={value("minPrice")}
            placeholder="تومان"
          />
        </label>
        <label>
          <span>حداکثر قیمت</span>
          <input
            name="maxPrice"
            inputMode="numeric"
            defaultValue={value("maxPrice")}
            placeholder="تومان"
          />
        </label>
      </div>
      <label>
        <span>مرتب‌سازی</span>
        <select name="sort" defaultValue={value("sort") || "newest"}>
          <option value="newest">جدیدترین</option>
          <option value="price_asc">کمترین قیمت</option>
          <option value="price_desc">بیشترین قیمت</option>
          <option value="bestselling">پرفروش‌ترین</option>
        </select>
      </label>
      <label className="filter-check">
        <input
          type="checkbox"
          name="inStock"
          value="true"
          defaultChecked={value("inStock") === "true"}
        />
        <span>فقط کالاهای موجود</span>
      </label>
      <button type="submit">اعمال فیلترها</button>
    </form>
  );
}
