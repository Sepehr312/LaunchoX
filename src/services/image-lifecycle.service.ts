import "server-only";

import mongoose, { type ClientSession } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getEnv } from "@/lib/env";
import { imageIdPattern, inspectImageReference } from "@/lib/image-reference";
import { UploadedImage } from "@/models/uploaded-image";
import { Product } from "@/models/product";
import { Category } from "@/models/category";
import { Brand } from "@/models/brand";
import { Order } from "@/models/order";
import { IMAGE_POLICY } from "@/validations/image-policy";

function inspectReference(url: string) {
  const preliminary = inspectImageReference(url, []);
  if (preliminary.kind !== "ambiguous") return preliminary;
  const env = getEnv();
  return inspectImageReference(url, [
    new URL(env.NEXT_PUBLIC_SITE_URL).origin,
    ...(env.IMAGE_INTERNAL_ORIGINS ?? []),
  ]);
}

function uploadedImageIds(urls: readonly (string | undefined)[]): string[] {
  const ids = new Set<string>();
  for (const url of urls) {
    if (!url) continue;
    const reference = inspectReference(url);
    if (reference.kind === "internal") ids.add(reference.id);
  }
  return [...ids].sort();
}

function referenceValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(referenceValues);
  if (value && typeof value === "object")
    return Object.values(value).flatMap(referenceValues);
  return [];
}

export async function withImageReferences<T>(
  urls: readonly (string | undefined)[],
  write: (session?: ClientSession) => Promise<T>,
): Promise<T> {
  const ids = uploadedImageIds(urls);
  if (!ids.length) return write();
  await connectDB();
  return mongoose.connection.transaction(
    async (session) => {
      for (const id of ids) {
        const result = await UploadedImage.updateOne(
          { _id: id },
          { $inc: { referenceRevision: 1 } },
          { session, timestamps: false },
        );
        if (!result.matchedCount)
          throw new AppError(
            "تصویر دیگر موجود نیست؛ دوباره آن را بارگذاری کنید",
            "VALIDATION",
          );
      }
      // Both the reference and its image lock must commit together to exclude cleanup races.
      return write(session);
    },
    { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } },
  );
}

async function referenceStatus(
  id: string,
  session?: ClientSession,
): Promise<"referenced" | "ambiguous" | "orphan"> {
  const canonical = `/api/images/${id}`;
  const pattern = imageIdPattern(id);
  const sources = [
    {
      exact: () =>
        Product.exists({ images: canonical })
          .session(session ?? null)
          .maxTimeMS(10000),
      legacy: () =>
        Product.find({ images: pattern })
          .select("images -_id")
          .session(session ?? null)
          .maxTimeMS(10000)
          .lean()
          .cursor({ batchSize: 16 }),
    },
    {
      exact: () =>
        Category.exists({ image: canonical })
          .session(session ?? null)
          .maxTimeMS(10000),
      legacy: () =>
        Category.find({ image: pattern })
          .select("image -_id")
          .session(session ?? null)
          .maxTimeMS(10000)
          .lean()
          .cursor({ batchSize: 16 }),
    },
    {
      exact: () =>
        Brand.exists({ logo: canonical })
          .session(session ?? null)
          .maxTimeMS(10000),
      legacy: () =>
        Brand.find({ logo: pattern })
          .select("logo -_id")
          .session(session ?? null)
          .maxTimeMS(10000)
          .lean()
          .cursor({ batchSize: 16 }),
    },
    {
      exact: () =>
        Order.exists({ "items.image": canonical })
          .session(session ?? null)
          .maxTimeMS(10000),
      legacy: () =>
        Order.find({ "items.image": pattern })
          .select("items.image -_id")
          .session(session ?? null)
          .maxTimeMS(10000)
          .lean()
          .cursor({ batchSize: 16 }),
    },
  ];
  let ambiguous = false;
  // Sequential reads keep cursor operations in the same transaction and bound legacy memory.
  for (const source of sources) {
    if (await source.exact()) return "referenced";
    const cursor = source.legacy();
    try {
      for await (const record of cursor) {
        for (const value of referenceValues(record)) {
          if (!pattern.test(value)) continue;
          const reference = inspectReference(value);
          if (reference.kind === "internal" && reference.id === id)
            return "referenced";
          // Unknown historical origins or malformed legacy values fail closed for deletion.
          if (
            (reference.kind === "ambiguous" && reference.id === id) ||
            reference.kind === "invalid"
          )
            ambiguous = true;
        }
      }
    } finally {
      await cursor.close();
    }
  }
  return ambiguous ? "ambiguous" : "orphan";
}

const cleanupSchema = z
  .object({
    apply: z.boolean().default(false),
    limit: z
      .number()
      .int()
      .min(1)
      .max(IMAGE_POLICY.maxCleanupBatch)
      .default(50),
    after: z
      .string()
      .regex(/^[a-f0-9]{24}$/)
      .optional(),
  })
  .strict();

export async function cleanupImages(input: unknown = {}) {
  const options = cleanupSchema.parse(input);
  await connectDB();
  const cutoff = new Date(Date.now() - IMAGE_POLICY.graceMs);
  const candidates = await UploadedImage.find({
    createdAt: { $lt: cutoff },
    ...(options.after ? { _id: { $gt: options.after } } : {}),
  })
    .sort({ _id: 1 })
    .limit(options.limit)
    .select("_id")
    .lean();
  const results: {
    id: string;
    status:
      "referenced" | "ambiguous" | "orphan" | "deleted" | "missing" | "failed";
  }[] = [];
  for (const candidate of candidates) {
    const id = String(candidate._id);
    try {
      if (!options.apply) {
        results.push({
          id,
          status: await referenceStatus(id),
        });
        continue;
      }
      const status = await mongoose.connection.transaction(
        async (session) => {
          const locked = await UploadedImage.updateOne(
            { _id: id, createdAt: { $lt: cutoff } },
            { $inc: { referenceRevision: 1 } },
            { session, timestamps: false },
          );
          if (!locked.matchedCount) return "missing" as const;
          const reference = await referenceStatus(id, session);
          if (reference !== "orphan") return reference;
          await UploadedImage.deleteOne({ _id: id }, { session });
          return "deleted" as const;
        },
        { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } },
      );
      results.push({ id, status });
    } catch (error: unknown) {
      console.error("Image cleanup failed", { id, error });
      results.push({ id, status: "failed" });
    }
  }
  return {
    apply: options.apply,
    scanned: results.length,
    results,
    counts: Object.fromEntries(
      ["referenced", "ambiguous", "orphan", "deleted", "missing", "failed"].map(
        (status) => [
          status,
          results.filter((result) => result.status === status).length,
        ],
      ),
    ),
    nextAfter:
      candidates.length === options.limit
        ? String(candidates.at(-1)!._id)
        : null,
  };
}
