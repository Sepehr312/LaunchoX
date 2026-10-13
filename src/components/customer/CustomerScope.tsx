import styles from "@/components/customer/customer.module.css";
export function CustomerScope({ children }: { children: React.ReactNode }) {
  return <div className={styles.scope}>{children}</div>;
}
