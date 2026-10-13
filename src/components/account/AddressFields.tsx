import { toPersianDigits } from "@/lib/format";
import { CustomerField } from "@/components/customer/CustomerField";
import type { AddressDTO } from "@/types/dto";
export function AddressFields({ address }: { address?: AddressDTO }) {
  const fields = [
    ["title", "عنوان آدرس", "مثلاً خانه یا محل کار", "off"],
    ["recipientName", "نام و نام خانوادگی گیرنده", undefined, "name"],
    ["mobile", "موبایل گیرنده", "۱۱ رقم و با ۰۹ شروع شود", "tel"],
    ["postalCode", "کد پستی", "کد پستی ۱۰ رقمی، بدون فاصله", "postal-code"],
    ["province", "استان", undefined, "address-level1"],
    ["city", "شهر", undefined, "address-level2"],
    [
      "addressLine",
      "نشانی کامل",
      "خیابان، کوچه، پلاک، طبقه و واحد را وارد کنید.",
      "street-address",
    ],
  ] as const;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map(([name, label, hint, autoComplete]) => (
        <div
          key={name}
          className={name === "addressLine" ? "sm:col-span-2" : undefined}
        >
          <CustomerField
            id={`${address?.id ?? "new"}-${name}`}
            name={name}
            label={label}
            hint={hint}
            autoComplete={autoComplete}
            defaultValue={address ? toPersianDigits(address[name]) : undefined}
            required
            inputMode={
              name === "mobile" || name === "postalCode" ? "numeric" : "text"
            }
          />
        </div>
      ))}
    </div>
  );
}
