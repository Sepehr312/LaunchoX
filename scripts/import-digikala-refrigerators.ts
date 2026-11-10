import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Brand } from "@/models/brand";
import { Category } from "@/models/category";
import { Product } from "@/models/product";
import { createBrand } from "@/services/brand.service";
import { createProduct } from "@/services/product.service";
import { isBrandAttribute } from "@/validations/brand-text";
import { adminProductSchema } from "@/validations/product";

const folder = resolve("tmp/digikala-refrigerators");
const snapshotPath = resolve(folder, "catalog.json");
const text = z.string().trim().min(1);
const image = z.object({ url: z.array(z.url()).min(1) });
const attribute = z.object({ title: text, values: z.array(z.string()) });
const sourceProductSchema = z.object({
  id: z.number().int().positive(),
  title_fa: text.max(150),
  category: z.object({ code: z.literal("refrigerator-freezer") }),
  brand: z.object({
    id: z.number().int().positive(),
    code: text,
    title_fa: text,
  }),
  images: z.object({ main: image, list: z.array(image).default([]) }),
  default_variant: z.object({
    price: z.object({ selling_price: z.number().int().positive() }),
  }),
  specifications: z.array(
    z.object({ title: text, attributes: z.array(attribute) }),
  ),
});
const entrySchema = z.object({
  sourceId: z.number().int().positive(),
  sourceUrl: z.url(),
  collectedAt: z.iso.datetime(),
  brand: z.object({ id: z.number().int().positive(), code: text, name: text }),
  categorySlug: z.enum([
    "twin",
    "digital",
    "clothing",
    "top-freezer",
    "bottom-freezer",
    "books",
    "sports-travel",
    "home-kitchen",
  ]),
  product: z
    .object(adminProductSchema.shape)
    .omit({ category: true, brand: true })
    .extend({ slug: text, sku: text }),
});
type Entry = z.infer<typeof entrySchema>;
const snapshotSchema = z.object({
  entries: z.array(entrySchema).length(200),
  skipped: z.array(z.object({ id: z.number(), reason: z.string() })),
});

function clean(value: string) {
  return value
    .replace(/\u200c/g, " ")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryFor(title: string): Entry["categorySlug"] {
  const value = clean(title);
  if (/دوقلو|دو قلو/.test(value)) return "twin";
  if (/فرنچ|درب فرانسوی|چهار درب/.test(value)) return "clothing";
  if (/ساید/.test(value)) return "digital";
  if (/فریزر بالا/.test(value)) return "top-freezer";
  if (/فریزر پایین/.test(value)) return "bottom-freezer";
  if (
    /هتلی|مینی|کوچک/.test(value) ||
    (!/فریزر/.test(value) && /یخچال/.test(value))
  )
    return "books";
  if (/فروشگاهی|ویترینی|ایستاده صنعتی/.test(value)) return "sports-travel";
  return "home-kitchen";
}

async function fetchJson(path: string): Promise<unknown> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`https://api.digikala.com${path}`, {
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((done) => setTimeout(done, 1000 * (attempt + 1)));
    }
  }
  throw new Error("Source request failed");
}

