import type { Metadata } from "next";
import { requireAdmin } from "@/actions/auth.actions";
import { getProfile } from "@/services/user.service";
import { AdminMobileForm } from "@/components/admin/AdminMobileForm";
import { OtpSecurityForm } from "@/components/account/OtpSecurityForm";
import { AccountForm } from "@/components/account/AccountForm";
import { CustomerField } from "@/components/customer/CustomerField";
import { toPersianDigits } from "@/lib/format";
export const metadata: Metadata = { title: "امنیت حساب مدیر | لانچ‌اوکس" };
export default async function AdminSecurityPage() {
  const admin = await requireAdmin();
  const profile = await getProfile(admin.id);
  return (
    <div className="grid gap-8 p-5 sm:p-8">
      <h1 className="text-2xl font-bold">امنیت حساب مدیر</h1>
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">شمارهٔ ورود</h2>
        {profile.mobileVerifiedAt ? (
          <>
            <p>
              شمارهٔ تأییدشده:{" "}
              <bdi>{toPersianDigits(profile.mobile ?? "")}</bdi>
            </p>
            <OtpSecurityForm
              mobile={profile.mobile ?? ""}
              operation="change-mobile"
            />
            <details className="mt-6">
              <summary className="cursor-pointer text-sm">
                هنوز رمز تعیین نکرده‌ام
              </summary>
              <OtpSecurityForm
                mobile={profile.mobile ?? ""}
                operation="set-password"
              />
            </details>
          </>
        ) : (
          <>
            <p className="mb-5 text-sm leading-7">
              برای فعال‌کردن ورود پیامکی، شمارهٔ خود و رمز فعلی را وارد کنید.
              پس از تأیید پیامکی، سشن‌های قبلی بسته می‌شوند و می‌توانید با شماره
              و رمز یا کد پیامکی وارد شوید.
            </p>
            <AdminMobileForm mobile={profile.mobile} />
          </>
        )}
      </section>
      <section className="max-w-lg rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-lg font-semibold">تغییر رمز عبور</h2>
        <AccountForm operation="password" label="ذخیره رمز جدید">
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
                name === "currentPassword" ? "current-password" : "new-password"
              }
            />
          ))}
        </AccountForm>
      </section>
    </div>
  );
}
