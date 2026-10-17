import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(
  pathToFileURL(resolve(process.argv[2], "node_modules/playwright/index.mjs"))
    .href
);
const base = process.argv[3] ?? "http://localhost:3000";
function database(code) {
  return execFileSync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "--conditions=react-server",
      "--env-file=.env.local",
      "-e",
      `import mongoose from "mongoose";
     import { randomUUID } from "node:crypto";
     import { encode } from "next-auth/jwt";
     import { connectDB } from "./src/lib/db";
     import { getEnv } from "./src/lib/env";
     import { User } from "./src/models/user";
     import { Cart } from "./src/models/cart";
     import { Product } from "./src/models/product";
     (async () => { try { await connectDB(); ${code} } finally { await mongoose.disconnect(); } })();`,
    ],
    { encoding: "utf8", windowsHide: true },
  ).trim();
}

const browser = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
});
try {
  for (const width of [360, 1280]) {
    const email = `address-browser-${randomUUID()}@example.com`;
    const { token } = JSON.parse(
      database(`
      const product = await Product.findOne({ isActive: true, stock: { $gt: 0 } }).lean();
      if (!product) throw new Error("A stocked product is required for checkout rendering");
      const address = { recipientName: "علی رضایی", mobile: "09123456789", province: "تهران", city: "تهران", postalCode: "1234567890", addressLine: "خیابان آزادی، پلاک ۱۲" };
      const user = await User.create({ name: "آزمایش آدرس", email: ${JSON.stringify(email)}, passwordHash: "$2b$12$" + "a".repeat(53), role: "customer", isActive: true,
        addresses: [{ ...address, title: "اول", isDefault: false }, { ...address, title: "پیش‌فرض دوم", isDefault: true }] });
      await Cart.create({ user: user._id, items: [{ product: product._id, quantity: 1 }] });
      const token = await encode({ secret: getEnv().AUTH_SECRET, salt: "authjs.session-token", maxAge: 600,
        token: { id: String(user._id), role: "customer", name: user.name, email: user.email } });
      process.stdout.write(JSON.stringify({ token }));
    `),
    );
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      isMobile: width === 360,
      hasTouch: width === 360,
    });
    try {
      await context.addCookies([
        { name: "authjs.session-token", value: token, url: base },
      ]);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(String(error)));
      await page.goto(base + "/account/addresses", {
        waitUntil: "networkidle",
      });
      const cards = page
        .locator("section.checkout-panel")
        .filter({
          has: page.locator('input[name="operation"][value="delete"]'),
        });
      assert.equal(
        await cards.first().locator("h3").innerText(),
        "پیش‌فرض دوم",
      );
      const addForm = page
        .locator("form")
        .filter({ has: page.locator('input[name="operation"][value="add"]') });

      async function fillAddress(form, title) {
        await form.locator('[name="title"]').fill(title);
        const recipient = form.locator('[name="recipientName"]');
        await recipient.fill("Aliعلي ۱۲3!رضايي");
        assert.equal(await recipient.inputValue(), "علی رضایی");
        const mobile = form.locator('[name="mobile"]');
        await mobile.fill("ab۰۹١۲۳cd");
        assert.equal(await mobile.inputValue(), "۰۹۱۲۳");
        await mobile.fill("۰۹۱۲۳۴۵۶۷۸۹");
        await form.locator('[name="postalCode"]').fill("۱۲۳۴۵۶۷۸۹۰");
        const province = form.locator('select[name="province"]');
        const city = form.locator('select[name="city"]');
        assert.equal(await province.locator("option").count(), 32);
        assert.equal(await city.isDisabled(), true);
        await province.selectOption("تهران");
        await city.selectOption("تهران");
        await province.selectOption("فارس");
        assert.equal(await city.inputValue(), "");
        assert.equal(await city.locator('option[value="تهران"]').count(), 0);
        await city.selectOption("شیراز");
        await form
          .locator('textarea[name="addressLine"]')
          .fill("خیابان آزمایشی، پلاک ۱۲\nطبقه دوم، واحد ۳");
        assert.ok(
          (await form.locator('[name="addressLine"]').inputValue()).includes(
            "\n",
          ),
        );
      }

      await fillAddress(addForm, "آدرس جدید");
      await addForm
        .getByRole("button", { name: "ذخیرهٔ آدرس", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          document.querySelectorAll('input[name="operation"][value="delete"]')
            .length === 3,
      );
      await page.waitForFunction(
        () => document.querySelector("#new-province")?.value === "",
      );
      assert.equal(
        await addForm.locator('[name="recipientName"]').inputValue(),
        "",
      );
      const newCard = cards.filter({
        has: page.getByRole("heading", { name: "آدرس جدید", exact: true }),
      });
      await newCard
        .getByRole("button", { name: "انتخاب پیش‌فرض", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          document.querySelector("section.checkout-panel h3")?.textContent ===
          "آدرس جدید",
      );
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(await cards.first().locator("h3").innerText(), "آدرس جدید");
      await cards.first().locator("summary").click();
      const edit = cards
        .first()
        .locator("form")
        .filter({ has: page.locator('input[name="operation"][value="edit"]') });
      assert.equal(
        await edit.locator('[name="province"]').inputValue(),
        "فارس",
      );
      assert.equal(await edit.locator('[name="city"]').inputValue(), "شیراز");
      assert.ok(
        (
          await edit.locator('textarea[name="addressLine"]').inputValue()
        ).includes("\n"),
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );

      await page.goto(base + "/checkout", { waitUntil: "networkidle" });
      assert.equal(new URL(page.url()).pathname, "/checkout");
      assert.ok(
        (await page.locator(".checkout-address").first().innerText()).includes(
          "آدرس جدید",
        ),
      );
      assert.equal(
        await page
          .locator('.checkout-address input[type="radio"]')
          .first()
          .isChecked(),
        true,
      );
      await page.getByText("افزودن آدرس جدید", { exact: true }).click();
      const checkoutForm = page
        .locator("form")
        .filter({ has: page.locator("#checkout-title") });
      await fillAddress(checkoutForm, "آدرس تسویه");
      await checkoutForm
        .getByRole("button", { name: "ذخیرهٔ آدرس", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "آدرس اضافه شد" })
        .waitFor();
      await page.waitForFunction(
        () => document.querySelector("#checkout-province")?.value === "",
      );
      assert.equal(await page.locator(".checkout-address").count(), 4);
      assert.ok(
        (await page.locator(".checkout-address").first().innerText()).includes(
          "آدرس جدید",
        ),
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      console.log(
        `Address fields, dependent selects, persistence, default ordering and checkout passed at ${width}px.`,
      );
    } finally {
      await context.close();
      database(
        `const user = await User.findOne({ email: ${JSON.stringify(email)} }); if (user) { await Cart.deleteOne({ user: user._id }); await User.deleteOne({ _id: user._id }); }`,
      );
    }
  }
} finally {
  await browser.close();
}
