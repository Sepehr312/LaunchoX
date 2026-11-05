import type { ManagedPage } from "@/validations/content";

export function prepareAboutPage(page: ManagedPage) {
  const usedIds = new Set(
    page.sections.flatMap((section) => (section.id ? [section.id] : [])),
  );
  function identifier(base: string) {
    let id = base;
    let suffix = 0;
    while (usedIds.has(id)) id = `${base}-${++suffix}`;
    usedIds.add(id);
    return id;
  }
  const sections = page.sections.map((section, index) => ({
    ...section,
    id: section.id ?? identifier(`existing-${index}`),
  }));
  if (page.questions.length) {
    sections.push({
      id: identifier("legacy-questions"),
      template: "faq",
      title: "پرسش‌های متداول",
      description: "پاسخ پرسش‌های رایج شما",
      imageUrl: "",
      isActive: true,
      openFirst: true,
      items: page.questions.map((question, index) => ({
        id: `question-${index}`,
        title: question.question,
        description: question.answer,
        icon: "info",
        isActive: true,
      })),
    });
  }
  return { ...page, layout: "sections" as const, questions: [], sections };
}