function normalize(raw: unknown): Entry {
  const source = sourceProductSchema.parse(raw);
  const sourceUrl = `https://www.digikala.com/product/dkp-${source.id}/`;
  const attributes = source.specifications.flatMap((section) =>
    section.attributes.flatMap((item) => {
      const value = item.values.map(clean).filter(Boolean).join("، ");
      return value && !isBrandAttribute(item.title)
        ? [{ key: clean(item.title), value }]
        : [];
    }),
  );
  const capacity = attributes.find(
    (item) => item.key === "گنجایش کل به لیتر",
  )?.value;
  const energy = attributes.find((item) => item.key === "گرید انرژی")?.value;
  const type = attributes.find((item) => item.key === "نوع یخچال فریزر")?.value;
  if (capacity) attributes.push({ key: "ظرفیت", value: `${capacity} لیتر` });
  if (energy) attributes.push({ key: "رده انرژی", value: energy });
  if (type) attributes.push({ key: "نوع محصول", value: type });
  const collectedAt = new Date().toISOString();
  attributes.push({ key: "منبع اطلاعات", value: sourceUrl });
  const description = [
    source.title_fa + ".",
    capacity ? `گنجایش کل اعلام شده: ${capacity} لیتر.` : "",
    energy ? `رده مصرف انرژی اعلام شده: ${energy}.` : "",
    "مشخصات فنی از صفحه این مدل در دیجی‌کالا ثبت شده‌اند.",
    "قیمت، قیمت مشاهده شده در منبع هنگام ثبت اطلاعات است. موجودی و شرایط فروش لانچ‌اوکس باید جداگانه تأیید شوند.",
  ]
    .filter(Boolean)
    .join("\n");
  // Digikala API amounts are rials; reject fractional tomans rather than rounding.
  const price = z
    .number()
    .int()
    .positive()
    .parse(source.default_variant.price.selling_price / 10);
  const images = [
    ...new Set(
      [source.images.main, ...source.images.list].map((item) => item.url[0]),
    ),
  ].slice(0, 8);
  if (
    images.some(
      (url) => new URL(url).hostname !== "dkstatics-public.digikala.com",
    )
  )
    throw new Error("Unexpected image host");
  return entrySchema.parse({
    sourceId: source.id,
    sourceUrl,
    collectedAt,
    brand: {
      id: source.brand.id,
      code: source.brand.code,
      name: source.brand.title_fa,
    },
    categorySlug: categoryFor(`${source.title_fa} ${type ?? ""}`),
    product: {
      title: source.title_fa,
      slug: `digikala-${source.id}`,
      sku: `DKP-${source.id}`,
      description,
      price,
      stock: 0,
      images,
      attributes,
      isActive: true,
      isFeatured: false,
    },
  });
}

