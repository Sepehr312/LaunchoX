"""Stage 9 browser acceptance. Run only against an isolated seeded test database."""
import json
import os
import subprocess
import uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

expect.set_options(timeout=60000)

BASE = os.environ.get("LAUNCHO_CHECKOUT_TEST_URL", "http://localhost:3019")
DB = os.environ["LAUNCHO_CHECKOUT_TEST_DB"]
assert "launchox_stage9_browser" in DB, "Use the isolated stage 9 test database"
EMAIL = f"checkout-{uuid.uuid4()}@example.com"

def records():
    code = """
const mongoose = require('mongoose');
async function run() {
  await mongoose.connect(DB);
  const user = await mongoose.connection.collection('users').findOne({email: EMAIL});
  const orders = user ? await mongoose.connection.collection('orders').find({user: user._id}).sort({createdAt: 1}).toArray() : [];
  const products = await mongoose.connection.collection('products').find({}).toArray();
  console.log(JSON.stringify({orders, products}));
  await mongoose.disconnect();
}
run().catch(e => { console.error(e); process.exitCode = 1; });
""".replace("DB", json.dumps(DB)).replace("EMAIL", json.dumps(EMAIL))
    return json.loads(subprocess.run(["node", "-e", code], check=True, capture_output=True, text=True, encoding="utf-8").stdout)

