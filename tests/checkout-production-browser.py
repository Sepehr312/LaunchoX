"""Verify the fake gateway is disabled against a production build on an isolated DB."""
import os
import uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("LAUNCHO_PRODUCTION_TEST_URL", "http://localhost:3020")
expect.set_options(timeout=30000)
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=str(Path(os.environ["ProgramFiles(x86)"]) / "Microsoft/Edge/Application/msedge.exe"), headless=True)
    context = browser.new_context(extra_http_headers={"x-forwarded-for": "127.0.0.91"})
    page = context.new_page()
    page.goto(f"{BASE}/login?callbackUrl=/checkout")
    page.get_by_label("ایمیل", exact=True).fill("customer@launchox.local")
    page.get_by_label("رمز عبور", exact=True).fill("Customer123!")
    page.get_by_role("button", name="ورود", exact=True).click()
    page.wait_for_url(f"{BASE}/checkout")
    rows = context.request.get(f"{BASE}/api/products?inStock=true").json()["data"]["items"]
    product = rows[0]
    page.goto(f"{BASE}/products/{product['slug']}")
    page.get_by_role("button", name="افزودن به سبد خرید", exact=True).click()
    expect(page.get_by_role("status").filter(has_text="سبد خرید به‌روز شد")).to_be_visible()
    page.goto(f"{BASE}/checkout")
    page.get_by_role("button", name="پرداخت", exact=True).click()
    expect(page.get_by_role("alert").filter(has_text="درگاه آزمایشی در محیط عملیاتی غیرفعال است")).to_be_visible()
    assert page.url == f"{BASE}/checkout"
    page.goto(f"{BASE}/cart")
    expect(page.locator("[data-cart-item]")).to_have_count(1)
    authority = str(uuid.uuid4())
    page.goto(f"{BASE}/checkout/fake-gateway?authority={authority}")
    expect(page.get_by_role("heading", name="صفحه پیدا نشد")).to_be_visible()
    expect(page.get_by_role("link", name="پرداخت موفق", exact=True)).to_have_count(0)
    assert context.request.get(f"{BASE}/api/payment/callback?authority={authority}&status=OK", max_redirects=0).status == 403
    page.goto(f"{BASE}/cart")
    page.get_by_role("button", name="حذف از سبد", exact=True).click()
    expect(page.get_by_text("سبد خرید شما خالی است.")).to_be_visible()
    browser.close()
    print("PASS: production disables fake checkout before cart/stock mutation; gateway hidden; callback 403.")
