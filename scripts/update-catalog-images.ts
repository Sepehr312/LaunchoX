import { createHash } from "node:crypto";
import { access, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/category";
import { Product } from "@/models/product";
import {
  getCatalogCategoryImage,
  getCatalogProductImage,
} from "./catalog-images";

function fingerprint(records: object[], imageField: string) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        records.map((record) =>
          Object.fromEntries(
            Object.entries(record).filter(([key]) => key !== imageField),
          ),
        ),
      ),
    )
    .digest("hex");
}

async function main() {
  const flags = process.argv.slice(2);
  if (flags.some((flag) => flag !== "--apply"))
    throw new Error("Only --apply is supported");
  await connectDB();
  const [categories, products] = await Promise.all([
    Category.find().sort({ _id: 1 }).lean(),
    Product.find().sort({ _id: 1 }).lean(),
  ]);
  const categoryMap = new Map(
    categories.map((category) => [String(category._id), category]),
  );
  const productPlan = products
    .map((product) => {
      const category = categoryMap.get(String(product.category));
      const target =
        category && getCatalogProductImage(category.slug, product.title);
      if (!target)
        throw new Error(`No image mapping for product ${product.slug}`);
      const images = [
        ...new Set(
          product.images.map((image, index) =>
            index === 0 || image.startsWith("/images/products/")
              ? target
              : image,
          ),
        ),
      ];
      return { product, images };
    })
    .filter(
      ({ product, images }) =>
        JSON.stringify(product.images) !== JSON.stringify(images),
    );
  const categoryPlan = categories.flatMap((category) => {
    const image = getCatalogCategoryImage(category.slug);
    return image && image !== category.image ? [{ category, image }] : [];
  });
  const targets = new Set([
    ...productPlan.flatMap((item) => item.images),
    ...categoryPlan.map((item) => item.image),
  ]);
  for (const target of targets) {
    if (target.startsWith("/images/preview/categories/"))
      await access(join(process.cwd(), "public", target));
  }
  console.log(
    JSON.stringify(
      {
        mode: flags.includes("--apply") ? "apply" : "dry-run",
        products: productPlan.map(({ product, images }) => ({
          slug: product.slug,
          images,
        })),
        categories: categoryPlan.map(({ category, image }) => ({
          slug: category.slug,
          image,
        })),
      },
      null,
      2,
    ),
  );
  if (!flags.includes("--apply")) return;
  if (!productPlan.length && !categoryPlan.length) {
    console.log("Catalog images are already up to date");
    return;
  }
  const backupPath = join(
    await mkdtemp(join(tmpdir(), "launchox-catalog-images-")),
    "before.json",
  );
  await writeFile(
    backupPath,
    JSON.stringify(
      { database: mongoose.connection.name, categories, products },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log(`Image backup: ${backupPath}`);
  if (productPlan.length) {
    const result = await Product.collection.bulkWrite(
      productPlan.map(({ product, images }) => ({
        updateOne: {
          filter: { _id: product._id, images: product.images },
          update: { $set: { images } },
        },
      })),
    );
    if (result.matchedCount !== productPlan.length)
      throw new Error(
        "Product images changed concurrently; inspect the backup before retrying",
      );
  }
  if (categoryPlan.length) {
    const result = await Category.collection.bulkWrite(
      categoryPlan.map(({ category, image }) => ({
        updateOne: {
          filter: { _id: category._id, image: category.image },
          update: { $set: { image } },
        },
      })),
    );
    if (result.matchedCount !== categoryPlan.length)
      throw new Error(
        "Category images changed concurrently; inspect the backup before retrying",
      );
  }
  const [afterCategories, afterProducts] = await Promise.all([
    Category.find().sort({ _id: 1 }).lean(),
    Product.find().sort({ _id: 1 }).lean(),
  ]);
  if (
    fingerprint(categories, "image") !==
      fingerprint(afterCategories, "image") ||
    fingerprint(products, "images") !== fingerprint(afterProducts, "images")
  )
    throw new Error("Non-image catalog data changed during the update");
  const productImages = new Map(
    afterProducts.map((product) => [String(product._id), product.images]),
  );
  const categoryImages = new Map(
    afterCategories.map((category) => [String(category._id), category.image]),
  );
  if (
    productPlan.some(
      ({ product, images }) =>
        JSON.stringify(productImages.get(String(product._id))) !==
        JSON.stringify(images),
    ) ||
    categoryPlan.some(
      ({ category, image }) =>
        categoryImages.get(String(category._id)) !== image,
    )
  )
    throw new Error("Catalog image verification failed");
  console.log(
    `Verified ${productPlan.length} product and ${categoryPlan.length} category image updates; all other catalog fields are unchanged`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Catalog image update failed",
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
