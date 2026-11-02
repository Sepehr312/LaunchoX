import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readContent, saveContent } from "@/services/content.service";
import { revalidatePath } from "next/cache";
import { z } from "zod";
const slugSchema = z
  .enum(["about", "about-us", "services"])
  .transform((s) => (s === "about-us" ? "about" : s));
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const slug = slugSchema.safeParse((await params).slug);
  if (!slug.success)
    return NextResponse.json({ error: "صفحه پیدا نشد" }, { status: 404 });
  const result = await readContent(slug.data);
  if (
    !result ||
    result.key === "contact" ||
    result.key === "slides" ||
    !result.data.isActive
  )
    return NextResponse.json({ error: "صفحه پیدا نشد" }, { status: 404 });
  return NextResponse.json(result.data);
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  await requireAdmin();
  try {
    const key = slugSchema.parse((await params).slug);
    const data = await request.json();
    const saved = await saveContent({ key, data });
    revalidatePath("/", "layout");
    return NextResponse.json(saved.data);
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return NextResponse.json({ error: "محتوا معتبر نیست" }, { status: 400 });
    return NextResponse.json({ error: "ذخیره انجام نشد" }, { status: 500 });
  }
}
