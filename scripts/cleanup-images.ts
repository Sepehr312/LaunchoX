import mongoose from "mongoose";

// Maintenance preview must not create collections or build newly declared indexes.
mongoose.set("autoCreate", false);
mongoose.set("autoIndex", false);

async function main() {
  const args = process.argv.slice(2);
  const options: { apply?: boolean; limit?: number; after?: string } = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--limit" || arg === "--after") {
      const value = args[++index];
      if (!value || value.startsWith("--"))
        throw new Error("Missing cleanup option value");
      if (arg === "--limit") options.limit = Number(value);
      else options.after = value;
    } else throw new Error("Unknown cleanup option");
  }
  try {
    const { cleanupImages } =
      await import("@/services/image-lifecycle.service");
    const result = await cleanupImages(options);
    console.log(JSON.stringify(result, null, 2));
    if (result.results.some((entry) => entry.status === "failed"))
      process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Image cleanup failed", error);
  process.exitCode = 1;
});