async function collect() {
  await mkdir(resolve(folder, "source"), { recursive: true });
  const candidates = new Map<number, { id: number; title_fa: string }>();
  const listingSchema = z.object({
    data: z.object({
      products: z.array(
        z.object({ id: z.number().int().positive(), title_fa: text }),
      ),
    }),
  });
  const searches = [
    "دوقلو",
    "ساید",
    "فریزر پایین",
    "فریزر بالا",
    "هتلی",
    "فرنچ",
    "مینی",
    "کمبی",
  ];
  for (const query of searches) {
    for (let page = 1; page <= 3; page++) {
      const path = `/v1/categories/refrigerator-freezer/search/?q=${encodeURIComponent(query)}&page=${page}`;
      const raw = await fetchJson(path);
      const listing = listingSchema.parse(raw);
      await writeFile(
        resolve(
          folder,
          "source",
          `listing-${searches.indexOf(query)}-${page}.json`,
        ),
        JSON.stringify(raw),
      );
      for (const item of listing.data.products) candidates.set(item.id, item);
    }
    console.log(
      `Listing collected: ${query}; unique candidates: ${candidates.size}`,
    );
  }
  const groups = new Map<string, { id: number; title_fa: string }[]>();
  for (const item of candidates.values()) {
    const key = categoryFor(item.title_fa);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  // Round robin prevents one popular refrigerator type from consuming the import.
  const ordered: { id: number; title_fa: string }[] = [];
  while ([...groups.values()].some((items) => items.length)) {
    for (const items of groups.values()) {
      const next = items.shift();
      if (next) ordered.push(next);
    }
  }
  const entries: Entry[] = [];
  const skipped: { id: number; reason: string }[] = [];
  for (const candidate of ordered) {
    if (entries.length === 200) break;
    try {
      const raw = await fetchJson(`/v2/product/${candidate.id}/`);
      await writeFile(
        resolve(folder, "source", `dkp-${candidate.id}.json`),
        JSON.stringify(raw),
      );
      const detail = z
        .object({ data: z.object({ product: z.unknown() }) })
        .parse(raw);
      const entry = normalize(detail.data.product);
      if (entry.sourceId !== candidate.id)
        throw new Error("Source identity mismatch");
      entries.push(entry);
      if (entries.length % 20 === 0)
        console.log(`Validated product details: ${entries.length}/200`);
    } catch (error) {
      skipped.push({
        id: candidate.id,
        reason:
          error instanceof z.ZodError
            ? error.issues.map((issue) => issue.path.join(".")).join(", ")
            : error instanceof Error
              ? error.message
              : "Unknown source error",
      });
    }
  }
  const snapshot = snapshotSchema.parse({ entries, skipped });
  await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log(
    JSON.stringify(
      {
        snapshotPath,
        count: entries.length,
        skipped: skipped.length,
        categories: counts(entries.map((entry) => entry.categorySlug)),
        brands: counts(entries.map((entry) => entry.brand.name)),
      },
      null,
      2,
    ),
  );
}

function counts(values: string[]) {
  return values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}

async function importCatalog(apply: boolean) {
  const snapshot = snapshotSchema.parse(
    JSON.parse(await readFile(snapshotPath, "utf8")) as unknown,
  );
  await connectDB();
  const [categories, brands, products] = await Promise.all([
    Category.find().lean(),
    Brand.find().lean(),
    Product.find().lean(),
  ]);
  const categoryIds = new Map(
    categories
      .filter((item) => item.isActive)
      .map((item) => [item.slug, String(item._id)]),
  );
  for (const entry of snapshot.entries) {
    if (!categoryIds.has(entry.categorySlug))
      throw new Error(`Missing active category: ${entry.categorySlug}`);
    adminProductSchema.parse({
      ...entry.product,
      category: categoryIds.get(entry.categorySlug),
      brand: "000000000000000000000000",
    });
    const existing = products.find(
      (item) =>
        item.sku === entry.product.sku || item.slug === entry.product.slug,
    );
    if (
      existing &&
      (existing.sku !== entry.product.sku ||
        existing.slug !== entry.product.slug)
    )
      throw new Error(`Product identity collision: ${entry.sourceId}`);
  }
  const pending = snapshot.entries.filter(
    (entry) => !products.some((item) => item.sku === entry.product.sku),
  );
  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        database: mongoose.connection.name,
        existingProducts: products.length,
        newProducts: pending.length,
        skippedExisting: snapshot.entries.length - pending.length,
        stock: 0,
        categories: counts(pending.map((item) => item.categorySlug)),
      },
      null,
      2,
    ),
  );
  if (!apply) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await writeFile(
    resolve(folder, `before-${stamp}.json`),
    JSON.stringify(
      { database: mongoose.connection.name, categories, brands, products },
      null,
      2,
    ),
    { flag: "wx" },
  );
  const brandIds = new Map(
    brands.map((brand) => [
      clean(brand.name).replace(/\s/g, ""),
      String(brand._id),
    ]),
  );
  const imported: { id: string; sourceId: number }[] = [];
  for (const entry of pending) {
    const key = clean(entry.brand.name).replace(/\s/g, "");
    let brandId = brandIds.get(key);
    if (!brandId) {
      const brand = await createBrand({
        name: entry.brand.name,
        slug: `digikala-brand-${entry.brand.id}`,
        isActive: true,
      });
      brandId = brand.id;
      brandIds.set(key, brandId);
    }
    const input = adminProductSchema.parse({
      ...entry.product,
      brand: brandId,
      category: categoryIds.get(entry.categorySlug),
    });
    const product = await createProduct(input);
    imported.push({ id: product.id, sourceId: entry.sourceId });
    await writeFile(
      resolve(folder, `imported-${stamp}.json`),
      JSON.stringify(imported, null, 2),
    );
    if (imported.length % 20 === 0)
      console.log(`Products imported: ${imported.length}/${pending.length}`);
  }
  const after = await Product.find({
    sku: { $in: snapshot.entries.map((entry) => entry.product.sku) },
  }).lean();
  if (
    after.length !== 200 ||
    after.some(
      (product) => product.stock !== 0 || !product.isActive || !product.brand,
    )
  )
    throw new Error("Imported catalog verification failed");
  for (const before of products) {
    const unchanged = await Product.findById(before._id).lean();
    if (JSON.stringify(before) !== JSON.stringify(unchanged))
      throw new Error("Existing product changed unexpectedly");
  }
  console.log(
    `Verified ${after.length} imported products; existing products unchanged.`,
  );
}

async function main() {
  const flags = z
    .array(z.enum(["--collect", "--apply"]))
    .parse(process.argv.slice(2));
  if (flags.includes("--collect") && flags.includes("--apply"))
    throw new Error("Collect and apply must run separately");
  if (flags.includes("--collect")) await collect();
  else await importCatalog(flags.includes("--apply"));
}

main()
  .catch((error: unknown) => {
    console.error(
      "Digikala import failed:",
      error instanceof z.ZodError
        ? error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          }))
        : error instanceof Error
          ? error.message
          : "Unknown error",
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
