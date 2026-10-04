import { toPersianDigits } from "@/lib/format";
import { Input } from "@/components/ui/Input";
import type { AddressDTO } from "@/types/dto";
export function AddressFields({ address }: { address?: AddressDTO }) {
  const fields = [
    ["title", "عنوان آدرس"],
    ["recipientName", "نام گیرنده"],
    ["mobile", "موبایل گیرنده"],
    ["province", "استان"],
    ["city", "شهر"],
    ["postalCode", "کد پستی"],
    ["addressLine", "نشانی کامل"],
  ] as const;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map(([name, label]) => (
        <label key={name} className="grid gap-2 text-sm">
          {label}
          <Input
            name={name}
            defaultValue={address ? toPersianDigits(address[name]) : undefined}
            required

            inputMode={
              name === "mobile" || name === "postalCode" ? "numeric" : "text"
            }
          />
        </label>
      ))}
    </div>
  );
}
