import { expect, it } from "vitest";
import { AppError, type ActionResult } from "@/lib/errors";

it("preserves the application error code and Persian message", () => {
  const error = new AppError("محصول یافت نشد", "NOT_FOUND");
  expect(error).toBeInstanceOf(Error);
  expect(error.name).toBe("AppError");
  expect(error.code).toBe("NOT_FOUND");
  const result: ActionResult = {
    ok: false,
    error: error.message,
    fieldErrors: { title: ["این فیلد الزامی است"] },
  };
  expect(result.error).toBe("محصول یافت نشد");
});
