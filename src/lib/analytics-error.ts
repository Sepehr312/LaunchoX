import "server-only";
import type { AnalyticsDiagnostic, AnalyticsFailure } from "@/types/analytics";

export class AnalyticsResponseError extends Error {
  constructor(
    message: string,
    public readonly diagnostic:
      "response-invalid" | "time-zone-missing" = "response-invalid",
  ) {
    super(message);
    this.name = "AnalyticsResponseError";
  }
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

export function analyticsFailure(error: unknown): AnalyticsFailure {
  if (error instanceof AnalyticsResponseError)
    return { ok: false, code: "connection", diagnostic: error.diagnostic };
  const levels: Record<string, unknown>[] = [];
  let current = error;
  // Fetch and gRPC can wrap transport errors; bound traversal even for cyclic causes.
  for (let depth = 0; depth < 4 && current; depth++) {
    const item = record(current);
    levels.push(item);
    current = item.cause;
  }
  const responses = levels.map((item) => record(item.response));
  const payloads = responses.map((response) =>
    record(record(response.data).error),
  );
  const codes = [...levels, ...responses, ...payloads].flatMap((item) => [
    item.code,
    item.status,
  ]);
  const has = (...expected: (string | number)[]) =>
    expected.some((code) => codes.includes(code));
  const failed = (
    diagnostic: AnalyticsDiagnostic,
    code: AnalyticsFailure["code"] = "connection",
  ): AnalyticsFailure => ({ ok: false, code, diagnostic });
  // gRPC's auth plugin sometimes keeps only text, not the OAuth error object.
  // Inspect known markers on the server; never retain or return the original text.
  const knownMarker = (pattern: RegExp) =>
    levels.some((item) =>
      [item.message, item.details].some(
        (text) => typeof text === "string" && pattern.test(text),
      ),
    );

  if (
    has(
      "ERR_OSSL_UNSUPPORTED",
      "ERR_OSSL_PEM_NO_START_LINE",
      "ERR_OSSL_ASN1_WRONG_TAG",
      "ERR_CRYPTO_INVALID_KEY_OBJECT_TYPE",
    ) ||
    knownMarker(
      /DECODER routines::unsupported|PEM routines::no start line|Invalid PEM|secretOrPrivateKey must be an asymmetric key/i,
    )
  )
    return failed("key-invalid");
  const tokenRejected = responses.some((response) => {
    const value = record(response.data).error;
    return (
      typeof value === "string" &&
      ["invalid_grant", "invalid_client", "unauthorized_client"].includes(value)
    );
  });
  if (
    tokenRejected ||
    has(16, 401, "UNAUTHENTICATED") ||
    knownMarker(/\b(?:invalid_grant|invalid_client|unauthorized_client)\b/)
  )
    return failed("token-rejected", "forbidden");
  const details = [...levels, ...payloads].flatMap((item) =>
    Array.isArray(item.details) ? item.details : [],
  );
  if (details.some((item) => record(item).reason === "SERVICE_DISABLED"))
    return failed("api-disabled", "forbidden");
  if (has(7, 403, "PERMISSION_DENIED")) return { ok: false, code: "forbidden" };
  if (has(8, 429, "RESOURCE_EXHAUSTED")) return { ok: false, code: "quota" };
  if (
    has("ENOTFOUND", "EAI_AGAIN") ||
    knownMarker(/\b(?:ENOTFOUND|EAI_AGAIN)\b/)
  )
    return failed("dns");
  if (
    has(
      4,
      408,
      504,
      "DEADLINE_EXCEEDED",
      "ETIMEDOUT",
      "ESOCKETTIMEDOUT",
      "UND_ERR_CONNECT_TIMEOUT",
      "UND_ERR_HEADERS_TIMEOUT",
    ) ||
    knownMarker(/\b(?:ETIMEDOUT|ESOCKETTIMEDOUT|DEADLINE_EXCEEDED)\b/)
  )
    return failed("timeout");
  if (
    has(
      "ECONNRESET",
      "ECONNREFUSED",
      "ENETUNREACH",
      "EHOSTUNREACH",
      "CERT_HAS_EXPIRED",
      "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
      "ERR_TLS_CERT_ALTNAME_INVALID",
    ) ||
    knownMarker(
      /\b(?:ECONNRESET|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH|CERT_HAS_EXPIRED|UNABLE_TO_VERIFY_LEAF_SIGNATURE|ERR_TLS_CERT_ALTNAME_INVALID)\b/,
    )
  )
    return failed("transport");
  if (has(14, 500, 502, 503, "UNAVAILABLE", "INTERNAL"))
    return failed("google-unavailable");
  if (has(3, 400, "INVALID_ARGUMENT")) return failed("request-rejected");
  return failed("unknown");
}
