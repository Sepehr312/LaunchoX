import { z } from "zod";
import { objectIdSchema } from "@/validations/common";

export const compareIdsSchema = z
  .array(objectIdSchema)
  .max(4)
  .transform((ids) => [...new Set(ids.map((id) => id.toLowerCase()))]);
export const compareSearchSchema = z.object({
  q: z.string().trim().max(100).default(""),
  page: z.number().int().min(1).max(10000).default(1),
});
export const compareUrlSchema = z
  .string()
  .max(200)
  .transform((value) => (value ? value.split(",") : []))
  .pipe(compareIdsSchema);

export function parseCompareIds(value: unknown): string[] {
  const parsed = compareUrlSchema.safeParse(value ?? "");
  return parsed.success ? parsed.data : [];
}
