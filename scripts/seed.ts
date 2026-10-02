import mongoose from "mongoose";
import { getEnv } from "@/lib/env";
import { connectDB } from "@/lib/db";
import { parseSeedOptions, seedDatabase } from "./seed-runner";

async function main() {
  try {
    const options = parseSeedOptions(process.argv.slice(2), getEnv());
    await connectDB();
    const summary = await seedDatabase(options);
    console.log("Seed completed:", summary);
    console.log(`Admin login: ${options.email} / ${options.password}`);
  } catch {
    console.error(
      "Seed failed. Check configuration, flags and database availability. Production requires --force.",
    );
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

void main();
