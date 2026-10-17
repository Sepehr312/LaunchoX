import {
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  Snowflake,
  Ruler,
  ShieldCheck,
  Zap,
  Refrigerator,
  Layers,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import type { CompareProductDTO } from "@/types/dto";
import {
  buildCompareGroups,
  compareValuesDiffer,
  displayCompareValue,
  getCompareAttribute,
} from "./compare-data";
import styles from "./compare.module.css";

const icons = [
  Refrigerator,
  Layers,
  Ruler,
  Zap,
  Snowflake,
  SlidersHorizontal,
  ShieldCheck,
];

function ValueRow({
  label,
  values,
  products,
  emptySlot,
  highlight = false,
}: {
  label: string;
  values: (string | undefined)[];
  products: CompareProductDTO[];
  emptySlot: boolean;
  highlight?: boolean;
}) {
  return (
    <tr className={highlight ? styles.different : undefined}>
      <th scope="row">{label}</th>
      {values.map((value, index) => (
        <td key={products[index].id}>
          <bdi>{displayCompareValue(value)}</bdi>
        </td>
      ))}
      {emptySlot && <td aria-hidden="true" />}
    </tr>
  );
}

export function CompareHighlights({
  products,
}: {
  products: CompareProductDTO[];
}) {
  const fields = [
    {
      label: "قیمت",
      values: products.map((product) => formatPrice(product.price)),
    },
    {
      label: "ظرفیت کل",
      values: products.map((product) =>
        getCompareAttribute(product, "ظرفیت کل", "ظرفیت", "گنجایش کل"),
      ),
    },
    {
      label: "رده انرژی",
      values: products.map((product) =>
        getCompareAttribute(
          product,
          "رده انرژی",
          "رتبه انرژی",
          "رده مصرف انرژی",
        ),
      ),
    },
    {
      label: "ابعاد",
      values: products.map(
        (product) =>
          getCompareAttribute(product, "ابعاد") ??
          (() => {
            const dimensions = ["ارتفاع", "عرض", "عمق"].map((key) =>
              getCompareAttribute(product, key),
            );
            return dimensions.every(Boolean)
              ? dimensions.join(" × ")
              : undefined;
          })(),
      ),
    },
    {
      label: "کمپرسور",
      values: products.map((product) =>
        getCompareAttribute(product, "کمپرسور", "نوع کمپرسور"),
      ),
    },
  ];
  return (
    <section className={styles.highlights}>
      <h2>
        <Sparkles size={21} /> تفاوت‌های کلیدی در یک نگاه
      </h2>
      <table className={styles.table}>
        <caption className="sr-only">خلاصهٔ مشخصات محصولات انتخاب شده</caption>
        <tbody>
          {fields.map((field) => (
            <ValueRow
              key={field.label}
              {...field}
              products={products}
              emptySlot={products.length < 4}
              highlight={compareValuesDiffer(field.values)}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function CompareSpecificationsTable({
  products,
  onlyDifferences,
}: {
  products: CompareProductDTO[];
  onlyDifferences: boolean;
}) {
  const groups = buildCompareGroups(products)
    .map((group, index) => ({
      ...group,
      Icon: icons[index] ?? SlidersHorizontal,
      rows: group.rows.filter(
        (row) => !onlyDifferences || compareValuesDiffer(row.values),
      ),
    }))
    .filter((group) => group.rows.length > 0);
  return (
    <section className={styles.specifications}>
      {groups.length === 0 && (
        <p className={styles.noDifference}>
          در مشخصات ثبت‌شده تفاوتی پیدا نشد.
        </p>
      )}
      {groups.map(({ title, rows, Icon }) => (
        <details open key={title} className={styles.group}>
          <summary>
            <span>
              <Icon size={20} />
              {title}
            </span>
            <ChevronDown size={18} />
          </summary>
          <table className={styles.table}>
            <caption className="sr-only">{title}</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">ویژگی</th>
                {products.map((product) => (
                  <th key={product.id} scope="col">
                    {product.title}
                  </th>
                ))}
                {products.length < 4 && <th scope="col">جای محصول بعدی</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ValueRow
                  key={row.label}
                  {...row}
                  products={products}
                  emptySlot={products.length < 4}
                  highlight={compareValuesDiffer(row.values)}
                />
              ))}
            </tbody>
          </table>
        </details>
      ))}
    </section>
  );
}
