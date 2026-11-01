import "server-only";
import { type mongo, Types } from "mongoose";
import { z } from "zod";
import { isBrandAttribute, normalizeBrandText } from "@/validations/brand-text";

export const brandMigrationOptionsSchema = z.object({
  apply: z.boolean().default(false),
  limit: z.number().int().positive().optional(),
});
export type BrandMigrationOptions = z.infer<typeof brandMigrationOptionsSchema>;

export function parseBrandMigrationArgs(args: string[]): BrandMigrationOptions {
  const options: { apply: boolean; limit?: number } = { apply: false };
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--apply" && !options.apply) options.apply = true;
    else if (args[index] === "--limit" && options.limit === undefined)
      options.limit = Number(args[++index]);
    else throw new Error("Unsupported or repeated migration argument");
  }
  return brandMigrationOptionsSchema.parse(options);
}

interface MigrationProduct {
  _id: Types.ObjectId;
  brand?: unknown;
  attributes?: unknown;
}
interface MigrationBrand {
  _id: Types.ObjectId;
  name: string;
  isActive: boolean;
}
export interface BrandMigrationEvent {
  productId: string;
  status: string;
  legacyNames?: string[];
  candidates?: string[];
  targetId?: string;
  message?: string;
}
const attributeSchema = z.array(
  z.object({ key: z.string(), value: z.string() }),
);

// Native collections preserve malformed historical references for the audit.
export async function migrateProductBrands(
  db: mongo.Db,
  rawOptions: BrandMigrationOptions,
  report: (event: BrandMigrationEvent) => void | Promise<void> = () => {},
) {
  const options = brandMigrationOptionsSchema.parse(rawOptions);
  const summary = {
    mode: options.apply ? "apply" : "dry-run",
    inspected: 0,
    valid: 0,
    needsMigration: 0,
    matched: 0,
    unknown: 0,
    ambiguous: 0,
    conflicts: 0,
    invalidReferences: 0,
    changed: 0,
    concurrentChanges: 0,
    errors: 0,
  };
  const brands = await db.collection<MigrationBrand>("brands").find().toArray();
  const byId = new Map(brands.map((brand) => [String(brand._id), brand]));
  const byName = new Map<string, MigrationBrand[]>();
  for (const brand of brands) {
    const name = normalizeBrandText(brand.name);
    byName.set(name, [...(byName.get(name) ?? []), brand]);
  }
  const products = db.collection<MigrationProduct>("products");
  const cursor = products.find().sort({ _id: 1 }).batchSize(100);
  if (options.limit) cursor.limit(options.limit);
  try {
    for await (const product of cursor) {
      summary.inspected++;
      const event: BrandMigrationEvent = {
        productId: String(product._id),
        status: "unchanged",
      };
      try {
        const parsed = attributeSchema.safeParse(product.attributes ?? []);
        if (!parsed.success) throw new Error("Malformed historical attributes");
        const legacyNames = parsed.data
          .filter((attribute) => isBrandAttribute(attribute.key))
          .map((attribute) => attribute.value);
        event.legacyNames = legacyNames;
        const names = [
          ...new Set(legacyNames.map(normalizeBrandText).filter(Boolean)),
        ];
        const assigned = product.brand !== null && product.brand !== undefined;
        const current =
          product.brand instanceof Types.ObjectId
            ? byId.get(String(product.brand))
            : undefined;
        if (assigned && !current) {
          summary.invalidReferences++;
          event.status = "invalid-reference";
        } else if (current) {
          summary.valid++;
          if (names.some((name) => name !== normalizeBrandText(current.name))) {
            summary.conflicts++;
            event.status = "conflict";
          } else event.status = "valid";
        } else {
          summary.needsMigration++;
          const candidates = names.flatMap((name) => byName.get(name) ?? []);
          event.candidates = [
            ...new Set(candidates.map((brand) => String(brand._id))),
          ];
          if (names.length > 1) {
            summary.conflicts++;
            event.status = "conflict";
          } else if (candidates.length > 1) {
            summary.ambiguous++;
            event.status = "ambiguous";
          } else if (!candidates.length) {
            summary.unknown++;
            event.status = "unknown";
          } else if (!candidates[0].isActive) {
            summary.unknown++;
            event.status = "inactive-target";
          } else {
            const target = candidates[0];
            summary.matched++;
            event.targetId = String(target._id);
            event.status = "matched";
            if (options.apply) {
              const liveTarget = await db
                .collection<MigrationBrand>("brands")
                .findOne({
                  _id: target._id,
                  name: target.name,
                  isActive: true,
                });
              if (!liveTarget)
                throw new Error("Target brand changed; rerun the audit");
              // Compare the complete BSON snapshot, including timestamp-free edits.
              const result = await products.updateOne(
                {
                  _id: product._id,
                  $expr: { $eq: ["$$ROOT", { $literal: product }] },
                },
                { $set: { brand: target._id } },
              );
              if (result.matchedCount !== 1) {
                summary.concurrentChanges++;
                event.status = "concurrent-change";
              } else {
                summary.changed += result.modifiedCount;
                event.status = "changed";
              }
            }
          }
        }
      } catch (error: unknown) {
        summary.errors++;
        event.status = "error";
        event.message =
          error instanceof Error ? error.message : "Unknown migration error";
      }
      await report(event);
    }
  } finally {
    await cursor.close();
  }
  return summary;
}
