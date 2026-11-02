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
import { readContent, saveContent } from "@/services/content.service";
import { getSiteSettings } from "@/services/site.service";
import {
  mergeFavorites,
  setFavorite,
  favoriteIds,
} from "@/services/favorite.service";
import { cleanupImages } from "@/services/image-lifecycle.service";
import { UploadedImage } from "@/models/uploaded-image";
let server: Awaited<ReturnType<typeof startTestMongo>>;
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
      sections: [{ title: "تصویر", description: "متن", imageUrl }],
      questions: [],
    },
  });
  const result = await cleanupImages({ apply: true });
  expect(await UploadedImage.exists({ _id: image._id })).toBeTruthy();
  expect(JSON.stringify(result)).toContain("referenced");
});
