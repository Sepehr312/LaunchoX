import "server-only";
import { AppError } from "@/lib/errors";
import { prepareAboutPage } from "@/lib/about-page";
import { applyAboutMutation } from "@/lib/about-mutation";
import { defaultAboutPage } from "@/lib/about-defaults";
import { aboutMutationSchema } from "@/validations/about-sections";
import PageContent from "@/models/page-content";
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

// Compare the stored document so independently saved sections cannot overwrite newer edits.
export async function mutateAboutSection(input: unknown) {
  const mutation = aboutMutationSchema.parse(input);
  await connectDB();
  for (let attempt = 0; attempt < 3; attempt++) {
    const stored = await ManagedContent.findOne({ key: "about" }).lean();
    const content = stored
      ? contentSchema.parse({ key: "about", data: stored.data })
      : await readContent("about");
    if (content && content.key !== "about")
      throw new AppError("محتوا معتبر نیست", "VALIDATION");
    const page = applyAboutMutation(
      prepareAboutPage(content?.data ?? defaultAboutPage),
      mutation,
    );
    const data = contentSchema.parse({ key: "about", data: page }).data;
    try {
      const saved = await withImageReferences(
        page.sections.map((section) => section.imageUrl),
        async (session) => {
          if (!stored) {
            await ManagedContent.create([{ key: "about", data }], { session });
            return true;
          }
          const result = await ManagedContent.updateOne(
            { _id: stored._id, data: stored.data },
            { $set: { data } },
            { session },
          );
          return result.matchedCount === 1;
        },
      );
      if (saved) return prepareAboutPage(page);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === 11000))
        throw error;
    }
  }
  throw new AppError(
    "محتوا هم‌زمان تغییر کرده است؛ دوباره تلاش کنید.",
    "VALIDATION",
  );
}
