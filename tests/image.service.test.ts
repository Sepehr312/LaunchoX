import { afterAll, beforeAll, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import sharp from "sharp";
import { startTestMongo } from "./mongo-server";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => mongoose) }));
import { uploadImage, getImage } from "@/services/image.service";
import { UploadedImage } from "@/models/uploaded-image";
import { imageFileSchema } from "@/validations/image";
import { animatedPng } from "./png-fixtures";

let server: Awaited<ReturnType<typeof startTestMongo>>;
const corruptPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
let png: Buffer;
beforeAll(async () => {
  png = await sharp({
    create: { width: 2, height: 2, channels: 4, background: "white" },
  })
    .png()
    .toBuffer();
  server = await startTestMongo();
  await mongoose.connect(server.uri);
}, 120000);
afterAll(async () => {
  await mongoose.disconnect();
  await server?.stop();
});

it("persists image bytes under an immutable public URL without exposing binary data by default", async () => {
  const { url } = await uploadImage(
    new File([new Uint8Array(png)], "image.png", { type: "image/png" }),
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

it.each([1, 2, 61])(
  "rejects APNG with %i frames before storage",
  async (frames) => {
    const before = await UploadedImage.countDocuments();
    await expect(
      uploadImage(
        new File([new Uint8Array(animatedPng(frames))], "animated.png", {
          type: "image/png",
        }),
      ),
    ).rejects.toThrow("APNG");
    expect(await UploadedImage.countDocuments()).toBe(before);
  },
);

it("rejects corrupt pixel data, truncated files, MIME spoofing and oversized dimensions without inserting data", async () => {
  const before = await UploadedImage.countDocuments();
  const huge = await sharp({
    create: { width: 8193, height: 1, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  for (const data of [
    corruptPng,
    png.subarray(0, 40),
    huge,
    Buffer.concat([png.subarray(0, 8), Buffer.from("fake executable")]),
  ]) {
    await expect(
      uploadImage(
        new File([new Uint8Array(data)], "image.png", { type: "image/png" }),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  }
  await expect(
    uploadImage(
      new File([new Uint8Array(png)], "image.jpg", { type: "image/jpeg" }),
    ),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  expect(await UploadedImage.countDocuments()).toBe(before);
});

it.each(["jpeg", "webp", "gif"] as const)(
  "decodes and preserves valid %s uploads",
  async (format) => {
    const data = await sharp(png).toFormat(format).toBuffer();
    const { url } = await uploadImage(
      new File([new Uint8Array(data)], "../../unsafe." + format, {
        type: "image/" + format,
      }),
    );
    expect(Buffer.from((await getImage(url.split("/").at(-1)!))!.data)).toEqual(
      data,
    );
  },
);

it("leaves no partial record after a storage failure", async () => {
  const before = await UploadedImage.countDocuments();
  const write = vi
    .spyOn(UploadedImage, "create")
    .mockRejectedValueOnce(new Error("storage unavailable"));
  await expect(
    uploadImage(
      new File([new Uint8Array(png)], "image.png", { type: "image/png" }),
    ),
  ).rejects.toThrow("storage unavailable");
  write.mockRestore();
  expect(await UploadedImage.countDocuments()).toBe(before);
});

it.each(["gif", "webp"] as const)(
  "rejects more than 60 real %s frames",
  async (format) => {
    const frames = await Promise.all(
      Array.from({ length: 61 }, (_, index) =>
        sharp({
          create: {
            width: 2,
            height: 2,
            channels: 4,
            background: { r: index * 4, g: 0, b: 0, alpha: 1 },
          },
        })
          .png()
          .toBuffer(),
      ),
    );
    const joined = sharp(frames, { join: { animated: true } });
    const data = await (
      format === "webp"
        ? joined.webp({ lossless: true })
        : joined.gif({
            keepDuplicateFrames: true,
            interFrameMaxError: 0,
            interPaletteMaxError: 0,
          })
    ).toBuffer();
    expect((await sharp(data, { animated: true }).metadata()).pages).toBe(61);
    await expect(
      uploadImage(
        new File([new Uint8Array(data)], `animated.${format}`, {
          type: `image/${format}`,
        }),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  },
);
