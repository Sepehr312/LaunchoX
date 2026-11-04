import { z } from "zod";
import {
  assetUrlSchema,
  emailSchema,
  requiredString,
} from "@/validations/common";

export const sectionTemplateSchema = z.enum([
  "introduction",
  "story",
  "values",
  "steps",
  "faq",
  "contact",
]);
export const contentIconSchema = z.enum([
  "store",
  "book",
  "shield",
  "layers",
  "info",
  "headphones",
  "compass",
  "cart",
  "truck",
  "leaf",
  "compare",
  "check",
  "ruler",
  "volume",
]);
export const sectionLinkSchema = z
  .string()
  .trim()
  .max(500)
  .regex(
    /^(\/(?!\/)|#)[^\\\s]*$/,
    "لینک باید به صفحه‌ای در همین سایت اشاره کند",
  );
const optionalText = z.string().trim().max(5000);
const buttonSchema = z
  .object({
    enabled: z.boolean(),
    label: z.string().trim().max(200),
    href: z.union([sectionLinkSchema, z.literal("")]),
  })
  .superRefine((button, ctx) => {
    if (button.enabled && (!button.label || !button.href)) {
      ctx.addIssue({
        code: "custom",
        path: [!button.label ? "label" : "href"],
        message: "متن و لینک دکمه را وارد کنید",
      });
    }
  });
export const sectionItemSchema = z.object({
  id: z.string().min(1).max(80),
  title: requiredString.max(500),
  description: requiredString.max(5000),
  icon: contentIconSchema,
  isActive: z.boolean(),
  button: buttonSchema.optional(),
});
export const sectionContactSchema = z
  .object({
    useStore: z.boolean(),
    phone: z.string().trim().max(40),
    email: z.string().trim().max(254),
    address: z.string().trim().max(1000),
    showPhone: z.boolean(),
    showEmail: z.boolean(),
    showAddress: z.boolean(),
  })
  .superRefine((contact, ctx) => {
    if (contact.useStore) return;
    if (!/^[+0-9۰-۹ ()-]*$/.test(contact.phone)) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "تلفن معتبر نیست",
      });
    }
    if (contact.email && !emailSchema.safeParse(contact.email).success) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "ایمیل معتبر نیست",
      });
    }
  });

// Optional template fields preserve previously saved untyped CMS sections.
export const aboutSectionSchema = z
  .object({
    id: z.string().min(1).max(80).optional(),
    template: sectionTemplateSchema.optional(),
    title: requiredString.max(5000),
    description: requiredString.max(5000),
    imageUrl: z.union([assetUrlSchema, z.literal("")]).default(""),
    isActive: z.boolean().optional(),
    eyebrow: optionalText.optional(),
    titleAccent: z.string().trim().max(500).optional(),
    note: optionalText.optional(),
    captionTitle: z.string().trim().max(300).optional(),
    captionDescription: z.string().trim().max(300).optional(),
    panelTitle: z.string().trim().max(500).optional(),
    panelNote: optionalText.optional(),
    imageAlt: z.string().trim().max(300).optional(),
    imagePosition: z.enum(["start", "end"]).optional(),
    button: buttonSchema.optional(),
    secondaryButton: buttonSchema.optional(),
    items: z
      .array(sectionItemSchema)
      .max(30, "حداکثر سی مورد مجاز است")
      .optional(),
    openFirst: z.boolean().optional(),
    contact: sectionContactSchema.optional(),
  })
  .superRefine((section, ctx) => {
    if (
      ["values", "steps", "faq"].includes(section.template ?? "") &&
      !section.items?.length
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "حداقل یک مورد به این بخش اضافه کنید",
      });
    }
    if (section.template === "contact" && !section.contact) {
      ctx.addIssue({
        code: "custom",
        path: ["contact"],
        message: "اطلاعات بخش ارتباط را مشخص کنید",
      });
    }
    const ids = section.items?.map((item) => item.id) ?? [];
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "شناسهٔ موارد تکراری است",
      });
    }
  });
export type AboutSection = z.infer<typeof aboutSectionSchema>;
export type SectionTemplate = z.infer<typeof sectionTemplateSchema>;
export type SectionItem = z.infer<typeof sectionItemSchema>;
export type ContentIconName = z.infer<typeof contentIconSchema>;
export type SectionContact = z.infer<typeof sectionContactSchema>;

export const aboutSectionIdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9-]+$/, "شناسهٔ بخش معتبر نیست");
export const aboutMutationSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("save"),
    section: aboutSectionSchema.safeExtend({ id: aboutSectionIdSchema }),
    create: z.boolean().default(false),
  }),
  z.object({ operation: z.literal("delete"), id: aboutSectionIdSchema }),
  z.object({
    operation: z.literal("move"),
    id: aboutSectionIdSchema,
    targetId: aboutSectionIdSchema,
  }),
  z.object({
    operation: z.literal("visibility"),
    id: aboutSectionIdSchema,
    isActive: z.boolean(),
  }),
  z.object({ operation: z.literal("page-visibility"), isActive: z.boolean() }),
]);
export type AboutMutation = z.infer<typeof aboutMutationSchema>;
