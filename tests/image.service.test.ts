import { afterAll, beforeAll, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { startTestMongo } from "./mongo-server";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => mongoose) }));
import { uploadImage, getImage } from "@/services/image.service";
import { UploadedImage } from "@/models/uploaded-image";
import { imageFileSchema } from "@/validations/image";

let server: Awaited<ReturnType<typeof startTestMongo>>;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
beforeAll(async () => {
  server = await startTestMongo();
  await mongoose.connect(server.uri);
}, 120000);
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

it("persists image bytes under an immutable public URL without exposing binary data by default", async () => {
  const { url } = await uploadImage(
    new File([png], "image.png", { type: "image/png" }),
  );
  expect(url).toMatch(/^\/api\/images\/[a-f0-9]{24}$/);
  const id = url.split("/").at(-1)!;
  const image = await getImage(id);
  expect(image?.contentType).toBe("image/png");
  expect(Buffer.from(image!.data)).toEqual(png);
  expect((await UploadedImage.findById(id).lean())?.data).toBeUndefined();
  expect(await getImage(new mongoose.Types.ObjectId().toString())).toBeNull();
});

it("rejects fake raster images, SVG, empty files and oversized uploads", async () => {
  await expect(
    uploadImage(
      new File(["<script>alert(1)</script>"], "image.png", {
        type: "image/png",
      }),
    ),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  for (const file of [
    new File(["<svg/>"], "image.svg", { type: "image/svg+xml" }),
    new File([], "image.png", { type: "image/png" }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", {
      type: "image/png",
    }),
  ])
    expect(imageFileSchema.safeParse(file).success).toBe(false);
});
