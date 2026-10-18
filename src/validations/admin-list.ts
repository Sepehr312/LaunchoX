import { z } from "zod";

export const adminListQuerySchema = z.object({
  q: z
    .string({ error: "عبارت جستجو معتبر نیست" })
    .trim()
    .max(100, "عبارت جستجو باید حداکثر ۱۰۰ کاراکتر باشد")
    .default(""),
});
