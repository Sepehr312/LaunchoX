import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { startTestMongo } from "./mongo-server";
import { productInput } from "./fixtures";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: async () => mongoose }));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    NEXT_PUBLIC_SITE_URL: "https://shop.test",
    CONTACT_PHONE: "123",
    CONTACT_EMAIL: "fallback@example.com",
    CONTACT_ADDRESS: "address",
    NEXT_PUBLIC_SITE_NAME: "shop",
  }),
}));
import { ManagedContent } from "@/models/managed-content";
import { Favorite } from "@/models/favorite";
import { Product } from "@/models/product";
import {
  mutateAboutSection,
  mutateServicesSection,
  readContent,
  saveContent,
} from "@/services/content.service";
import { getSiteSettings } from "@/services/site.service";
import {
  mergeFavorites,
  setFavorite,
  favoriteIds,
} from "@/services/favorite.service";
import { cleanupImages } from "@/services/image-lifecycle.service";
import { UploadedImage } from "@/models/uploaded-image";
import {
  defaultServicesPage,
  createServicesSection,
  prepareServicesPage,
} from "@/lib/services-defaults";
import {
  aboutTemplates,
  createAboutSection,
} from "@/components/admin/about-templates";
let server: Awaited<ReturnType<typeof startTestMongo>>;

it("preserves service defaults and unrelated sections during concurrent saves", async () => {
  const first = createServicesSection("introduction");
  const second = createServicesSection("story");
  await saveContent({
    key: "services",
    data: { ...defaultServicesPage, sections: [first, second] },
  });
  await Promise.all([
    mutateServicesSection({
      operation: "save",
      section: { ...first, title: "Updated introduction" },
    }),
    mutateServicesSection({
      operation: "save",
      section: { ...second, title: "Updated order support" },
    }),
  ]);
  const content = await readContent("services");
  expect(
    content?.key === "services" && content.data.sections.map((s) => s.title),
  ).toEqual(["Updated introduction", "Updated order support"]);
  await mutateServicesSection({
    operation: "visibility",
    id: first.id,
    isActive: false,
  });
  const moved = await mutateServicesSection({
    operation: "move",
    id: second.id,
    targetId: first.id,
  });
  expect(moved.sections[0].id).toBe(second.id);
  expect(moved.sections[1].isActive).toBe(false);
  await mutateServicesSection({ operation: "delete", id: first.id });
  await expect(
    mutateServicesSection({ operation: "save", section: first }),
  ).rejects.toThrow();
  await expect(
    mutateServicesSection({
      operation: "save",
      create: true,
      section: { ...first, imageUrl: "/api/images/000000000000000000000001" },
    }),
  ).rejects.toThrow();
  const saved = await readContent("services");
  expect(saved?.key === "services" && saved.data.sections).toHaveLength(1);
});

it("preserves legacy service intro, sections and questions through normalization", () => {
  const legacy = {
    ...defaultServicesPage,
    layout: undefined,
    title: "Legacy title",
    content: "Legacy intro",
    sections: [
      { title: "Legacy section", description: "Legacy text", imageUrl: "" },
    ],
    questions: [{ question: "Question", answer: "Answer" }],
  };
  const page = prepareServicesPage(legacy);
  expect(page.sections).toHaveLength(3);
  expect(page.sections[0].description).toBe("Legacy intro");
  expect(page.sections[1].title).toBe("Legacy section");
  expect(page.sections[2].items?.[0].description).toBe("Answer");
  expect(prepareServicesPage(page)).toEqual(page);
});

it("saves sections independently and preserves concurrent edits and visibility", async () => {
  const first = createAboutSection("introduction");
  const second = createAboutSection("story");
  await saveContent({
    key: "about",
    data: {
      title: "درباره ما",
      content: "معرفی",
      isActive: true,
      sections: [first, second],
      questions: [],
      layout: "sections",
    },
  });
  await Promise.all([
    mutateAboutSection({
      operation: "save",
      section: { ...first, title: "معرفی جدید" },
    }),
    mutateAboutSection({
      operation: "save",
      section: { ...second, title: "داستان جدید" },
    }),
  ]);
  await mutateAboutSection({
    operation: "visibility",
    id: second.id,
    isActive: false,
  });
  const page = await mutateAboutSection({
    operation: "move",
    id: second.id,
    targetId: first.id,
  });
  expect(page.sections.map((section) => section.title)).toEqual([
    "داستان جدید",
    "معرفی جدید",
  ]);
  expect(page.sections[0].isActive).toBe(false);
  await mutateAboutSection({ operation: "delete", id: first.id });
  await expect(
    mutateAboutSection({ operation: "save", section: first }),
  ).rejects.toThrow("بخش پیدا نشد");
  const stored = await readContent("about");
  expect(stored?.key === "about" && stored.data.sections).toHaveLength(1);
});

