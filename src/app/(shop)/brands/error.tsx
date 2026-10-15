"use client";

import { Button } from "@/components/ui/Button";
import styles from "@/components/store/BrandsListing.module.css";

export default function BrandsError({ reset }: { reset: () => void }) {
  return (
    <main className={styles.shell}>
      <div className={styles.empty} role="alert">
        <h1>برندها بارگذاری نشدند</h1>
        <p>دریافت اطلاعات ممکن نشد. لطفاً دوباره تلاش کن.</p>
        <Button onClick={reset}>تلاش دوباره</Button>
      </div>
    </main>
  );
}
