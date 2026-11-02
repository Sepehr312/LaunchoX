import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { readContent } from "@/services/content.service";
import { getSiteSettings } from "@/services/site.service";
import { defaultSlides } from "@/lib/content-defaults";
import { contentKeySchema, type ContentInput } from "@/validations/content";
import { ContentEditor } from "@/components/admin/ContentEditor";
export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const parsed = contentKeySchema.safeParse(query.section ?? "about");
  const key = parsed.success ? parsed.data : "about";
  let initial = await readContent(key);
  if (!initial) {
    const site = await getSiteSettings();
    initial =
      key === "slides"
        ? { key, data: defaultSlides.map((s) => ({ ...s, isActive: true })) }
        : key === "contact"
          ? {
              key,
              data: {
                phone: site.phone,
                email: site.email,
                address: site.address,
              },
            }
          : ({
              key,
              data: {
                title: key === "about" ? "درباره ما" : "خدمات و پشتیبانی",
                content: "همراه شما برای انتخاب و خریدی آگاهانه.",
                isActive: true,
                sections: [],
                questions: [],
              },
            } as ContentInput);
  }
  return (
    <section className="grid gap-5 p-5">
      <h1 className="text-2xl font-bold">مدیریت محتوای فروشگاه</h1>
      <nav className="flex flex-wrap gap-4">
        {[
          ["about", "درباره ما"],
          ["services", "خدمات"],
          ["slides", "اسلایدر"],
          ["contact", "اطلاعات تماس"],
        ].map(([id, label]) => (
          <Link
            key={id}
            href={"/admin/content?section=" + id}
            aria-current={id === key ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <p>
        ترتیب نمایش مطابق ترتیب بخش‌هاست. با ذخیره، محتوای این فرم جایگزین صفحهٔ
        فعلی می‌شود.
      </p>
      <ContentEditor key={key} initial={initial} />
    </section>
  );
}
