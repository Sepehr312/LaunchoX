import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth.actions";
import styles from "@/components/customer/customer.module.css";
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/account");
  return <main className={`${styles.scope} ${styles.auth}`}>{children}</main>;
}
