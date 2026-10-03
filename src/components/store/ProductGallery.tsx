"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  return (
    <div className="product-gallery">
      <div className="product-gallery-main">
        <Image
          src={images[active]}
          alt={`${title}، تصویر ${active + 1}`}
          fill
          priority
          sizes="(max-width: 1023px) 100vw, 50vw"
          className="object-contain p-3"
        />
      </div>
      {images.length > 1 && (
        <div className="product-thumbnails" aria-label="تصاویر محصول">
          {images.map((image, index) => (
            <button
              type="button"
              key={image}
              className={cn(index === active && "active")}
              onClick={() => setActive(index)}
              aria-label={`نمایش تصویر ${index + 1}`}
            >
              <Image
                src={image}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
