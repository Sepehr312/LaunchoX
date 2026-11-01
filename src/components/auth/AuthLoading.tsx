import { PremiumAuthHeading } from "@/components/auth/PremiumAuthHeading";
import { PremiumAuthLayout } from "@/components/auth/PremiumAuthLayout";
import styles from "@/components/auth/premium-auth.module.css";
import guidanceStyles from "@/components/customer/password-guidance.module.css";

export function AuthLoading({ register = false }: { register?: boolean }) {
  const fields = register
    ? ["نام و نام خانوادگی", "ایمیل", "رمز عبور", "تکرار رمز عبور"]
    : ["ایمیل", "رمز عبور"];

  return (
    <PremiumAuthLayout register={register}>
      <section
        className={styles.card}
        aria-busy="true"
        aria-label={register ? "فرم ثبت‌نام" : "فرم ورود"}
      >
        <PremiumAuthHeading register={register} />
        <p role="status" className="sr-only">
          {register
            ? "در حال آماده‌سازی فرم ثبت‌نام…"
            : "در حال آماده‌سازی فرم ورود…"}
        </p>
        <div className={styles.loadingForm} aria-hidden="true">
          {fields.map((label, index) => (
            <div key={label} className="grid gap-2">
              <div className={styles.loadingLabel}>
                <span className={styles.skeleton}>{label}</span>
              </div>
              <div className={`${styles.skeleton} ${styles.loadingInput}`} />
              {register && index === fields.length - 1 && (
                <div className={guidanceStyles.grid}>
                  {fields.map((field) => (
                    <div key={field} className="flex h-4.5 items-center gap-2">
                      <span
                        className={`${styles.skeleton} size-4 shrink-0 rounded-full`}
                      />
                      <span
                        className={`${styles.skeleton} h-2.5 w-20 max-w-full rounded-full`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!register && (
            <div className={styles.loadingOptions}>
              <div className="flex items-center gap-2">
                <span className={`${styles.skeleton} size-4 rounded`} />
                <span className={`${styles.skeleton} h-3 w-28 rounded-full`} />
              </div>
              <span
                className={`${styles.skeleton} ms-6 h-2.5 w-40 max-w-full rounded-full`}
              />
            </div>
          )}
          <div className={`${styles.skeleton} ${styles.loadingSubmit}`} />
        </div>
        <p className={styles.loadingFooter} aria-hidden="true">
          {register ? "قبلاً حساب کاربری دارید؟ " : "حساب کاربری ندارید؟ "}
          <span className="font-semibold text-primary">
            {register ? "وارد شوید" : "ثبت‌نام کنید"}
          </span>
        </p>
      </section>
    </PremiumAuthLayout>
  );
}
