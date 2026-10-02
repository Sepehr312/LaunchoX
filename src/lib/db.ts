import "server-only";
import mongoose from "mongoose";
import { getEnv } from "@/lib/env";

declare global {
  var launchoxMongoosePromise: Promise<typeof mongoose> | undefined;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (!globalThis.launchoxMongoosePromise) {
    globalThis.launchoxMongoosePromise = mongoose
      .connect(getEnv().MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      })
      .catch((error: unknown) => {
        // A failed initial connection must not poison subsequent requests.
        globalThis.launchoxMongoosePromise = undefined;
        throw error;
      });
  }
  return globalThis.launchoxMongoosePromise;
}