def visuals(page, name):
    for width in [360, 768, 1440]:
        page.set_viewport_size({"width": width, "height": 1000})
        for theme in ["light", "dark"]:
            page.emulate_media(color_scheme=theme)
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (name, width, theme)
            assert page.locator("html").get_attribute("dir") == "rtl"
            assert page.locator("html").get_attribute("lang") == "fa"
            page.evaluate("document.fonts.ready")
            assert page.evaluate("Array.from(document.fonts).some(font => font.family.toLowerCase().includes('vazirmatn') && font.status === 'loaded')")
            page.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
            page.screenshot(path=str(Path(os.environ["TEMP"]) / f"launchox-{name}-{width}-{theme}.png"), full_page=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=str(Path(os.environ["ProgramFiles(x86)"]) / "Microsoft/Edge/Application/msedge.exe"), headless=True)
    context = browser.new_context(viewport={"width": 360, "height": 900}, extra_http_headers={"x-forwarded-for": "127.0.0.89"})
    page = context.new_page()
    page.set_default_timeout(60000)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    rows = context.request.get(f"{BASE}/api/products?inStock=true").json()["data"]["items"][:2]
    baseline = {product["_id"]: product for product in records()["products"]}
    assert len(rows) == 2
    for product in rows:
        page.goto(f"{BASE}/products/{product['slug']}")
        page.get_by_role("button", name="افزودن به سبد خرید", exact=True).click()
        expect(page.get_by_role("status").filter(has_text="سبد خرید به‌روز شد")).to_be_visible()
    page.goto(f"{BASE}/checkout")
    page.wait_for_url("**/login?**")
    page.goto(f"{BASE}/register?callbackUrl=/checkout")
    page.get_by_label("نام", exact=True).fill("کاربر آزمایشی سفارش")
    page.get_by_label("ایمیل", exact=True).fill(EMAIL)
    page.get_by_label("رمز عبور", exact=True).fill("Customer123!")
    page.get_by_label("تکرار رمز عبور", exact=True).fill("Customer123!")
    page.get_by_role("button", name="ثبت‌نام", exact=True).click()
    page.wait_for_url(f"{BASE}/checkout")
    expect(page.get_by_text("هنوز آدرسی ندارید", exact=False)).to_be_visible()
    expect(page.locator("[data-cart-count]")).to_have_text("۲")
    fields = {"عنوان آدرس": "خانه", "نام گیرنده": "علی رضایی", "موبایل گیرنده": "۱۲۳", "استان": "تهران", "شهر": "تهران", "کد پستی": "۱۲۳۴۵۶۷۸۹۰", "نشانی کامل": "خیابان آزادی، پلاک ۱۲"}
    for label, value in fields.items():
        page.get_by_label(label, exact=True).fill(value)
    page.get_by_role("button", name="ذخیرهٔ آدرس").click()
    expect(page.get_by_text("شمارهٔ موبایل باید", exact=False)).to_be_visible()
    page.get_by_label("موبایل گیرنده", exact=True).fill("۰۹۱۲۳۴۵۶۷۸۹")
    page.get_by_role("button", name="ذخیرهٔ آدرس").click()
    expect(page.get_by_role("status").filter(has_text="آدرس اضافه شد")).to_be_visible()
    expect(page.locator('input[name="addressId"]')).to_be_checked()
    page.get_by_label("یادداشت سفارش (اختیاری)").fill("با دقت بسته‌بندی شود")
    visuals(page, "checkout")
    page.get_by_role("button", name="پرداخت", exact=True).click()
    page.wait_for_url("**/checkout/fake-gateway?**")
    authority_url = page.url
    data = records()
    order = data["orders"][-1]
    assert order["status"] == "pending" and order["payment"]["status"] == "unpaid"
    assert order["note"] == "با دقت بسته‌بندی شود"
    for item in order["items"]:
        product = next(product for product in data["products"] if product["_id"] == item["product"])
        assert product["stock"] == baseline[item["product"]]["stock"] - item["quantity"]
    expect(page.locator("[data-cart-count]")).to_have_text("۰")
    visuals(page, "fake-gateway")
    page.get_by_role("link", name="پرداخت موفق", exact=True).click()
    page.wait_for_url("**/checkout/result?**")
    result_url = page.url
    expect(page.get_by_role("heading", name="پرداخت با موفقیت انجام شد")).to_be_visible()
    visuals(page, "payment-success")
    data = records()
    paid = data["orders"][-1]
    assert paid["status"] == "processing" and paid["payment"]["status"] == "paid"
    assert paid["payment"]["refId"] and paid["payment"]["paidAt"]
    authority = paid["payment"]["authority"]
    callback = f"{BASE}/api/payment/callback?authority={authority}&status=OK&amount=1"
    for _ in range(2):
        response = context.request.get(callback, max_redirects=0)
        assert response.status == 303
    assert records()["orders"][-1]["statusHistory"] == paid["statusHistory"]
    for item in paid["items"]:
        product = next(product for product in records()["products"] if product["_id"] == item["product"])
        assert product["soldCount"] == baseline[item["product"]]["soldCount"] + item["quantity"]
    other = browser.new_context(extra_http_headers={"x-forwarded-for": "127.0.0.90"})
    assert other.request.get(callback, max_redirects=0).status == 401
    other_page = other.new_page()
    other_page.goto(f"{BASE}/login")
    other_page.get_by_label("ایمیل", exact=True).fill("admin@launchox.local")
    other_page.get_by_label("رمز عبور", exact=True).fill("ChangeMe123!")
    other_page.get_by_role("button", name="ورود", exact=True).click()
    other_page.wait_for_url(f"{BASE}/")
    other_page.goto(result_url)
    expect(other_page.locator("[data-order-number]")).to_have_count(0)
    expect(other_page.get_by_role("heading", name="صفحه پیدا نشد")).to_be_visible()
    assert other.request.get(callback, max_redirects=0).status == 404
    assert context.request.get(f"{BASE}/api/payment/callback?authority=bad&status=OK").status == 400
    for product in rows:
        page.goto(f"{BASE}/products/{product['slug']}")
        page.get_by_role("button", name="افزودن به سبد خرید", exact=True).click()
        expect(page.get_by_role("status").filter(has_text="سبد خرید به‌روز شد")).to_be_visible()
    page.goto(f"{BASE}/checkout")
    expect(page.locator('input[name="addressId"]')).to_be_checked()
    page.get_by_role("button", name="پرداخت", exact=True).click()
    page.wait_for_url("**/checkout/fake-gateway?**")
    cancellation = page.get_by_role("link", name="انصراف", exact=True).get_attribute("href")
    page.get_by_role("link", name="انصراف", exact=True).click()
    page.wait_for_url("**/checkout/result?**")
    expect(page.get_by_role("heading", name="پرداخت انجام نشد")).to_be_visible()
    visuals(page, "payment-failure")
    cancelled = records()["orders"][-1]
    assert cancelled["status"] == "cancelled" and cancelled["payment"]["status"] == "failed"
    assert context.request.get(BASE + cancellation, max_redirects=0).status == 303
    for item in paid["items"]:
        product = next(product for product in records()["products"] if product["_id"] == item["product"])
        assert product["stock"] == baseline[item["product"]]["stock"] - item["quantity"]
    page.goto(f"{BASE}/checkout")
    expect(page.get_by_text("سبد خرید شما خالی است.")).to_be_visible()
    assert not errors, errors
    other.close()
    browser.close()
    print("PASS: guest cart -> registration -> address validation/add/select -> checkout -> reserved stock -> paid/processing; duplicate callbacks; cancellation/stock restore; ownership isolation; empty state; RTL/font; 360/768/1440 light/dark.")
