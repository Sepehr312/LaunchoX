import { expect, it } from "vitest";
import { databaseActionError } from "@/lib/database-error";

it("explains missing transaction support without returning database details", () => {
  const result = databaseActionError({
    code: 20,
    message:
      "Transaction numbers are only allowed on a replica set member or mongos: private-host",
  });
  expect(result).toContain("Replica Set");
  expect(result).not.toContain("private-host");
});
it("does not mislabel unrelated failures", () => {
  for (const error of [
    null,
    "error",
    new Error("other"),
    { code: 20, message: "different illegal operation" },
  ])
    expect(databaseActionError(error)).toBeUndefined();
});
