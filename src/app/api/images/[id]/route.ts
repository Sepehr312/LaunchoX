import { objectIdSchema } from "@/validations/common";
import { getImage } from "@/services/image.service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const parsed = objectIdSchema.safeParse((await context.params).id);
  if (!parsed.success)
    return Response.json({ error: "شناسه تصویر معتبر نیست" }, { status: 400 });
  const image = await getImage(parsed.data);
  if (!image)
    return Response.json({ error: "تصویر پیدا نشد" }, { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(image.data.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
