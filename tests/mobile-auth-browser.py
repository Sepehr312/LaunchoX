"""Check the approved auth UI against a local server started with SMS_IR_ENABLED=false."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = "http://127.0.0.1:3046"
OUTPUT = Path(__file__).resolve().parents[1] / "docs" / "auth-review"
OUTPUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    page.set_default_timeout(60000)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE + "/login?callbackUrl=%2Fcheckout")
    page.add_style_tag(content="nextjs-portal { display: none; }")
    expect(page.get_by_role("heading", name="ورود | ثبت‌نام", exact=True)).to_be_visible()
    expect(page.locator('input[name="email"]')).to_have_count(0)
    expect(page.locator('input[name="password"]')).to_have_count(0)
    assert page.locator("html").get_attribute("dir") == "rtl"
    page.screenshot(path=str(OUTPUT / "login-desktop.png"), full_page=True)
    page.set_viewport_size({"width": 360, "height": 800})
    page.screenshot(path=str(OUTPUT / "login-mobile.png"), full_page=True)
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    phone = page.locator('input[name="mobile"]')
    phone.fill("abc!123")
    expect(phone).to_have_value("")
    phone.fill("09")
    phone.press_sequentially("abc!+")
    expect(phone).to_have_value("09")
    phone.fill("08123456789")
    expect(phone).to_have_value("09")
    phone.fill("09123456789")
    phone.press_sequentially("5")
    expect(phone).to_have_value("09123456789")
    expect(phone).to_have_attribute("inputmode", "numeric")
    expect(phone).to_have_attribute("maxlength", "11")
    expect(page.get_by_text("دسترسی اولیهٔ مدیر", exact=True)).to_have_count(0)
    page.locator('input[name="mobile"]').fill("۰۹۱۲۳۴۵۶۷۸۹")
    page.evaluate("window.authNavigationMarker = 'same-document'")
    posts = []
    page.on("request", lambda request: posts.append(request.url) if request.method == "POST" else None)
    page.get_by_role("button", name="رمز عبور", exact=True).click()
    expect(page.locator('input[name="password"]')).to_be_visible()
    expect(page.locator('input[name="mobile"]')).to_have_value("۰۹۱۲۳۴۵۶۷۸۹")
    assert page.evaluate("window.authNavigationMarker") == "same-document"
    expect(page.locator('input[name="password"]')).to_have_attribute("autocomplete", "current-password")
    page.locator('input[name="password"]').fill("PrivateExample123!")
    page.get_by_role("button", name="کد پیامکی", exact=True).click()
    page.get_by_role("button", name="رمز عبور", exact=True).click()
    expect(page.locator('input[name="password"]')).to_have_value("")
    assert not posts, "Switching forms must not submit or send SMS"
    page.screenshot(path=str(OUTPUT / "password-mobile.png"), full_page=True)
    page.get_by_role("button", name="رمز عبور را فراموش کرده‌ام").click()
    expect(page.get_by_role("heading", name="بازیابی رمز عبور", exact=True)).to_be_visible()
    expect(page.get_by_text("رمز جدید باید حداقل ۸ کاراکتر و شامل یک حرف و یک رقم باشد.", exact=True)).to_have_count(0)
    assert page.evaluate("window.authNavigationMarker") == "same-document"
    page.goto(BASE + "/register?callbackUrl=%2Fcheckout")
    page.wait_for_url("**/login?callbackUrl=%2Fcheckout")
    page.reload()
    expect(page.locator('input[name="password"]')).to_have_count(0)
    assert page.evaluate("localStorage.length + sessionStorage.length") == 0
    assert not errors, errors
    response = page.goto(BASE + "/login/admin")
    assert response.status == 404
    browser.close()
print(json.dumps({"mobileWidth": 360, "horizontalOverflow": False, "switchWithoutReload": True, "smsRequestsWhileSwitching": 0, "registerPreservesCallback": True, "browserErrors": 0}))
