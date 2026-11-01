import { toPersianDigits } from "@/lib/format";
import { Circle, Snowflake } from "lucide-react";
import styles from "@/components/customer/password-guidance.module.css";
export function PasswordGuidance({
  password,
  confirmation,
  appearance = "default",
}: {
  password: string;
  confirmation: string;
  appearance?: "default" | "premium";
}) {
  if (appearance === "premium") {
    const rules = [
      {
        label: `حداقل ${toPersianDigits(8)} کاراکتر`,
        passed: password.length >= 8,
      },
      { label: "حداقل یک حرف", passed: /\p{L}/u.test(password) },
      { label: "حداقل یک عدد", passed: /\p{N}/u.test(password) },
      {
        label: "تطابق رمز عبور",
        passed:
          Boolean(password) &&
          Boolean(confirmation) &&
          password === confirmation,
      },
    ];
    return (
      <ul aria-label="شرایط رمز عبور" dir="rtl" className={styles.grid}>
        {rules.map(({ label, passed }) => {
          const Icon = passed ? Snowflake : Circle;
          return (
            <li key={label} className={passed ? styles.passed : styles.pending}>
              <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>
                {label}
                <span className="sr-only">
                  {passed ? "؛ برقرار است" : "؛ هنوز برقرار نیست"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    );
  }
  const rules = [
    {
      label: `حداقل ${toPersianDigits(8)} کاراکتر`,
      passed: password.length >= 8,
    },
    {
      label: "شامل حرف و عدد",
      passed: /\p{L}/u.test(password) && /\p{N}/u.test(password),
    },
    {
      label: `حداکثر ${toPersianDigits(72)} بایت`,
      passed:
        Boolean(password) && new TextEncoder().encode(password).length <= 72,
    },
    {
      label: "تکرار رمز یکسان است",
      passed: Boolean(password) && password === confirmation,
    },
  ];
  return (
    <ul
      aria-label="شرایط رمز عبور"
      className="grid gap-2 text-xs sm:grid-cols-2"
    >
      {rules.map((rule) => (
        <li
          key={rule.label}
          className={`flex items-center gap-2 ${rule.passed ? "text-success" : "text-muted"}`}
        >
          <svg
            className="size-4 shrink-0"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            {rule.passed ? (
              <path d="m4 10 4 4 8-8" />
            ) : (
              <circle cx="10" cy="10" r="6" />
            )}
          </svg>
          <span>
            {rule.label}
            <span className="sr-only">
              {rule.passed ? "؛ برقرار است" : "؛ هنوز برقرار نیست"}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
