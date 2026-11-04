import { z } from "zod";
import { aboutSectionSchema } from "@/validations/about-sections";
import {
  assetUrlSchema,
  requiredString,
  emailSchema,
} from "@/validations/common";
export const contentKeySchema = z.enum([
  "about",
  "services",
  "slides",
  "contact",
]);
const text = requiredString.max(5000);
const href = z
  .string()
  .max(500)
  .regex(
    /^(\/(?!\/)|#)[^\\\s]*$/,
    "لینک باید به صفحه‌ای در همین سایت اشاره کند",
  );
export const sectionSchema = aboutSectionSchema;
export const pageSchema = z
  .object({
    title: text,
    content: text,
    isActive: z.boolean(),
    sections: z.array(sectionSchema).max(30),
    questions: z
      .array(z.object({ question: text, answer: text }))
      .max(30)
      .default([]),
    layout: z.literal("sections").optional(),
  })
  .superRefine((page, ctx) => {
    const ids = page.sections.flatMap((section) =>
      section.id ? [section.id] : [],
    );
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        path: ["sections"],
        message: "شناسهٔ بخش‌ها تکراری است",
      });
    }
  });
export const slideSchema = z.object({
  id: z.string().min(1).max(80),
  dayImage: assetUrlSchema,
  eyebrow: text,
  title: text,
  subtitle: text,
  description: text,
  primary: z.object({ label: text, href }),
  secondary: z.object({ label: text, href }),
  isActive: z.boolean(),
});
export const slidesSchema = z
  .array(slideSchema)
  .max(20)
  .refine(
    (s) => new Set(s.map((x) => x.id)).size === s.length,
    "شناسهٔ اسلاید تکراری است",
  );
export const contactSchema = z.object({
  phone: z
    .string()
    .trim()
    .max(40)
    .regex(/^[+0-9۰-۹ ()-]*$/, "تلفن معتبر نیست"),
  email: z.union([emailSchema, z.literal("")]),
  address: z.string().trim().max(1000),
});
export const contentSchema = z.discriminatedUnion("key", [
  z.object({ key: z.literal("about"), data: pageSchema }),
  z.object({ key: z.literal("services"), data: pageSchema }),
  z.object({ key: z.literal("slides"), data: slidesSchema }),
  z.object({ key: z.literal("contact"), data: contactSchema }),
]);
export type ContentInput = z.infer<typeof contentSchema>;
export type ManagedPage = z.infer<typeof pageSchema>;
