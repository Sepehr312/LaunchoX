import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  analyticsFailure,
  AnalyticsResponseError,
} from "@/lib/analytics-error";
import type { AnalyticsDiagnostic } from "@/types/analytics";

it.each([
  [{ code: "ERR_OSSL_UNSUPPORTED" }, "key-invalid"],
  [
    {
      code: 2,
      details: "Getting metadata failed: DECODER routines::unsupported",
    },
    "key-invalid",
  ],
  [
    {
      response: {
        status: 400,
        data: { error: "invalid_grant", error_description: "TEST-SENSITIVE" },
      },
    },
    "token-rejected",
  ],
  [
    { code: 2, details: "Getting metadata failed: invalid_grant" },
    "token-rejected",
  ],
  [{ response: { status: 401 } }, "token-rejected"],
  [{ code: "ENOTFOUND" }, "dns"],
  [{ code: 14, details: "Last error: getaddrinfo EAI_AGAIN" }, "dns"],
  [{ cause: { code: "UND_ERR_CONNECT_TIMEOUT" } }, "timeout"],
  [{ code: 14, details: "Last error: connect ETIMEDOUT" }, "timeout"],
  [{ code: 4 }, "timeout"],
  [{ cause: { code: "ECONNRESET" } }, "transport"],
  [{ code: 14, details: "Last error: ECONNREFUSED" }, "transport"],
  [{ response: { status: 503 } }, "google-unavailable"],
  [{ code: 14 }, "google-unavailable"],
  [
    {
      response: {
        data: {
          error: { code: 403, details: [{ reason: "SERVICE_DISABLED" }] },
        },
      },
    },
    "api-disabled",
  ],
  [{ code: 3 }, "request-rejected"],
  [new AnalyticsResponseError("Invalid count"), "response-invalid"],
  [
    new AnalyticsResponseError("Missing zone", "time-zone-missing"),
    "time-zone-missing",
  ],
  [{ message: "TEST-SENSITIVE", code: "UNKNOWN-PRIVATE-VALUE" }, "unknown"],
] satisfies [unknown, AnalyticsDiagnostic][])(
  "classifies an error without exposing its original fields: %#",
  (error, diagnostic) => {
    const result = analyticsFailure(error);
    expect(result.diagnostic).toBe(diagnostic);
    expect(result.ok).toBe(false);
    expect(Object.keys(result).sort()).toEqual(["code", "diagnostic", "ok"]);
    expect(JSON.stringify(result)).not.toContain("TEST-SENSITIVE");
    expect(JSON.stringify(result)).not.toContain("UNKNOWN-PRIVATE-VALUE");
  },
);

it("keeps permission and quota errors separate for gRPC and REST responses", () => {
  for (const error of [
    { code: 7 },
    { response: { status: 403 } },
    { response: { data: { error: { status: "PERMISSION_DENIED" } } } },
  ]) {
    expect(analyticsFailure(error)).toEqual({ ok: false, code: "forbidden" });
  }
  for (const error of [{ code: 8 }, { response: { status: 429 } }]) {
    expect(analyticsFailure(error)).toEqual({ ok: false, code: "quota" });
  }
});

it("bounds cause traversal and never serializes key, token or stack details", () => {
  const error: {
    cause?: unknown;
    message: string;
    stack: string;
    private_key: string;
    response: unknown;
  } = {
    message: "TEST-SENSITIVE-KEY",
    stack: "TEST-SENSITIVE-STACK",
    private_key: "TEST-SENSITIVE-KEY",
    response: {
      status: 400,
      data: {
        error: "invalid_grant",
        access_token: "TEST-SENSITIVE-TOKEN",
        private_key: "TEST-SENSITIVE-KEY",
      },
    },
  };
  error.cause = error;
  expect(analyticsFailure(error)).toEqual({
    ok: false,
    code: "forbidden",
    diagnostic: "token-rejected",
  });
  expect(JSON.stringify(analyticsFailure(error))).not.toContain(
    "TEST-SENSITIVE",
  );
  expect(analyticsFailure(null)).toEqual({
    ok: false,
    code: "connection",
    diagnostic: "unknown",
  });
});
