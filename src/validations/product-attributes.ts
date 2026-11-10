export function isOtherFeaturesAttribute(key: string): boolean {
  const normalized = key.replace(/[\s\u200c]+/g, " ").trim();
  return /^سایر ویژگی(?: ها| های)?(?: یخچال| فریزر)?$/.test(normalized);
}
