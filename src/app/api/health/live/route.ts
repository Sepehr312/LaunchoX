import { getLiveness } from "@/services/health.service";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

// Liveness: always 200 while the process can answer; no database access.
export function GET() {
  return Response.json(
    { data: getLiveness() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
