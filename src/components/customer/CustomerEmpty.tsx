import Link from "next/link";
import { SnowflakeIcon } from "@/components/store/Icons";
import styles from "@/components/customer/customer.module.css";
export function CustomerEmpty({
  title,
  description,
  href,
  label,
}: {
  title: string;
  description: string;
  href?: string;
  label?: string;
}) {
  return (
    <section className={styles.empty}>
      <span className={styles.icon}>
        <SnowflakeIcon />
      </span>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="max-w-sm text-sm leading-7 text-muted">{description}</p>
      {href && (
        <Link href={href} className="checkout-link">
          {label}
        </Link>
      )}
    </section>
  );
}
