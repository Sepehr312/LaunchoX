import { z } from "zod";

export const adminCatalogViewSchema = z.enum(["table", "cards"]);

export const adminListQuerySchema = z.object({
  q: z
    .string({ error: "عبارت جستجو معتبر نیست" })
    .trim()
    .max(100, "عبارت جستجو باید حداکثر ۱۰۰ کاراکتر باشد")
    .default(""),
});
