import { getEnv } from "@/lib/env";
import type { Metadata } from "next";
import { requireUser } from "@/actions/auth.actions";
import { getCheckoutAddresses } from "@/services/user.service";
import { AccountForm } from "@/components/account/AccountForm";
import { AddressFields } from "@/components/account/AddressFields";
import { toPersianDigits } from "@/lib/format";
export const metadata: Metadata = {
  title: `آدرس‌های من | ${getEnv().NEXT_PUBLIC_SITE_NAME}`,
};
export default async function AddressesPage() {
  const user = await requireUser();
  const addresses = await getCheckoutAddresses(user.id);
  return (
    <div className="grid gap-6">
      <h2 className="text-2xl font-bold">
        آدرس‌های من{" "}
        <span className="text-sm text-muted">
          {toPersianDigits(addresses.length)} از {toPersianDigits(5)}
        </span>
      </h2>
      {!addresses.length && (
        <p className="checkout-panel">هنوز آدرسی ثبت نکرده‌اید.</p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {addresses.map((address) => (
          <section key={address.id} className="checkout-panel">
            <h3 className="mb-5 text-lg font-bold">
              {address.title}
              {address.isDefault && (
                <span className="ms-3 text-sm text-primary">پیش‌فرض</span>
              )}
            </h3>
            <AccountForm operation="edit" id={address.id}>
              <AddressFields address={address} />
            </AccountForm>
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
      {addresses.length < 5 && (
        <section className="checkout-panel">
          <h3 className="mb-5 text-xl font-bold">افزودن آدرس</h3>
          <AccountForm operation="add" label="ذخیرهٔ آدرس">
            <AddressFields />
          </AccountForm>
        </section>
      )}
    </div>
  );
}
