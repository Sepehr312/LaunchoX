import "server-only";
import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";

export async function getHealth(): Promise<{
  status: "ok";
  db: "up" | "down";
}> {
  // Configuration errors are not database outages.
  getEnv();
  try {
    const mongoose = await connectDB();
    if (!mongoose.connection.db) return { status: "ok", db: "down" };
    await mongoose.connection.db.admin().ping();
    return { status: "ok", db: "up" };
  } catch {
    return { status: "ok", db: "down" };
  }
}
