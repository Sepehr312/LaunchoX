import "server-only";

import { connectDB } from "@/lib/db";
import { getEnv } from "@/lib/env";

const DB_PING_TIMEOUT_MS = 3000;

export type HealthStatus = "ok" | "degraded";

export interface Health {
  status: HealthStatus;
  db: "up" | "down";
}

// Liveness: the process is running. Never touches the database, so a DB
// outage does not make an orchestrator restart a healthy server.
export function getLiveness(): { status: "ok" } {
  return { status: "ok" };
}

// Readiness: the app can serve traffic, which requires a working database.
export async function getHealth(): Promise<Health> {
  // Configuration errors are not database outages.
  getEnv();

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const ping = (async () => {
      const mongoose = await connectDB();
      if (!mongoose.connection.db) throw new Error("no database handle");
      await mongoose.connection.db.admin().ping();
    })();
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("database ping timed out")),
        DB_PING_TIMEOUT_MS,
      );
    });
    // Avoid an unhandled rejection if the ping fails after the timeout wins.
    ping.catch(() => undefined);
    await Promise.race([ping, timeout]);
    return { status: "ok", db: "up" };
  } catch {
    return { status: "degraded", db: "down" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
