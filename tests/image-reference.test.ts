import { expect, it } from "vitest";
import { inspectImageReference } from "@/lib/image-reference";

const id = "507f1f77bcf86cd799439011";
const origins = ["https://shop.test", "https://old.shop.test"];
it.each([
  [`/api/images/${id}`, "internal"],
  [`/api/images/${id}?v=1`, "internal"],
  [`https://shop.test/api/images/${id}`, "internal"],
  [`https://old.shop.test/api/images/${id}`, "internal"],
  [`https://shop.test/api/%69mages/${id}`, "internal"],
  [`https://shop.test/api/images/%35${id.slice(1)}`, "internal"],
  ["https://cdn.test/photo.png", "external"],
  [`https://cdn.test/api/images/${id}`, "ambiguous"],
  [`https://shop.test.evil.test/api/images/${id}`, "ambiguous"],
  [`https://shop.test:8443/api/images/${id}`, "ambiguous"],
  [`http://shop.test/api/images/${id}`, "ambiguous"],
  ["/api/images/invalid", "invalid"],
  ["https://[invalid", "invalid"],
  [`https://shop.test/api/images/${id}%ZZ`, "invalid"],
])("classifies %s as %s", (url, kind) => {
  expect(inspectImageReference(url, origins).kind).toBe(kind);
});
