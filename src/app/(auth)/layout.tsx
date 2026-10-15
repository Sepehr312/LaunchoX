import styles from "@/components/customer/customer.module.css";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className={`${styles.scope} ${styles.auth}`}>{children}</main>;
}
