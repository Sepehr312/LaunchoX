export function normalizeBrandText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/ي|ى/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\s\u200c\u200d\u200e\u200f]+/g, "")
    .toLowerCase();
}

export function isBrandAttribute(key: string): boolean {
  return ["برند", "brand"].includes(normalizeBrandText(key));
}
