import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  aboutTemplates,
  createAboutSection,
  prepareAboutPage,
} from "@/components/admin/about-templates";
import { AboutSections } from "@/components/store/AboutSections";
import { aboutSectionSchema } from "@/validations/about-sections";
import { contentSchema } from "@/validations/content";

const contact = {
  phone: "02112345678",
  email: "store@example.com",
  address: "نشانی فروشگاه",
};

describe("about section templates", () => {
  it("accepts all six presets and preserves legacy content without adding fields", () => {
    expect(aboutTemplates).toHaveLength(6);
    for (const template of aboutTemplates) {
      const section = createAboutSection(template.type);
      expect(aboutSectionSchema.parse(section)).toEqual(section);
    }
    const legacy = { title: "عنوان", description: "توضیح", imageUrl: "" };
    expect(aboutSectionSchema.parse(legacy)).toEqual(legacy);
    expect(
      aboutSectionSchema.safeParse({ ...legacy, template: "unknown" }).success,
    ).toBe(false);
  });

  it("rejects executable/external action links, empty enabled buttons and invalid contact data", () => {
    for (const href of [
      "javascript:alert(1)",
      "//evil.test",
      "/\\evil.test",
      "https://evil.test",
    ]) {
      expect(
        aboutSectionSchema.safeParse({
          ...createAboutSection("introduction"),
          button: { enabled: true, label: "خرید", href },
        }).success,
      ).toBe(false);
    }
    const section = createAboutSection("contact");
    expect(
      aboutSectionSchema.safeParse({
        ...section,
        button: { enabled: true, label: "", href: "" },
      }).success,
    ).toBe(false);
    expect(
      aboutSectionSchema.safeParse({
        ...section,
        contact: { ...section.contact, useStore: false, email: "not-email" },
      }).success,
    ).toBe(false);
  });
  it("preserves legacy sections and questions and avoids identifier collisions", () => {
    const page = prepareAboutPage({
      title: "عنوان",
      content: "متن",
      isActive: true,
      sections: [
        { id: "existing-1", title: "اول", description: "متن", imageUrl: "" },
        { title: "دوم", description: "متن", imageUrl: "" },
        {
          id: "legacy-questions",
          title: "سوم",
          description: "متن",
          imageUrl: "",
        },
      ],
      questions: [{ question: "پرسش قبلی", answer: "پاسخ قبلی" }],
    });
    expect(page.sections).toHaveLength(4);
    expect(new Set(page.sections.map((section) => section.id)).size).toBe(4);
    expect(page.questions).toEqual([]);
    expect(page.sections[3].items?.[0]).toMatchObject({
      title: "پرسش قبلی",
      description: "پاسخ قبلی",
    });
    expect(prepareAboutPage(page)).toEqual(page);
  });
  it("allows reverting to shared contacts while preserving an unfinished custom draft", () => {
    const section = createAboutSection("contact");
    section.contact = {
      ...section.contact!,
      useStore: true,
      email: "unfinished",
    };
    expect(aboutSectionSchema.safeParse(section).success).toBe(true);
    const html = renderToStaticMarkup(
      <AboutSections sections={[section]} contact={contact} />,
    );
    expect(html).toContain("store@example.com");
    expect(html).not.toContain("unfinished");
  });

  it("rejects missing items, excessive items and duplicate identifiers", () => {
    const section = createAboutSection("values");
    const item = section.items![0];
    expect(
      aboutSectionSchema.safeParse({ ...section, items: [] }).success,
    ).toBe(false);
    expect(
      aboutSectionSchema.safeParse({ ...section, items: [item, item] }).success,
    ).toBe(false);
    expect(
      aboutSectionSchema.safeParse({
        ...section,
        items: Array.from({ length: 31 }, (_, index) => ({
          ...item,
          id: String(index),
        })),
      }).success,
    ).toBe(false);
    expect(
      contentSchema.safeParse({
        key: "about",
        data: {
          title: "عنوان",
          content: "متن",
          isActive: true,
          sections: [section, section],
          questions: [],
        },
      }).success,
    ).toBe(false);
  });

  it("hides inactive sections and items and numbers only the visible steps", () => {
    const hidden = {
      ...createAboutSection("introduction"),
      title: "بخش پنهان",
      isActive: false,
    };
    const steps = createAboutSection("steps");
    steps.items![0].title = "مرحله پنهان";
    steps.items![0].isActive = false;
    const html = renderToStaticMarkup(
      <AboutSections sections={[hidden, steps]} contact={contact} />,
    );
    expect(html).not.toContain("بخش پنهان");
    expect(html).not.toContain("مرحله پنهان");
    expect(html).toContain(steps.items![1].title);
    expect(html).toContain("۱");
    expect(html).not.toContain("۳");
  });

  it("renders the FAQ accordion and escapes text instead of executing HTML", () => {
    const faq = createAboutSection("faq");
    faq.items![0].description = "<script>alert(1)</script>";
    const html = renderToStaticMarkup(
      <AboutSections sections={[faq]} contact={contact} />,
    );
    expect(html).toContain('<details open="">');
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("uses central contact settings or local overrides and respects visibility switches", () => {
    const section = createAboutSection("contact");
    let html = renderToStaticMarkup(
      <AboutSections sections={[section]} contact={contact} />,
    );
    expect(html).toContain("tel:02112345678");
    expect(html).toContain("store@example.com");
    section.contact = {
      ...section.contact!,
      useStore: false,
      phone: "۰۹۱۲۱۲۳۴۵۶۷",
      email: "custom@example.com",
      address: "نشانی اختصاصی",
      showEmail: false,
    };
    html = renderToStaticMarkup(
      <AboutSections sections={[section]} contact={contact} />,
    );
    expect(html).toContain("tel:09121234567");
    expect(html).toContain("نشانی اختصاصی");
    expect(html).not.toContain("custom@example.com");
    expect(html).not.toContain("store@example.com");
  });

  it("does not put unsafe draft URLs into the preview", () => {
    const section = createAboutSection("introduction");
    section.imageUrl = "javascript:alert(1)";
    section.button = { enabled: true, label: "خرید", href: "//evil.test" };
    const html = renderToStaticMarkup(
      <AboutSections sections={[section]} contact={contact} preview />,
    );
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("evil.test");
  });
});
