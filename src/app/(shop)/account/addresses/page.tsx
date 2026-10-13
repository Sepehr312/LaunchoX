import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import { requireUser } from "@/actions/auth.actions";
import { getCheckoutAddresses } from "@/services/user.service";
import { AccountForm } from "@/components/account/AccountForm";
import { AddressFields } from "@/components/account/AddressFields";
import { CustomerEmpty } from "@/components/customer/CustomerEmpty";
import { toPersianDigits } from "@/lib/format";
import styles from "@/components/customer/customer.module.css";
export const metadata: Metadata = {
  title: `آدرس‌های من | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};
export default async function AddressesPage() {
  const user = await requireUser();
  const addresses = await getCheckoutAddresses(user.id);
  return (
    <div className="grid gap-6">
      <header>
        <p className="section-kicker">مقصد سفارش‌های شما</p>
        <h2 className="mt-2 text-2xl font-bold">آدرس‌های من</h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          {toPersianDigits(addresses.length)} از {toPersianDigits(5)} آدرس ثبت
          شده؛ یک آدرس را به‌عنوان پیش‌فرض انتخاب کنید.
        </p>
      </header>
      <div className={styles.addressGrid}>
        <div className="grid min-w-0 gap-5">
          {!addresses.length && (
            <CustomerEmpty
              title="هنوز آدرسی ثبت نکرده‌اید"
              description="آدرس خود را از بخش افزودن آدرس جدید ثبت کنید تا خرید بعدی ساده‌تر باشد."
            />
          )}
          <div className="grid items-start gap-5">
            {addresses.map((address) => (
              <section key={address.id} className="checkout-panel">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-bold">{address.title}</h3>
                  {address.isDefault && (
                    <span className={`${styles.badge} text-primary`}>
                      پیش‌فرض
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold">{address.recipientName}</p>
                <p className="mt-3 text-sm leading-8 text-muted">
                  {address.province}، {address.city}،{" "}
                  {toPersianDigits(address.addressLine)}
                </p>
                <p className="mt-3 text-xs leading-7 text-muted">
                  کد پستی: {toPersianDigits(address.postalCode)}
                  <br />
                  موبایل: {toPersianDigits(address.mobile)}
                </p>
                <details className="mt-5 border-t border-border pt-3">
                  <summary className="text-sm font-semibold text-primary">
                    ویرایش آدرس
                  </summary>
                  <div className="mt-5">
                    <AccountForm operation="edit" id={address.id}>
                      <AddressFields address={address} />
                    </AccountForm>
                  </div>
                </details>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {!address.isDefault && (
                    <AccountForm
                      operation="default"
                      id={address.id}
                      label="انتخاب پیش‌فرض"
                    />
                  )}
                  <AccountForm
                    operation="delete"
                    id={address.id}
                    label="حذف آدرس"
                    confirm
                  />
                </div>
              </section>
            ))}
          </div>
        </div>
        {addresses.length < 5 ? (
          <section className="checkout-panel">
            <h3 className="text-lg font-semibold">افزودن آدرس جدید</h3>
            <div className="mt-6">
              <AccountForm operation="add" label="ذخیرهٔ آدرس">
                <AddressFields />
              </AccountForm>
            </div>
          </section>
        ) : (
          <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
            ظرفیت پنج آدرس تکمیل است. برای افزودن آدرس جدید، یکی از آدرس‌ها را
            حذف کنید.
          </p>
        )}
      </div>
    </div>
  );
}
