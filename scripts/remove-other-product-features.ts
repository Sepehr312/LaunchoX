import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/product";
import { isOtherFeaturesAttribute } from "@/validations/product-attributes";

async function main() {
  const apply = z
    .array(z.literal("--apply"))
    .parse(process.argv.slice(2))
    .includes("--apply");
  await connectDB();
  const before = await Product.find().sort({ _id: 1 }).lean();
  const plan = before
    .map((product) => ({
      product,
      attributes: product.attributes.filter(
        (attribute) => !isOtherFeaturesAttribute(attribute.key),
      ),
    }))
    .filter(
      (item) => item.attributes.length !== item.product.attributes.length,
    );
  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        database: mongoose.connection.name,
        totalProducts: before.length,
        affectedProducts: plan.length,
        removedRows: plan.reduce(
          (count, item) =>
            count + item.product.attributes.length - item.attributes.length,
          0,
        ),
      },
      null,
      2,
    ),
  );
  if (!apply || !plan.length) return;
  const folder = resolve("tmp/product-features");
  await mkdir(folder, { recursive: true });
  await writeFile(
    resolve(
      folder,
      `before-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    ),
    JSON.stringify(
      { database: mongoose.connection.name, products: before },
      null,
      2,
    ),
    { flag: "wx" },
  );
  const result = await Product.bulkWrite(
    plan.map(({ product, attributes }) => ({
      updateOne: {
        filter: { _id: product._id, attributes: product.attributes },
        update: { $set: { attributes } },
        timestamps: false,
      },
    })),
  );
  if (result.matchedCount !== plan.length)
    throw new Error("Concurrent product edit detected; inspect backup");
  const after = await Product.find().sort({ _id: 1 }).lean();
  const expected = before.map((product) => ({
    ...product,
    attributes: product.attributes.filter(
      (attribute) => !isOtherFeaturesAttribute(attribute.key),
    ),
  }));
  if (JSON.stringify(after) !== JSON.stringify(expected))
    throw new Error("Unexpected product changes");
  console.log(
    "Verified: only other-features rows removed; all remaining specifications, stock and prices preserved.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Feature cleanup failed",
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
