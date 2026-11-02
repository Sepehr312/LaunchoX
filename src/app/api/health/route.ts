import { getHealth } from "@/services/health.service";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

// Readiness: 200 only when the database is reachable, 503 otherwise.
export async function GET() {
  try {
    const data = await getHealth();
    return Response.json(
      { data },
      { status: data.db === "up" ? 200 : 503, headers },
    );
  } catch {
    console.error("Health check configuration failed");
    return Response.json(
      { error: "تنظیمات سرور نامعتبر است" },
      { status: 500, headers },
    );
  }
}
