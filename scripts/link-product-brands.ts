import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mongoose from "mongoose";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { connectDB } from "@/lib/db";
import { createUniqueSlug } from "@/lib/slug";
import { Brand } from "@/models/brand";
import { Product } from "@/models/product";
import { createBrandSchema } from "@/validations/brand";

async function main() {
  const flags = z.array(z.literal("--apply")).parse(process.argv.slice(2));
  const env = getEnv();
  if (
    env.NODE_ENV === "production" ||
    !/^mongodb:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//.test(env.MONGODB_URI)
  )
    throw new Error("Brand test data requires a local non-production database");
  await connectDB();
  const [products, brands] = await Promise.all([
    Product.find().sort({ _id: 1 }).lean(),
    Brand.find().lean(),
  ]);
  const candidates = products.filter(
    (product) =>
      !product.brand &&
      product.attributes.some(
        (attribute) => attribute.key === "برند" && attribute.value.trim(),
      ),
  );
  const names = [
    ...new Set(
      candidates.map((product) =>
        product.attributes
          .find((attribute) => attribute.key === "برند")!
          .value.trim(),
      ),
    ),
  ];
  console.log(
    JSON.stringify(
      {
        mode: flags.includes("--apply") ? "apply" : "dry-run",
        products: products.length,
        toLink: candidates.length,
        alreadyLinked: products.filter((product) => product.brand).length,
        withoutBrandAttribute:
          products.length -
          candidates.length -
          products.filter((product) => product.brand).length,
        brandNames: names,
      },
      null,
      2,
    ),
  );
  if (!flags.includes("--apply")) return;
  const backup = join(
    await mkdtemp(join(tmpdir(), "launchox-product-brands-")),
    "before.json",
  );
  await writeFile(
    backup,
    JSON.stringify(
      { database: mongoose.connection.name, products, brands },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log(`Brand test data backup: ${backup}`);
  await Brand.init();
  const ids = new Map(brands.map((brand) => [brand.name, brand._id]));
  let created = 0;
  for (const name of names) {
    if (ids.has(name)) continue;
    const slug = await createUniqueSlug(name, (candidate) =>
      Brand.exists({ slug: candidate }).then(Boolean),
    );
    const brand = await Brand.create(
      createBrandSchema.parse({
        name,
        slug,
        order: ids.size,
        description: `برند نمونهٔ ${name} برای تست فروشگاه`,
      }),
    );
    ids.set(name, brand._id);
    created++;
  }
  let linked = 0;
  for (const product of candidates) {
    const name = product.attributes
      .find((attribute) => attribute.key === "برند")!
      .value.trim();
    const result = await Product.collection.updateOne(
      {
        _id: product._id,
        brand: product.brand ?? null,
        attributes: product.attributes,
      },
      { $set: { brand: ids.get(name) } },
    );
    if (result.matchedCount !== 1)
      throw new Error("Product changed during brand linking");
    linked++;
  }
  const after = await Product.find().sort({ _id: 1 }).lean();
  const unchanged = (records: object[]) =>
    JSON.stringify(
      records.map((record) =>
        Object.fromEntries(
          Object.entries(record).filter(([key]) => key !== "brand"),
        ),
      ),
    );
  if (unchanged(products) !== unchanged(after))
    throw new Error("Unexpected product changes after brand linking");
  for (const product of after) {
    if (!candidates.some((candidate) => candidate._id.equals(product._id)))
      continue;
    const name = product.attributes
      .find((attribute) => attribute.key === "برند")!
      .value.trim();
    if (!product.brand?.equals(ids.get(name)))
      throw new Error("Brand link verification failed");
  }
  console.log(
    JSON.stringify({
      createdBrands: created,
      linkedProducts: linked,
      verified: true,
    }),
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      "Brand test data failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
