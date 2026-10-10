import { getEnv } from "@/lib/env";
import { toPersianDigits } from "@/lib/format";
import type { Metadata } from "next";
import { requireUser, logoutAction } from "@/actions/auth.actions";
import { getProfile } from "@/services/user.service";
import { AccountForm } from "@/components/account/AccountForm";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
export const metadata: Metadata = {
  title: `پروفایل و امنیت | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};
export default async function AccountPage() {
  const session = await requireUser();
  const user = await getProfile(session.id);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <section className="checkout-panel">
        <h2 className="mb-6 text-xl font-bold">اطلاعات شخصی</h2>
        <p className="mb-5 text-sm break-all text-muted">{user.email}</p>
        <AccountForm operation="profile">
          <label className="grid gap-2">
            نام
            <Input
              name="name"
              defaultValue={user.name}
              required
              minLength={2}
              maxLength={60}
              autoComplete="name"
            />
          </label>
          <label className="grid gap-2">
            موبایل
            <Input
              name="mobile"
              defaultValue={
                user.mobile ? toPersianDigits(user.mobile) : undefined
              }
              inputMode="tel"
              autoComplete="tel"
            />
          </label>
        </AccountForm>
      </section>
      <section className="checkout-panel">
        <h2 className="mb-6 text-xl font-bold">تغییر رمز عبور</h2>
        <AccountForm operation="password">
          {[
            ["currentPassword", "رمز عبور فعلی"],
            ["password", "رمز عبور جدید"],
            ["confirmPassword", "تکرار رمز عبور جدید"],
          ].map(([name, label]) => (
            <label key={name} className="grid gap-2">
              {label}
              <Input
                type="password"
                name={name}
                required
                autoComplete={
                  name === "currentPassword"
                    ? "current-password"
                    : "new-password"
                }
              />
            </label>
          ))}
        </AccountForm>
      </section>
      <form action={logoutAction}>
        <Button variant="secondary" type="submit">
          خروج از حساب
        </Button>
      </form>
    </div>
  );
}
