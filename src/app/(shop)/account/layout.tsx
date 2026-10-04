import Link from "next/link";
import { requireUser } from "@/actions/auth.actions";
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <main className="store-shell py-8 sm:py-12">
      <p className="section-kicker">فضای شخصی شما</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">حساب کاربری</h1>
      <nav aria-label="حساب کاربری" className="my-8 flex flex-wrap gap-3">
        {[
          ["/account", "پروفایل و امنیت"],
          ["/account/addresses", "آدرس‌ها"],
          ["/account/orders", "سفارش‌های من"],
        ].map(([href, title]) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl border border-border bg-surface px-5 py-3 text-sm hover:text-primary"
          >
            {title}
          </Link>
        ))}
      </nav>
      <div className="min-w-0">{children}</div>
    </main>
  );
}
