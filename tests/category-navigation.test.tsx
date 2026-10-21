import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FrosticHeader } from "@/components/preview/frostic/FrosticHeader";

vi.mock("next/navigation", () => ({ usePathname: () => "/categories" }));

it("keeps desktop and mobile category navigation on the database-backed directory", () => {
  const html = renderToStaticMarkup(<FrosticHeader theme="light" />);
  expect(html.match(/href="\/categories"/g)).toHaveLength(2);
  expect(html).not.toMatch(/href="\/categories\//);
});
