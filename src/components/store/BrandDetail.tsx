"use client";

import Image from "next/image";
import { useState } from "react";
import { Snowflake } from "lucide-react";
import { toPersianDigits } from "@/lib/format";
import type { StoreBrandDetailDTO } from "@/types/dto";
import styles from "./BrandDetail.module.css";

export function BrandHero({ brand }: { brand: StoreBrandDetailDTO }) {
  const [failedLogo, setFailedLogo] = useState<string>();
  return (
    <section className={styles.hero} aria-labelledby="products-title">
      <div className={styles.logo}>
        {brand.logo && failedLogo !== brand.logo ? (
          <Image
            src={brand.logo}
            alt={`لوگوی ${brand.name}`}
            width={112}
            height={80}
            sizes="112px"
            onError={() => setFailedLogo(brand.logo)}
          />
        ) : (
          <Snowflake size={40} aria-hidden="true" />
        )}
      </div>
      <div className={styles.info}>
        <p className={styles.eyebrow}>محصولات برند</p>
        <h1 id="products-title">{brand.name}</h1>
        {brand.description && (
          <p className={styles.summary}>{brand.description}</p>
        )}
        <span className={styles.count}>
          {toPersianDigits(brand.productCount)} محصول
        </span>
      </div>
    </section>
  );
}

export function BrandAbout({ brand }: { brand: StoreBrandDetailDTO }) {
  if (!brand.description) return null;
  const long = brand.description.length > 300;
  return (
    <section className={styles.about} aria-labelledby="brand-about-title">
      <h2 id="brand-about-title">درباره {brand.name}</h2>
      {long ? (
        <>
          <p>{brand.description.slice(0, 300)}…</p>
          <details>
            <summary>مشاهده بیشتر</summary>
            <p>{brand.description.slice(300)}</p>
          </details>
        </>
      ) : (
        <p>{brand.description}</p>
      )}
    </section>
  );
}
