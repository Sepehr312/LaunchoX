"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./about.module.css";

export function AboutReveal({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-revealed", "true");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08 },
    );
    root.current
      ?.querySelectorAll("[data-about-reveal]")
      .forEach((section) => observer.observe(section));
    const stopMotion = () => {
      if (motion.matches) observer.disconnect();
    };
    motion.addEventListener("change", stopMotion);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", stopMotion);
    };
  }, []);

  return (
    <div ref={root} className={styles.reveals}>
      {children}
    </div>
  );
}
