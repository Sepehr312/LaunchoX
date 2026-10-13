"use client";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CustomerScope } from "@/components/customer/CustomerScope";
import styles from "@/components/customer/customer.module.css";
export function CustomerError({ reset }: { reset: () => void }) {
  return (
    <CustomerScope>
      <section className="store-shell py-12">
        <div className={styles.empty}>
          <h2 className="text-xl font-bold">دریافت اطلاعات ممکن نشد</h2>
          <p className="text-sm leading-7 text-muted">
            لطفاً دوباره تلاش کنید. اگر مشکل ادامه داشت، کمی بعد بازگردید.
          </p>
          <Button onClick={reset}>تلاش دوباره</Button>
          <Link href="/" className="text-sm text-primary">
            بازگشت به فروشگاه
          </Link>
        </div>
      </section>
    </CustomerScope>
  );
}
