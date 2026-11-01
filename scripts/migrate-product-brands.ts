import mongoose from "mongoose";
import { getEnv } from "@/lib/env";
import {
  migrateProductBrands,
  parseBrandMigrationArgs,
} from "@/services/brand-migration.service";

async function main() {
  const options = parseBrandMigrationArgs(process.argv.slice(2));
  const connection = await mongoose
    .createConnection(getEnv().MONGODB_URI, {
      autoIndex: false,
      autoCreate: false,
      serverSelectionTimeoutMS: 5000,
    })
    .asPromise();
  try {
    if (!connection.db) throw new Error("Database connection unavailable");
    const summary = await migrateProductBrands(
      connection.db,
      options,
      (event) => {
        console.log(JSON.stringify({ type: "product", ...event }));
      },
    );
    console.log(JSON.stringify({ type: "summary", ...summary }));
    if (
      summary.errors ||
      summary.concurrentChanges ||
      summary.conflicts ||
      summary.invalidReferences ||
      summary.unknown ||
      summary.ambiguous
    )
      process.exitCode = 2;
  } finally {
    await connection.close();
  }
}

void main().catch((error: unknown) => {
  console.error(
    "Brand migration failed",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
