import { getHealth } from "@/services/health.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getHealth();
    return Response.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("Health check configuration failed");
    return Response.json(
      { error: "تنظیمات سرور نامعتبر است" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
