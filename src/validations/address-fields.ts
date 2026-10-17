import locations from "@/validations/iran-locations.json";
import { normalizeDigits, toPersianDigits } from "@/lib/format";

export function normalizePersianText(value: string): string {
  return value.replace(/ي|ى/g, "ی").replace(/ك/g, "ک");
}

export function normalizeLocation(value: string): string {
  return normalizePersianText(value).trim().replace(/\s+/g, " ");
}

export const persianNamePattern =
  /^[آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیءأإؤئ]+(?:[ \u200c]+[آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیءأإؤئ]+)*$/u;

export function filterAddressInput(name: string, value: string): string {
  if (name === "recipientName")
    return normalizePersianText(value).replace(
      /[^آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیءأإؤئ \u200c]/gu,
      "",
    );
  if (name === "mobile" || name === "postalCode")
    return toPersianDigits(normalizeDigits(value).replace(/\D/g, ""));
  return value;
}

const collator = new Intl.Collator("fa");
export const addressProvinces = locations
  .map(({ province }) => province)
  .sort(collator.compare);

export function getAddressCities(province: string): string[] {
  const cities = locations.find(
    (location) => location.province === normalizeLocation(province),
  )?.cities;
  return cities ? [...cities].sort(collator.compare) : [];
}
