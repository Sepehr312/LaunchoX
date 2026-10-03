import { NextRequest, NextResponse } from "next/server";
import { listProducts } from "@/services/product.service";
import { productQuerySchema } from "@/validations/product";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = productQuerySchema.safeParse({
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
    category: params.get("category") ?? undefined,
    q: params.get("q") ?? undefined,
    minPrice: params.get("minPrice") ?? undefined,
    maxPrice: params.get("maxPrice") ?? undefined,
    sort: params.get("sort") ?? undefined,
    inStock: params.get("inStock") ?? undefined,
  });
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "پارامترهای درخواست معتبر نیست",
      },
      { status: 400 },
    );
  try {
    return NextResponse.json({ data: await listProducts(parsed.data) });
  } catch (error) {
    console.error("Public product API failed", error);
    return NextResponse.json(
      { error: "خطایی رخ داد، دوباره تلاش کنید" },
      { status: 500 },
    );
  }
}
