export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export class AppError extends Error {
  constructor(
    message: string,
    public code:
      "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "VALIDATION" | "OUT_OF_STOCK",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION");
    this.name = "PayloadTooLargeError";
  }
}
