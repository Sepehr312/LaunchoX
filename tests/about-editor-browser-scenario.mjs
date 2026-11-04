import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

export async function runAboutEditorScenario({ page, browser, db, base }) {
  const previewUrl = base + "/admin/content?section=about";
  const preview = page.getByRole("region", {
    name: "پیش‌نمایش کل صفحه درباره ما",
    exact: true,
  });
  const save = page.getByRole("button", { name: "ذخیره این بخش", exact: true });
  async function write(action) {
    const response = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/admin/content"),
    );
    await Promise.all([response, action()]);
    await page.locator('[aria-busy="true"]').waitFor({ state: "hidden" });
  }
  await page.goto(previewUrl);
  await preview.waitFor();
  assert.equal(await preview.locator("form").count(), 0);
  assert.equal(
    await page
      .getByRole("heading", { name: "بخش‌های صفحه", exact: true })
      .count(),
    0,
  );
  while (await preview.getByRole("button", { name: /^حذف بخش / }).count()) {
    page.once("dialog", (dialog) => dialog.accept());
    await write(() =>
      preview
        .getByRole("button", { name: /^حذف بخش / })
        .first()
        .click(),
    );
  }
  assert.equal(await preview.locator("[data-template]").count(), 0);
  assert.equal(
    await preview
      .getByRole("button", { name: "افزودن بخش", exact: true })
      .count(),
    1,
  );
  const templates = [
    "معرفی فروشگاه",
    "داستان ما",
    "ارزش‌های ما",
    "مسیر انتخاب محصول",
    "پرسش‌های متداول",
    "ارتباط با ما",
  ];
  for (const [index, title] of templates.entries()) {
    await preview
      .getByRole("button", { name: "افزودن بخش", exact: true })
      .click();
    const picker = page.getByRole("dialog", { name: "افزودن بخش آماده" });
    await picker.waitFor();
    await picker.getByRole("button", { name: new RegExp("^" + title) }).click();
    await picker
      .getByRole("button", { name: "ادامه و ویرایش بخش", exact: true })
      .click();
    await page.waitForURL((url) => url.pathname === "/admin/content/about/new");
    await page
      .getByRole("heading", { name: `افزودن بخش: ${title}`, exact: true })
      .waitFor();
    assert.equal(await page.locator("[data-template]").count(), 0);
    assert.equal(
      (await db.collection("managedcontents").findOne({ key: "about" })).data
        .sections.length,
      index,
    );
    if (index === 0) {
      await page.getByLabel("عنوان اصلی", { exact: true }).fill("معرفی آزمون");
      await page
        .getByLabel("بخش آبی عنوان", { exact: true })
        .fill("تیتر آبی آزمون");
      await page
        .getByLabel("متن معرفی", { exact: true })
        .fill("متن معرفی آزمون");
    } else if (index === 1) {
      await page.getByLabel("عنوان بخش", { exact: true }).fill("داستان آزمون");
    } else if (index === 4) {
      await page.getByLabel("متن پرسش", { exact: true }).fill("پرسش آزمون؟");
      await page.getByLabel("پاسخ", { exact: true }).fill("پاسخ آزمون");
    } else if (index === 5) {
      await page
        .getByLabel("استفاده از اطلاعات تماس فروشگاه", { exact: true })
        .uncheck();
      await page.getByLabel("ایمیل", { exact: true }).fill("invalid");
      await save.click();
      await page
        .getByRole("alert")
        .filter({ hasText: "ایمیل معتبر نیست" })
        .waitFor();
      assert.equal(new URL(page.url()).pathname, "/admin/content/about/new");
      await page.getByLabel("ایمیل", { exact: true }).fill("local@example.com");
    }
    await page.setViewportSize({ width: 360, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Edit form ${title} overflows at 360px`,
    );
    await page.screenshot({
      path: fileURLToPath(
        new URL(
          `../test-results/about-form-${index + 1}-mobile.png`,
          import.meta.url,
        ),
      ),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1584, height: 1100 });
    await page.screenshot({
      path: fileURLToPath(
        new URL(
          `../test-results/about-form-${index + 1}-desktop.png`,
          import.meta.url,
        ),
      ),
      fullPage: true,
    });
    await save.click();
    await page.waitForURL(previewUrl);
    await preview.waitFor();
    assert.equal(await preview.locator("[data-template]").count(), index + 1);
  }
  const before = await db
    .collection("managedcontents")
    .findOne({ key: "about" });
  const edit = preview.getByRole("link", {
    name: "ویرایش بخش معرفی فروشگاه",
    exact: true,
  });
  await edit.click();
  await page
    .getByRole("heading", { name: "ویرایش بخش: معرفی فروشگاه", exact: true })
    .waitFor();
  await page.getByLabel("عنوان اصلی", { exact: true }).fill("تغییر موقت");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "انصراف", exact: true }).click();
  await page.waitForURL(previewUrl);
  assert.deepEqual(
    (await db.collection("managedcontents").findOne({ key: "about" })).data,
    before.data,
  );
  await edit.click();
  await page.getByLabel("عنوان اصلی", { exact: true }).fill("معرفی ذخیره‌شده");
  const route = "**/admin/content/about/**";
  await page.route(route, (route) =>
    route.request().method() === "POST"
      ? route.abort("failed")
      : route.continue(),
  );
  await save.click();
  await page
    .getByRole("alert")
    .filter({ hasText: "ارتباط با سرور برقرار نشد" })
    .waitFor();
  assert.match(new URL(page.url()).pathname, /\/edit$/);
  await page.unroute(route);
  await save.click();
  await page.waitForURL(previewUrl);
  await preview.waitFor();
  const after = await db
    .collection("managedcontents")
    .findOne({ key: "about" });
  assert.equal(after.data.sections[0].title, "معرفی ذخیره‌شده");
  assert.deepEqual(after.data.sections.slice(1), before.data.sections.slice(1));
  await write(() =>
    preview.getByLabel("نمایش بخش ۲", { exact: true }).uncheck(),
  );
  await write(() =>
    preview
      .getByRole("button", { name: "انتقال بخش ۶ به بالا", exact: true })
      .click(),
  );
  await page.reload();
  await preview.waitFor();
  const stored = await db
    .collection("managedcontents")
    .findOne({ key: "about" });
  assert.deepEqual(
    stored.data.sections.map((section) => section.template),
    ["introduction", "story", "values", "steps", "contact", "faq"],
  );
  assert.equal(
    await preview.getByLabel("نمایش بخش ۲", { exact: true }).isChecked(),
    false,
  );
  await page
    .getByRole("button", { name: "پیش‌نمایش موبایل", exact: true })
    .click();
  await page.setViewportSize({ width: 360, height: 900 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Full preview overflows at 360px",
  );
  await page.screenshot({
    path: fileURLToPath(
      new URL("../test-results/about-full-preview-mobile.png", import.meta.url),
    ),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1584, height: 1100 });
  await page
    .getByRole("button", { name: "پیش‌نمایش دسکتاپ", exact: true })
    .click();
  await page.screenshot({
    path: fileURLToPath(
      new URL(
        "../test-results/about-full-preview-desktop.png",
        import.meta.url,
      ),
    ),
    fullPage: true,
  });
  const customer = await browser.newPage();
  await customer.goto(base + "/about");
  await customer.getByRole("heading", { name: /معرفی ذخیره‌شده/ }).waitFor();
  assert.equal(
    await customer
      .getByRole("heading", { name: "داستان آزمون", exact: true })
      .count(),
    0,
  );
  await customer.getByText("پرسش آزمون؟", { exact: true }).waitFor();
  await write(() =>
    page.getByLabel("نمایش صفحه درباره ما", { exact: true }).uncheck(),
  );
  await customer.reload();
  await customer
    .getByRole("heading", {
      name: "صفحه یا مورد موردنظر پیدا نشد",
      exact: true,
    })
    .waitFor();
  await write(() =>
    page.getByLabel("نمایش صفحه درباره ما", { exact: true }).check(),
  );
  await customer.close();
  console.log(
    "PASS: full preview, empty state, six standalone edit forms, independent saves, save-and-return, cancel, network retry, visibility, ordering and mobile layout",
  );
}
