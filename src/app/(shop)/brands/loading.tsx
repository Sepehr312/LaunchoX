import styles from "@/components/store/BrandsListing.module.css";

export default function BrandsLoading() {
  return (
    <main
      className={styles.shell}
      aria-busy="true"
      aria-label="در حال بارگذاری برندها"
    >
      <div className={styles.empty}>
        <p role="status">در حال دریافت برندهای فروشگاه…</p>
      </div>
      <div className={styles.grid} aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className={`${styles.card} loading-skeleton`} />
        ))}
      </div>
    </main>
  );
}
