import "server-only";
import { isIP } from "node:net";

const windowMs = 15 * 60 * 1000;
declare global {
  var launchoxAuthAttempts:
    Map<string, { count: number; expiresAt: number }> | undefined;
}
// TODO: Use a shared store before running more than one server instance.
export function consumeAuthAttempt(
  scope: "login" | "register",
  ip: string,
  now = Date.now(),
): boolean {
  const attempts = (globalThis.launchoxAuthAttempts ??= new Map());
  for (const [key, bucket] of attempts) {
    if (bucket.expiresAt <= now) attempts.delete(key);
  }
  const key = `${scope}:${ip}`;
  const bucket = attempts.get(key) ?? { count: 0, expiresAt: now + windowMs };
  attempts.set(key, bucket);
  if (bucket.count >= 5) return false;
  bucket.count++;
  return true;
}

export function getClientIp(headers: Headers): string {
  const candidate =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip")?.trim();
  return candidate && isIP(candidate) ? candidate : "unknown";
}
