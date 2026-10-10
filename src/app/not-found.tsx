import { PageState } from "@/components/ui/PageState";
import { toPersianDigits } from "@/lib/format";
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <PageState
        symbol={toPersianDigits(404)}
        title="صفحه یا مورد موردنظر پیدا نشد"
        description="ممکن است آدرس تغییر کرده باشد یا این مورد دیگر در دسترس نباشد. برای ادامه، به صفحهٔ اصلی یا فهرست محصولات بروید."
      />
    </main>
  );
}
