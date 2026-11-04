import { toPersianDigits } from "@/lib/format";
import type { SectionTemplate } from "@/validations/about-sections";
import styles from "./AboutEditor.module.css";

export function TemplatePreview({ type }: { type: SectionTemplate }) {
  return (
    <div
      className={`${styles.templatePreview} ${styles[type]}`}
      aria-hidden="true"
    >
      {type === "introduction" || type === "story" ? (
        <>
          <div className={styles.mockImage}>
            <span>❄</span>
          </div>
          <div className={styles.mockText}>
            <b />
            <span />
            <span />
            <span />
            {type === "introduction" && <em />}
          </div>
        </>
      ) : type === "values" ? (
        Array.from({ length: 4 }, (_, i) => (
          <div className={styles.mockCard} key={i}>
            <b>◇</b>
            <span />
            <span />
          </div>
        ))
      ) : type === "steps" ? (
        [1, 2, 3].map((number) => (
          <div className={styles.mockCard} key={number}>
            <b>{toPersianDigits(number)}</b>
            <span />
            <span />
          </div>
        ))
      ) : type === "faq" ? (
        [1, 2, 3].map((number) => (
          <div className={styles.mockQuestion} key={number}>
            <span />⌄
          </div>
        ))
      ) : (
        <>
          {["تلفن", "ایمیل", "نشانی"].map((label) => (
            <div className={styles.mockCard} key={label}>
              <b>◇</b>
              <small>{label}</small>
              <span />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
