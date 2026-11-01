import Image from "next/image";
import Link from "next/link";
import { Tags } from "lucide-react";
import { BrandRowActions } from "@/components/admin/BrandRowActions";
import { toPersianDigits } from "@/lib/format";
import type { BrandDTO } from "@/types/dto";
import styles from "@/components/admin/AdminCatalogCards.module.css";

export function BrandCards({ brands }: { brands: BrandDTO[] }) {
  return (
    <ul className={styles.grid} aria-label="کارت‌های برندها">
      {brands.map((brand) => (
        <li key={brand.id}>
          <article className={styles.card}>
            <Link
              className={styles.image}
              href={`/admin/brands/${brand.id}/edit`}
              aria-label={`اطلاعات برند ${brand.name}`}
            >
              {brand.logo ? (
                <Image
                  src={brand.logo}
                  alt=""
                  width={280}
                  height={120}
                  unoptimized
                />
              ) : (
                <Tags size={40} aria-hidden="true" />
              )}
            </Link>
            <div className={styles.body}>
              <h2 className={styles.title}>
                <Link href={`/admin/brands/${brand.id}/edit`}>
                  {brand.name}
                </Link>
              </h2>
              <p className={styles.slug}>
                <bdi>{brand.slug}</bdi>
              </p>
              <dl className={styles.details}>
                <div>
                  <dt>کشور:</dt>
                  <dd>{brand.country || "ثبت نشده"}</dd>
                </div>
                <div>
                  <dt>ترتیب:</dt>
                  <dd>{toPersianDigits(brand.order)}</dd>
                </div>
              </dl>
              <div className={styles.statuses}>
                <span
                  className={
                    brand.isActive
                      ? "admin-badge admin-badge-success"
                      : "admin-badge"
                  }
                >
                  {brand.isActive ? "فعال" : "غیرفعال"}
                </span>
                {brand.isFeatured && (
                  <span className="admin-badge admin-badge-warning">ویژه</span>
                )}
              </div>
            </div>
            <footer className={styles.actions}>
              <BrandRowActions id={brand.id} name={brand.name} />
            </footer>
          </article>
        </li>
      ))}
    </ul>
  );
}
