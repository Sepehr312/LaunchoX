import { AppError } from "@/lib/errors";
import type { AboutMutation } from "@/validations/about-sections";
import type { ManagedPage } from "@/validations/content";

export function applyAboutMutation(
  page: ManagedPage,
  mutation: AboutMutation,
): ManagedPage {
  if (mutation.operation === "page-visibility")
    return { ...page, isActive: mutation.isActive };
  const sections = [...page.sections];
  const id = mutation.operation === "save" ? mutation.section.id : mutation.id;
  const index = sections.findIndex((section) => section.id === id);
  if (mutation.operation === "save" && mutation.create) {
    if (index >= 0)
      throw new AppError(
        "این بخش قبلاً ذخیره شده است؛ صفحه را تازه کنید.",
        "VALIDATION",
      );
    if (sections.length >= 30)
      throw new AppError("حداکثر سی بخش مجاز است", "VALIDATION");
    sections.push(mutation.section);
  } else {
    if (index < 0)
      throw new AppError("بخش پیدا نشد؛ صفحه را تازه کنید.", "VALIDATION");
    if (mutation.operation === "save") sections[index] = mutation.section;
    else if (mutation.operation === "delete") sections.splice(index, 1);
    else if (mutation.operation === "visibility")
      sections[index] = { ...sections[index], isActive: mutation.isActive };
    else {
      const target = sections.findIndex(
        (section) => section.id === mutation.targetId,
      );
      if (target < 0)
        throw new AppError(
          "بخش مقصد پیدا نشد؛ صفحه را تازه کنید.",
          "VALIDATION",
        );
      const [section] = sections.splice(index, 1);
      sections.splice(target, 0, section);
    }
  }
  return { ...page, sections };
}
