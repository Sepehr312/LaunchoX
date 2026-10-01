const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
const priceFormatter = new Intl.NumberFormat("fa-IR");
const dateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "medium",
  timeZone: "Asia/Tehran",
});

export function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const index = persianDigits.indexOf(digit);
    return String(index === -1 ? arabicDigits.indexOf(digit) : index);
  });
}

export function toPersianDigits(value: string | number): string {
  return normalizeDigits(String(value)).replace(/[0-9]/g, (digit) =>
    persianDigits.charAt(Number(digit)),
  );
}

export function formatPrice(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new RangeError("مبلغ باید عدد صحیح نامنفی و معتبر باشد.");
  }
  return `${priceFormatter.format(amount)} تومان`;
}

export function formatDate(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("تاریخ معتبر نیست.");
  }
  return dateFormatter.format(date);
}
