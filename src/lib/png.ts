import "server-only";

import { AppError } from "@/lib/errors";

export function validateStaticPng(data: Buffer): void {
  let offset = 8;
  let chunks = 0;
  let hasPixels = false;
  const invalid = () =>
    new AppError("ساختار تصویر PNG ناقص یا نامعتبر است", "VALIDATION");
  while (offset < data.length) {
    if (data.length - offset < 12) throw invalid();
    const length = data.readUInt32BE(offset);
    if (length > data.length - offset - 12) throw invalid();
    const type = data.toString("latin1", offset + 4, offset + 8);
    if (!/^[A-Za-z]{4}$/.test(type)) throw invalid();
    if (chunks === 0 && (type !== "IHDR" || length !== 13)) throw invalid();
    if (chunks > 0 && type === "IHDR") throw invalid();
    if (["acTL", "fcTL", "fdAT"].includes(type))
      throw new AppError(
        "تصویر PNG متحرک (APNG) پشتیبانی نمی‌شود",
        "VALIDATION",
      );
    offset += length + 12;
    chunks++;
    if (type === "IDAT") hasPixels = true;
    if (type === "IEND") {
      if (length !== 0 || !hasPixels || offset !== data.length) throw invalid();
      return;
    }
  }
  throw invalid();
}
