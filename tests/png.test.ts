import { expect, it, vi } from "vitest";
import sharp from "sharp";
vi.mock("server-only", () => ({}));
import { validateStaticPng } from "@/lib/png";
import { staticPng, animatedPng, pngChunk } from "./png-fixtures";

it("accepts valid static PNG and ignores animation-like bytes inside ordinary chunks", async () => {
  const data = Buffer.concat([
    staticPng.subarray(0, 33),
    pngChunk("tEXt", Buffer.from("Comment\0acTL fcTL fdAT")),
    staticPng.subarray(33),
  ]);
  expect(() => validateStaticPng(data)).not.toThrow();
  await expect(sharp(data).raw().toBuffer()).resolves.toBeInstanceOf(Buffer);
});
it.each([1, 2, 61])("rejects APNG containing %i frames", (frames) => {
  expect(() => validateStaticPng(animatedPng(frames))).toThrow("APNG");
});
it("rejects APNG with corrupt later pixel data", () => {
  expect(() => validateStaticPng(animatedPng(2, true))).toThrow("APNG");
});
it.each(["fcTL", "fdAT"])(
  "rejects animation chunk %s even without acTL",
  (type) => {
    const data = Buffer.concat([
      staticPng.subarray(0, 33),
      pngChunk(type, Buffer.alloc(26)),
      staticPng.subarray(33),
    ]);
    expect(() => validateStaticPng(data)).toThrow("APNG");
  },
);
it("rejects truncated, overflowing, missing-end and duplicate-header chunks", () => {
  const overflow = Buffer.from(staticPng);
  overflow.writeUInt32BE(0xffffffff, 33);
  for (const data of [
    staticPng.subarray(0, 34),
    staticPng.subarray(0, -12),
    overflow,
    Buffer.concat([staticPng.subarray(0, 33), staticPng.subarray(8)]),
  ])
    expect(() => validateStaticPng(data)).toThrow();
});
