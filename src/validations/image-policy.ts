export const IMAGE_POLICY = {
  maxFileBytes: 5 * 1024 * 1024,
  maxRequestBytes: 6 * 1024 * 1024,
  maxDimension: 8192,
  maxPixels: 16_000_000,
  maxFrames: 60,
  graceMs: 24 * 60 * 60 * 1000,
  maxCleanupBatch: 100,
  mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
} as const;

export const imageSizeMessage = "حجم تصویر باید حداکثر ۵ مگابایت باشد";
