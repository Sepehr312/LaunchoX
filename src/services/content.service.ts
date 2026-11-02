import PageContent from "@/models/page-content";
import "server-only";
import { connectDB } from "@/lib/db";
import { ManagedContent } from "@/models/managed-content";
import {
  contentSchema,
  contentKeySchema,
  type ContentInput,
} from "@/validations/content";
import { withImageReferences } from "@/services/image-lifecycle.service";
export async function readContent(key: unknown): Promise<ContentInput | null> {
  const valid = contentKeySchema.parse(key);
  await connectDB();
  const doc = await ManagedContent.findOne({ key: valid }).lean();
  if (doc) return contentSchema.parse({ key: valid, data: doc.data });
  if (valid === "about" || valid === "services") {
    const legacy = await PageContent.findOne({
      slug: { $in: valid === "about" ? ["about", "about-us"] : ["services"] },
    }).lean();
    if (legacy)
      return contentSchema.parse({
        key: valid,
        data: {
          title: legacy.title,
          content: legacy.content,
          isActive: legacy.isActive,
          sections: legacy.sections.map((s) => ({
            title: s.title,
            description: s.description,
            imageUrl: s.imageUrl ?? "",
          })),
          questions: [],
        },
      });
  }
  return null;
}
export async function saveContent(input: unknown) {
  const value = contentSchema.parse(input);
  await connectDB();
  const images =
    value.key === "slides"
      ? value.data.map((s) => s.dayImage)
      : value.key === "contact"
        ? []
        : value.data.sections.map((s) => s.imageUrl);
  await withImageReferences(images, (session) =>
    ManagedContent.findOneAndUpdate(
      { key: value.key },
      { $set: { data: value.data } },
      { upsert: true, returnDocument: "after", session },
    ).lean(),
  );
  return value;
}
