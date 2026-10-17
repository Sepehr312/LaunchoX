import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(
  pathToFileURL(resolve(process.argv[2], "node_modules/playwright/index.mjs"))
    .href
);
const base = process.argv[3] ?? "http://localhost:3000";
// Read an existing customer and issue a short-lived test session without changing account data.
const session = execFileSync(
  process.execPath,
  [
    "node_modules/tsx/dist/cli.mjs",
    "--conditions=react-server",
    "--env-file=.env.local",
    "-e",
    `import mongoose from "mongoose";
     import { encode } from "next-auth/jwt";
     import { connectDB } from "./src/lib/db";
     import { getEnv } from "./src/lib/env";
     import { User } from "./src/models/user";
     (async () => {
       try {
         await connectDB();
         const user = await User.findOne({ role: "customer", isActive: true }).lean();
         if (!user) throw new Error("A seeded customer is required");
         const token = await encode({
           secret: getEnv().AUTH_SECRET, salt: "authjs.session-token", maxAge: 300,
           token: { id: String(user._id), role: "customer", name: user.name, email: user.email }
         });
         process.stdout.write(token);
       } finally { await mongoose.disconnect(); }
     })();`,
  ],
  { encoding: "utf8", windowsHide: true },
).trim();

const browser = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});
try {
  for (const width of [360, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    for (const route of ["/login", "/register", "/account"]) {
      if (route === "/account") {
        await context.addCookies([
          { name: "authjs.session-token", value: session, url: base },
        ]);
      }
      await page.goto(base + route, { waitUntil: "networkidle" });
      assert.equal(new URL(page.url()).pathname, route);
      if (route === "/account") await page.locator("details summary").tap();
      const inputs = page.locator('input[type="password"]');
      const count = await inputs.count();
      assert.equal(
        count,
        route === "/login" ? 1 : route === "/register" ? 2 : 3,
      );
      for (let index = 0; index < count; index++) {
        const input = inputs.nth(index);
        const id = await input.getAttribute("id");
        const field = page.locator(`input[id="${id}"]`);
        const button = field.locator("..").getByRole("button");
        await field.fill("Mobile123!");
        const rect = await button.boundingBox();
        assert.ok(rect.width >= 44 && rect.height >= 44);
        assert.equal(
          await button.evaluate((element) => element.closest("label") === null),
          true,
        );
        await button.tap();
        assert.equal(await field.getAttribute("type"), "text");
        assert.equal(await button.getAttribute("aria-pressed"), "true");
        assert.equal(
          await field.evaluate((element) => document.activeElement === element),
          true,
        );
        assert.equal(await field.inputValue(), "Mobile123!");
        await button.tap();
        assert.equal(await field.getAttribute("type"), "password");
        await button.focus();
        await page.keyboard.press("Space");
        assert.equal(await field.getAttribute("type"), "text");
        await page.keyboard.press("Enter");
        assert.equal(await field.getAttribute("type"), "password");
        assert.equal(await field.inputValue(), "Mobile123!");
        assert.equal(new URL(page.url()).pathname, route);
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(
    "Password visibility passed for all six fields at 360px and 390px with touch and keyboard input.",
  );
} finally {
  await browser.close();
}
