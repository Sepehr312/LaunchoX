import Image from "next/image";
import Link from "next/link";
import { FolderTree } from "lucide-react";
import { CategoryRowActions } from "@/components/admin/CategoryRowActions";
import { toPersianDigits } from "@/lib/format";
import type { CategoryDTO } from "@/types/dto";
import styles from "@/components/admin/AdminCatalogCards.module.css";

export function CategoryCards({
  categories,
}: {
  categories: (CategoryDTO & { parentName: string })[];
}) {
  return (
    <ul className={styles.grid} aria-label="کارت‌های دسته‌بندی‌ها">
      {categories.map((category) => (
        <li key={category.id}>
          <article className={styles.card}>
            <Link
              className={styles.image}
              href={`/admin/categories/${category.id}/edit`}
              aria-label={`ویرایش دسته‌بندی ${category.name}`}
            >
              {category.image ? (
                <Image
                  src={category.image}
                  alt=""
                  width={280}
                  height={120}
                  unoptimized
                />
              ) : (
                <FolderTree size={40} aria-hidden="true" />
              )}
            </Link>
            <div className={styles.body}>
              <h2 className={styles.title}>
                <Link href={`/admin/categories/${category.id}/edit`}>
                  {category.name}
                </Link>
              </h2>
              <p className={styles.slug}>
                <bdi>{category.slug}</bdi>
              </p>
              <dl className={styles.details}>
                <div>
                  <dt>والد:</dt>
                  <dd>{category.parentName}</dd>
                </div>
                <div>
                  <dt>ترتیب:</dt>
                  <dd>{toPersianDigits(category.order)}</dd>
                </div>
              </dl>
              <div className={styles.statuses}>
                <span
                  className={
                    category.isActive
                      ? "admin-badge admin-badge-success"
                      : "admin-badge"
                  }
                >
                  {category.isActive ? "فعال" : "غیرفعال"}
                </span>
              </div>
            </div>
            <footer className={styles.actions}>
              <CategoryRowActions id={category.id} name={category.name} />
            </footer>
          </article>
        </li>
      ))}
    </ul>
  );
}
