import type { Metadata } from "next";
import { requireAdmin } from "@/actions/auth.actions";
import { getProfile } from "@/services/user.service";
import { AdminMobileForm } from "@/components/admin/AdminMobileForm";
import { OtpSecurityForm } from "@/components/account/OtpSecurityForm";
import { AccountForm } from "@/components/account/AccountForm";
import { CustomerField } from "@/components/customer/CustomerField";
import { toPersianDigits } from "@/lib/format";
import {
  CircleAlert,
  Info,
  LockKeyhole,
  Save,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import styles from "@/components/admin/AdminSecurity.module.css";
export const metadata: Metadata = { title: "امنیت حساب مدیر | لانچو ایکس" };
export default async function AdminSecurityPage() {
  const admin = await requireAdmin();
  const profile = await getProfile(admin.id);
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1>امنیت حساب مدیر</h1>
        <p>شمارهٔ ورود و رمز عبور حساب مدیریت را تنظیم کنید.</p>
      </header>
      <div className={styles.sections}>
        <section
          className={styles.section}
          aria-labelledby="admin-mobile-heading"
        >
          <header className={styles.sectionHeader}>
            <span className={styles.icon}>
              <Smartphone size={26} aria-hidden="true" />
            </span>
            <div>
              <h2 id="admin-mobile-heading">شمارهٔ ورود</h2>
              <p>برای فعال‌کردن ورود پیامکی، شماره و رمز فعلی را وارد کنید.</p>
            </div>
          </header>
          <div className={styles.body}>
            {profile.mobileVerifiedAt ? (
              <>
                <p className={styles.verified}>
                  <ShieldCheck size={18} aria-hidden="true" />
                  شمارهٔ تأییدشده:{" "}
                  <bdi>{toPersianDigits(profile.mobile ?? "")}</bdi>
                </p>
                <OtpSecurityForm
                  mobile={profile.mobile ?? ""}
                  operation="change-mobile"
                />
                <details className={styles.initialPassword}>
                  <summary>هنوز رمز تعیین نکرده‌ام</summary>
                  <OtpSecurityForm
                    mobile={profile.mobile ?? ""}
                    operation="set-password"
                  />
                </details>
              </>
            ) : (
              <>
                <p className={styles.unverified}>
                  <CircleAlert size={18} aria-hidden="true" />
                  نیازمند تأیید شماره
                </p>
                <AdminMobileForm mobile={profile.mobile} />
                <div className={styles.info}>
                  <Info size={20} aria-hidden="true" />
                  <p>
                    پس از تأیید پیامکی، نشست‌های قبلی بسته می‌شوند.
                    <br />
                    ورود با شماره و رمز یا کد پیامکی امکان‌پذیر خواهد بود.
                  </p>
                </div>
              </>
            )}
          </div>
        </section>
        <section
          className={styles.section}
          aria-labelledby="admin-password-heading"
        >
          <header className={styles.sectionHeader}>
            <span className={styles.icon}>
              <LockKeyhole size={26} aria-hidden="true" />
            </span>
            <div>
              <h2 id="admin-password-heading">تغییر رمز عبور</h2>
              <p>برای حساب خود یک رمز قوی و متفاوت انتخاب کنید.</p>
            </div>
          </header>
          <div className={styles.body}>
            <AccountForm
              operation="password"
              label="ذخیره رمز جدید"
              submitIcon={<Save size={20} aria-hidden="true" />}
            >
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
        </section>
      </div>
      <footer className={styles.footer}>
        <ShieldCheck size={22} aria-hidden="true" />
        <p>برای امنیت بیشتر، رمز عبور خود را در اختیار دیگران قرار ندهید.</p>
      </footer>
    </div>
  );
}
