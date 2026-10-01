import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { formatDate, formatPrice, toPersianDigits } from "@/lib/format";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10 text-start sm:py-16">
      <header className="space-y-4">
        <Badge>لانچ‌اوکس · مرحلهٔ {toPersianDigits(2)}</Badge>
        <h1 className="text-3xl leading-relaxed font-bold sm:text-4xl">
          ساده، خوانا و فارسی
        </h1>
        <p className="max-w-2xl leading-8 text-muted">
          نمونه‌ای از رنگ‌ها، نوشتار و اجزای پایهٔ رابط کاربری؛ با چیدمان
          راست‌به‌چپ و قلم وزیرمتن. رنگ‌ها با حالت روشن یا تاریک دستگاه هماهنگ
          می‌شوند.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card aria-labelledby="format-heading" className="space-y-6">
          <h2 id="format-heading" className="text-xl font-semibold">
            قیمت، تاریخ و اعداد
          </h2>
          <dl className="space-y-5">
            <div className="space-y-1">
              <dt className="text-sm text-muted">قیمت نمونه</dt>
              <dd className="text-2xl font-bold text-primary">
                {formatPrice(1250000)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted">تاریخ شمسی</dt>
              <dd>
                <time dateTime="2024-03-20T12:00:00Z">
                  {formatDate("2024-03-20T12:00:00Z")}
                </time>
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted">ارقام فارسی</dt>
              <dd>{toPersianDigits("0123456789")}</dd>
            </div>
          </dl>
        </Card>

        <Card aria-labelledby="components-heading" className="space-y-6">
          <h2 id="components-heading" className="text-xl font-semibold">
            ورودی و دکمه‌ها
          </h2>
          <form className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="sample-name"
                className="block text-sm font-medium"
              >
                نام نمونه
              </label>
              <Input
                id="sample-name"
                defaultValue="لانچ‌اوکس"
                aria-describedby="sample-help"
                autoComplete="off"
              />
              <p id="sample-help" className="text-sm leading-6 text-muted">
                متن را تغییر دهید؛ دکمهٔ بازنشانی مقدار اولیه را برمی‌گرداند.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="reset">بازنشانی نمونه</Button>
              <Button variant="secondary" disabled>
                دکمهٔ غیرفعال
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Card aria-labelledby="status-heading" className="space-y-4">
        <h2 id="status-heading" className="text-xl font-semibold">
          رنگ‌های وضعیت
        </h2>
        <div className="flex flex-wrap gap-3">
          <Badge>رنگ اصلی</Badge>
          <Badge tone="success">موفق</Badge>
          <Badge tone="danger">خطا</Badge>
        </div>
        <p className="text-sm leading-7 text-muted">
          این نشان‌ها فقط نمونهٔ نمایش رنگ‌های رابط کاربری هستند.
        </p>
      </Card>
    </main>
  );
}
