export type ImageReference =
  | { kind: "internal" | "ambiguous"; id: string }
  | { kind: "external" | "invalid" };

export function inspectImageReference(
  value: string,
  origins: readonly string[],
): ImageReference {
  try {
    const relative = value.startsWith("/") && !value.startsWith("//");
    if (!relative && !/^https?:\/\//i.test(value)) return { kind: "invalid" };
    const url = new URL(value, "https://relative.invalid");
    if (!relative && !/^https?:$/.test(url.protocol))
      return { kind: "invalid" };
    const path = decodeURIComponent(url.pathname);
    const match = /^\/api\/images\/([a-f0-9]{24})\/?$/i.exec(path);
    if (!match)
      return {
        kind: path.toLowerCase().startsWith("/api/images/")
          ? "invalid"
          : "external",
      };
    return {
      kind: relative || origins.includes(url.origin) ? "internal" : "ambiguous",
      id: match[1].toLowerCase(),
    };
  } catch {
    return { kind: "invalid" };
  }
}

export function imageIdPattern(id: string): RegExp {
  // Match literal and percent-encoded ID characters without materializing legacy URLs.
  return new RegExp(
    [...id]
      .map((char) => {
        const encodings = new Set(
          [char, char.toUpperCase()].map(
            (letter) => `%${letter.charCodeAt(0).toString(16)}`,
          ),
        );
        return `(?:${char}|${[...encodings].join("|")})`;
      })
      .join(""),
    "i",
  );
}
