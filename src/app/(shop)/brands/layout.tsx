import styles from "@/components/store/BrandsListing.module.css";

export default function BrandsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={styles.page}>{children}</div>;
}
