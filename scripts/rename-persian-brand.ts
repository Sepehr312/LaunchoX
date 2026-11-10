import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Brand } from "@/models/brand";
import { Category } from "@/models/category";
import { ManagedContent } from "@/models/managed-content";
import PageContent from "@/models/page-content";
import { Product } from "@/models/product";

const previousName =
  /لانچ[\s\u200c\u200d-]*(?:اوکس|وکس|ایکس|و[\s\u200c\u200d-]+ایکس)/g;
const currentName = "لانچو ایکس";

function changesIn(
  value: unknown,
  path: string,
  changes: Record<string, string>,
  originals: Record<string, string>,
) {
  if (typeof value === "string") {
    const updated = value.replace(previousName, currentName);
    if (updated !== value) {
      changes[path] = updated;
      originals[path] = value;
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item: unknown, index) =>
      changesIn(item, `${path}.${index}`, changes, originals),
    );
  } else if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    for (const [key, item] of Object.entries(value)) {
      // Asset references and identifiers are not display text.
      if (/image(?!Alt)|url|href|slug|^_?id$|logo/i.test(key)) continue;
      if (key.includes(".") || key.startsWith("$"))
        throw new Error("Unsupported content key");
      changesIn(item, `${path}.${key}`, changes, originals);
    }
  }
}

async function main() {
  const apply = z
    .array(z.literal("--apply"))
    .parse(process.argv.slice(2))
    .includes("--apply");
  await connectDB();
  const database = mongoose.connection.db;
  if (!database) throw new Error("Database unavailable");
  const sources = [
    {
      collection: Product.collection.collectionName,
      fields: ["title", "description", "attributes"],
    },
    {
      collection: Category.collection.collectionName,
      fields: ["name", "description"],
    },
    {
      collection: Brand.collection.collectionName,
      fields: ["name", "description"],
    },
    { collection: ManagedContent.collection.collectionName, fields: ["data"] },
    {
      collection: PageContent.collection.collectionName,
      fields: ["title", "content", "sections"],
    },
  ];
  const plan: {
    collection: string;
    id: string;
    changes: Record<string, string>;
    originals: Record<string, string>;
    before: Record<string, unknown>;
  }[] = [];
  for (const source of sources) {
    for await (const document of database
      .collection(source.collection)
      .find()) {
      const changes: Record<string, string> = {};
      const originals: Record<string, string> = {};
      for (const field of source.fields)
        changesIn(document[field], field, changes, originals);
      if (Object.keys(changes).length)
        plan.push({
          collection: source.collection,
          id: String(document._id),
          changes,
          originals,
          before: document,
        });
    }
  }
  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        database: database.databaseName,
        documents: plan.length,
        fields: plan.reduce(
          (count, item) => count + Object.keys(item.changes).length,
          0,
        ),
        collections: sources.map((source) => ({
          name: source.collection,
          documents: plan.filter(
            (item) => item.collection === source.collection,
          ).length,
        })),
      },
      null,
      2,
    ),
  );
  if (!apply || !plan.length) return;
  const folder = resolve("tmp/brand-rename");
  await mkdir(folder, { recursive: true });
  await writeFile(
    resolve(
      folder,
      `before-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    ),
    JSON.stringify({ database: database.databaseName, plan }, null, 2),
    { flag: "wx" },
  );
  for (const item of plan) {
    const result = await database
      .collection(item.collection)
      .updateOne(
        { _id: new mongoose.Types.ObjectId(item.id), ...item.originals },
        { $set: item.changes },
      );
    if (result.matchedCount !== 1)
      throw new Error(
        "Concurrent edit detected; inspect backup before retrying",
      );
    const updated = await database
      .collection(item.collection)
      .findOne({ _id: new mongoose.Types.ObjectId(item.id) });
    const expected = z
      .record(z.string(), z.unknown())
      .parse(JSON.parse(JSON.stringify(item.before)) as unknown);
    for (const [path, value] of Object.entries(item.changes)) {
      const segments = path.split(".");
      let parent: Record<string, unknown> = expected;
      for (const segment of segments.slice(0, -1))
        parent = parent[segment] as Record<string, unknown>;
      parent[segments[segments.length - 1]] = value;
    }
    if (JSON.stringify(updated) !== JSON.stringify(expected))
      throw new Error("Unexpected document change");
  }
  console.log(`Verified renamed display text in ${plan.length} documents.`);
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Brand rename failed",
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
