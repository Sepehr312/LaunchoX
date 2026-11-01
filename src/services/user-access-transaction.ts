import "server-only";
import type { ClientSession } from "mongoose";
import { connectDB } from "@/lib/db";
import { Counter } from "@/models/counter";

export async function withUserAccessTransaction<T>(
  work: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const db = await connectDB();
  await Counter.updateOne(
    { _id: "user-access" },
    { $setOnInsert: { seq: 0 } },
    { upsert: true },
  ).catch((error: unknown) => {
    if (!(
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ))
      throw error;
  });
  return db.connection.transaction(
    async (session) => {
      // All panel and maintenance mutations share this write to prevent snapshot write skew.
      await Counter.updateOne(
        { _id: "user-access" },
        { $inc: { seq: 1 } },
        { session },
      );
      return work(session);
    },
    {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
      readPreference: "primary",
    },
  );
}
