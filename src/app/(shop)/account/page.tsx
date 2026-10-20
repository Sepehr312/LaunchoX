import { getEnv } from "@/lib/env";
import { toPersianDigits } from "@/lib/format";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/actions/auth.actions";
import { getProfile } from "@/services/user.service";
import { AccountForm } from "@/components/account/AccountForm";
import { CustomerField } from "@/components/customer/CustomerField";
import { ShieldIcon, UserIcon } from "@/components/store/Icons";
import styles from "@/components/customer/customer.module.css";
export const metadata: Metadata = {
  title: `پروفایل و امنیت | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};
export default async function AccountPage() {
  const session = await requireUser();
  if (session.role === "admin") redirect("/admin");
  const user = await getProfile(session.id);
  return (
    <div className={styles.profile}>
      <header>
        <p className="section-kicker">فضای شخصی شما</p>
        <h2 className="mt-2 text-2xl font-bold">پروفایل و امنیت</h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          اطلاعات شخصی و رمز عبور خود را مدیریت کنید.
        </p>
      </header>
      <div className="grid items-start gap-5">
        <section className="checkout-panel">
          <span className={styles.icon}>
            <UserIcon />
          </span>
          <h3 className="mt-5 mb-2 text-lg font-bold">اطلاعات شخصی</h3>
          <p className="mb-6 text-sm text-muted">
            برای ارسال سفارش، اطلاعاتتان را به‌روز نگه دارید.
          </p>
          <div className="mb-6 grid gap-2 rounded-xl border border-border bg-background p-4">
            <span className="text-xs text-muted">
              ایمیل حساب (غیرقابل ویرایش)
            </span>
            <span dir="ltr" className="text-start text-sm break-all">
              {user.email}
            </span>
          </div>
          <AccountForm operation="profile">
            <CustomerField
              name="name"
              label="نام و نام خانوادگی"
              defaultValue={user.name}
              required
              autoComplete="name"
            />
            <CustomerField
              name="mobile"
              label="شمارهٔ موبایل"
              defaultValue={
                user.mobile ? toPersianDigits(user.mobile) : undefined
              }
              inputMode="tel"
              autoComplete="tel"
              hint="اختیاری؛ شمارهٔ ۱۱ رقمی با شروع ۰۹"
            />
          </AccountForm>
        </section>
        <details className="checkout-panel">
          <summary className="font-semibold">
            <span className="flex items-center gap-3">
              <ShieldIcon className="size-5 text-primary" />
              تغییر رمز عبور
            </span>
          </summary>
          <div className="mt-5 border-t border-border pt-5">
            <p className="mb-6 text-sm leading-7 text-muted">
              رمز جدید حداقل ۸ کاراکتر و شامل حرف و عدد باشد.
            </p>
            <AccountForm operation="password" label="ذخیرهٔ رمز جدید">
              {[
                ["currentPassword", "رمز عبور فعلی"],
                ["password", "رمز عبور جدید"],
                ["confirmPassword", "تکرار رمز عبور جدید"],
              ].map(([name, label]) => (
                <CustomerField
                  key={name}
                  name={name}
                  label={label}
                  type="password"
                  required
                  autoComplete={
                    name === "currentPassword"
                      ? "current-password"
                      : "new-password"
                  }
                />
              ))}
            </AccountForm>
          </div>
        </details>
      </div>
    </div>
  );
}
