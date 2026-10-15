import { notFound, redirect } from "next/navigation";
import { listBrands } from "@/services/brand.service";
import { slugSchema } from "@/validations/common";

export const dynamic = "force-dynamic";

export default async function BrandDestination({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  let slug: string;
  try {
    slug = decodeURIComponent((await params).slug);
  } catch {
    notFound();
  }
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) notFound();
  const brand = (await listBrands()).find(
    (item) => item.isActive && item.slug === parsed.data,
  );
  if (!brand) notFound();
  redirect(`/products?${new URLSearchParams({ brands: brand.name })}`);
}
