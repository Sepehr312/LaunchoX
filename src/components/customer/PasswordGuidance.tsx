import { toPersianDigits } from "@/lib/format";
export function PasswordGuidance({
  password,
  confirmation,
}: {
  password: string;
  confirmation: string;
}) {
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
