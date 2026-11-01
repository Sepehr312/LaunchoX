import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/category";
import { Product } from "@/models/product";
import {
  catalogCategories,
  splitRefrigeratorCategory,
} from "./catalog-categories";
import { syncCatalogCategories } from "./sync-catalog-categories";

async function main() {
  const flags = z.array(z.literal("--apply")).parse(process.argv.slice(2));
  await connectDB();
  const [categories, products] = await Promise.all([
    Category.find().lean(),
    Product.find().sort({ _id: 1 }).lean(),
  ]);
  const combined = categories.find(
    (category) => category.slug === "home-kitchen",
  );
  console.log(
    JSON.stringify(
      {
        mode: flags.includes("--apply") ? "apply" : "dry-run",
        categories: catalogCategories,
        moves: products
          .filter(
            (product) => String(product.category) === String(combined?._id),
          )
          .map((product) => ({
            slug: product.slug,
            target: splitRefrigeratorCategory(product.title),
          })),
      },
      null,
      2,
    ),
  );
  if (!flags.includes("--apply")) return;
  const backup = join(
    await mkdtemp(join(tmpdir(), "launchox-categories-")),
    "before.json",
  );
  await writeFile(
    backup,
    JSON.stringify(
      { database: mongoose.connection.name, categories, products },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log(`Category backup: ${backup}`);
  console.log(JSON.stringify(await syncCatalogCategories()));
  const after = await Product.find().sort({ _id: 1 }).lean();
  const unchangedFields = (records: object[]) =>
    JSON.stringify(
      records.map((record) =>
        Object.fromEntries(
          Object.entries(record).filter(([key]) => key !== "category"),
        ),
      ),
    );
  if (unchangedFields(products) !== unchangedFields(after)) {
    throw new Error("Unexpected product changes after category migration");
  }
  console.log(
    "Verified: product count and all fields except category are unchanged",
  );
}

main()
  .catch(() => {
    console.error("Category migration failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