it("creates sections once and rejects missing uploaded images without publishing the draft", async () => {
  const section = createAboutSection("story");
  await saveContent({
    key: "about",
    data: {
      title: "درباره ما",
      content: "معرفی",
      isActive: true,
      sections: [],
      questions: [],
      layout: "sections",
    },
  });
  await expect(
    mutateAboutSection({
      operation: "save",
      create: true,
      section: {
        ...section,
        imageUrl: `/api/images/${new mongoose.Types.ObjectId()}`,
      },
    }),
  ).rejects.toThrow("تصویر دیگر موجود نیست");
  const before = await readContent("about");
  expect(before?.key === "about" && before.data.sections).toHaveLength(0);
  await mutateAboutSection({ operation: "save", create: true, section });
  await expect(
    mutateAboutSection({ operation: "save", create: true, section }),
  ).rejects.toThrow("قبلاً ذخیره شده");
  expect(
    (
      await mutateAboutSection({
        operation: "page-visibility",
        isActive: false,
      })
    ).isActive,
  ).toBe(false);
});
beforeAll(async () => {
  server = await startTestMongo(true);
  await mongoose.connect(server.uri);
  await Promise.all([
    Favorite.init(),
    ManagedContent.init(),
    UploadedImage.init(),
  ]);
}, 180000);
beforeEach(async () => {
  await Promise.all([
    ManagedContent.deleteMany({}),
    Favorite.deleteMany({}),
    Product.deleteMany({}),
    UploadedImage.deleteMany({}),
  ]);
});
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});
it("stores ordered page sections and FAQs and shares contact settings", async () => {
  const data = {
    title: "عنوان",
    content: "متن",
    isActive: true,
    sections: [
      { title: "دوم", description: "متن", imageUrl: "" },
      { title: "اول", description: "متن", imageUrl: "" },
    ],
    questions: [{ question: "چرا؟", answer: "پاسخ" }],
  };
  await saveContent({ key: "about", data });
  expect(await readContent("about")).toEqual({ key: "about", data });
  await saveContent({
    key: "contact",
    data: { phone: "02112345678", email: "hi@example.com", address: "تهران" },
  });
  expect(await getSiteSettings()).toMatchObject({
    phone: "02112345678",
    email: "hi@example.com",
    address: "تهران",
  });
  await saveContent({ key: "slides", data: [] });
  expect(await readContent("slides")).toEqual({ key: "slides", data: [] });
});
it("rejects unsafe image URLs, unknown keys and unsafe slide links", async () => {
  await expect(saveContent({ key: "unknown", data: {} })).rejects.toThrow();
  const slide = {
    id: "one",
    dayImage: "https://example.com/image.png",
    eyebrow: "متن",
    title: "متن",
    subtitle: "متن",
    description: "متن",
    primary: { label: "لینک", href: "javascript:alert(1)" },
    secondary: { label: "لینک", href: "/products" },
    isActive: true,
  };
  await expect(saveContent({ key: "slides", data: [slide] })).rejects.toThrow();
  await expect(
    saveContent({
      key: "slides",
      data: [
        {
          ...slide,
          dayImage: "javascript:bad",
          primary: { label: "لینک", href: "/products" },
        },
      ],
    }),
  ).rejects.toThrow();
  expect(await ManagedContent.countDocuments()).toBe(0);
});
it("round-trips all about presets, their order, inactive items and contact overrides", async () => {
  const sections = aboutTemplates
    .map((template) => createAboutSection(template.type))
    .reverse();
  const values = sections.find((section) => section.template === "values")!;
  values.items![0].isActive = false;
  const story = sections.find((section) => section.template === "story")!;
  story.isActive = false;
  const data = {
    title: "درباره ما",
    content: "متن معرفی",
    isActive: true,
    layout: "sections",
    sections,
    questions: [],
  };
  const saved = await saveContent({ key: "about", data });
  expect(await readContent("about")).toEqual(saved);
  await expect(
    saveContent({
      key: "about",
      data: { ...data, sections: [{ ...values, template: "unknown" }] },
    }),
  ).rejects.toThrow();
  expect(await readContent("about")).toEqual(saved);
});
it("merges guest choices idempotently, excludes inactive products and isolates users", async () => {
  const user = new mongoose.Types.ObjectId().toString(),
    other = new mongoose.Types.ObjectId().toString();
  const product = await Product.create(productInput);
  const hidden = await Product.create({
    ...productInput,
    slug: "hidden",
    isActive: false,
  });
  const id = String(product._id);
  await Promise.all([
    mergeFavorites(user, [id, id, String(hidden._id)]),
    mergeFavorites(user, [id]),
  ]);
  expect(await favoriteIds(user)).toEqual([id]);
  expect(await favoriteIds(other)).toEqual([]);
  await setFavorite(other, { id, liked: false });
  expect(await favoriteIds(user)).toEqual([id]);
  await setFavorite(user, { id, liked: false });
  expect(await favoriteIds(user)).toEqual([]);
});
it("protects images referenced only by CMS content from cleanup", async () => {
  const image = await UploadedImage.create({
    data: Buffer.from("test"),
    contentType: "image/png",
  });
  await UploadedImage.collection.updateOne(
    { _id: image._id },
    { $set: { createdAt: new Date(Date.now() - 48 * 3600000) } },
  );
  const imageUrl = "/api/images/" + image._id;
  await saveContent({
    key: "about",
    data: {
      title: "عنوان",
      content: "متن",
      isActive: true,
      sections: [{ ...createAboutSection("story"), imageUrl, isActive: false }],
      questions: [],
    },
  });
  const result = await cleanupImages({ apply: true });
  expect(await UploadedImage.exists({ _id: image._id })).toBeTruthy();
  expect(JSON.stringify(result)).toContain("referenced");
});
