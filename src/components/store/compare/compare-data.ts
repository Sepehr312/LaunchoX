import { normalizeDigits, toPersianDigits } from "@/lib/format";
import type { CompareProductDTO } from "@/types/dto";

const definitions = [
  {
    title: "مشخصات کلی",
    rows: [
      ["برند"],
      ["مدل"],
      ["نوع محصول", "نوع یخچال", "نوع"],
      ["رنگ"],
      ["کشور سازنده"],
    ],
  },
  {
    title: "ظرفیت و گنجایش",
    rows: [
      ["ظرفیت کل", "ظرفیت", "گنجایش کل"],
      ["ظرفیت یخچال", "گنجایش یخچال"],
      ["ظرفیت فریزر", "گنجایش فریزر"],
      ["تعداد طبقات", "تعداد طبقات یخچال"],
      ["تعداد کشوها"],
    ],
  },
  {
    title: "ابعاد و وزن",
    rows: [["ابعاد"], ["ارتفاع"], ["عرض"], ["عمق"], ["وزن"]],
  },
  {
    title: "مصرف انرژی",
    rows: [
      ["رده مصرف انرژی", "رده انرژی", "رتبه انرژی"],
      ["میزان مصرف برق", "مصرف برق"],
      ["نوع کمپرسور", "کمپرسور"],
    ],
  },
  {
    title: "سیستم سرمایش",
    rows: [
      ["سیستم سرمایش"],
      ["سیستم بدون برفک", "بدون برفک"],
      ["سیستم گردش هوا", "گردش هوا"],
      ["سرمایش سریع"],
      ["انجماد سریع"],
    ],
  },
  {
    title: "امکانات و ویژگی‌ها",
    rows: [
      ["آب‌سردکن", "آبسردکن"],
      ["یخ‌ساز", "یخساز"],
      ["نمایشگر دیجیتال"],
      ["قفل کودک"],
      ["کنترل دما"],
    ],
  },
  {
    title: "گارانتی و خدمات",
    rows: [["گارانتی", "ضمانت"], ["مدت ضمانت"], ["خدمات پس از فروش"]],
  },
];

function clean(value: string) {
  return normalizeDigits(value)
    .normalize("NFKC")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\s]+/g, " ")
    .trim()
    .toLowerCase();
}

export function getCompareAttribute(
  product: CompareProductDTO,
  ...keys: string[]
) {
  return (
    product.attributes
      .find((attribute) =>
        keys.some((key) => clean(key) === clean(attribute.key)),
      )
      ?.value.trim() || undefined
  );
}

// Convert only recognized quantities; unknown units stay explicit text, never zero.
export function normalizeCompareValue(value: string | undefined): string {
  if (!value?.trim()) return "missing";
  const text = clean(value).replace(/[٬,]/g, "").replace(/٫/g, ".");
  if (["دارد", "بله", "true"].includes(text)) return "boolean:true";
  if (["ندارد", "خیر", "false"].includes(text)) return "boolean:false";
  const match = text.match(/^([0-9]+(?:\.[0-9]+)?)\s*(.*)$/);
  if (match) {
    const units: Record<string, [string, number]> = {
      لیتر: ["volume", 1],
      l: ["volume", 1],
      "میلی لیتر": ["volume", 0.001],
      ml: ["volume", 0.001],
      "سانتی متر": ["length", 1],
      cm: ["length", 1],
      "میلی متر": ["length", 0.1],
      mm: ["length", 0.1],
      متر: ["length", 100],
      m: ["length", 100],
      کیلوگرم: ["weight", 1],
      kg: ["weight", 1],
      گرم: ["weight", 0.001],
      g: ["weight", 0.001],
      ماه: ["duration", 1],
      سال: ["duration", 12],
    };
    const unit = units[match[2]];
    if (unit)
      return `${unit[0]}:${Number((Number(match[1]) * unit[1]).toFixed(6))}`;
    if (!match[2]) return `number:${Number(match[1])}`;
  }
  return `text:${text}`;
}

export function displayCompareValue(value: string | undefined) {
  const normalized = normalizeCompareValue(value);
  if (normalized === "missing") return "ثبت نشده";
  if (normalized === "boolean:true") return "دارد";
  if (normalized === "boolean:false") return "ندارد";
  return toPersianDigits(value!);
}

export function compareValuesDiffer(values: (string | undefined)[]) {
  return (
    values.length > 1 && new Set(values.map(normalizeCompareValue)).size > 1
  );
}

export function buildCompareGroups(products: CompareProductDTO[]) {
  const knownKeys = definitions.flatMap((group) => group.rows.flat());
  const extraKeys = [
    ...new Set(
      products.flatMap((product) =>
        product.attributes.map((attribute) => attribute.key),
      ),
    ),
  ].filter((key) => !knownKeys.some((known) => clean(known) === clean(key)));
  return [
    ...definitions,
    { title: "سایر مشخصات", rows: extraKeys.map((key) => [key]) },
  ]
    .map((group) => ({
      title: group.title,
      rows: group.rows.map((keys) => ({
        label: keys[0],
        values: products.map((product) =>
          getCompareAttribute(product, ...keys),
        ),
      })),
    }))
    .filter((group) => group.rows.length > 0);
}
