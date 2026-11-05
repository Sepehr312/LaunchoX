import type {
  AboutSection,
  SectionItem,
  SectionTemplate,
} from "@/validations/about-sections";
import { aboutSectionPresets } from "@/components/store/about-defaults";

export { prepareAboutPage } from "@/lib/about-page";

export const aboutTemplates: {
  type: SectionTemplate;
  title: string;
  description: string;
}[] = [
  {
    type: "introduction",
    title: "معرفی فروشگاه",
    description: "تصویر، متن معرفی و دکمهٔ اقدام",
  },
  {
    type: "story",
    title: "داستان ما",
    description: "روایت فروشگاه با متن و تصویر",
  },
  {
    type: "values",
    title: "ارزش‌های ما",
    description: "کارت‌های ارزش همراه با آیکون",
  },
  {
    type: "steps",
    title: "مسیر انتخاب محصول",
    description: "راهنمای مرحله‌به‌مرحلهٔ انتخاب",
  },
  {
    type: "faq",
    title: "پرسش‌های متداول",
    description: "فهرست بازشوندهٔ پرسش و پاسخ",
  },
  {
    type: "contact",
    title: "ارتباط با ما",
    description: "اطلاعات تماس و دکمهٔ ارتباط",
  },
];
export function createSectionItem(template: SectionTemplate): SectionItem {
  return {
    id: crypto.randomUUID(),
    title:
      template === "faq"
        ? "پرسش جدید"
        : template === "steps"
          ? "مرحله جدید"
          : "ارزش جدید",
    description:
      template === "faq"
        ? "پاسخ پرسش را وارد کنید."
        : "توضیح این مورد را وارد کنید.",
    icon: "info",
    isActive: true,
  };
}
export function createAboutSection(template: SectionTemplate): AboutSection {
  const section = structuredClone(aboutSectionPresets[template]);
  section.id = crypto.randomUUID();
  if (section.items)
    section.items = section.items.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    }));
  return section;
}
