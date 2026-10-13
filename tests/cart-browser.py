"""Stage 8 acceptance against the built application; removes only its own data."""
import json
import os
import subprocess
import uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("LAUNCHO_CART_TEST_URL", "http://localhost:3018")
email = f"cart-{uuid.uuid4()}@example.com"
guest_ids = []

def cleanup():
    code = """
import mongoose from 'mongoose';
import { connectDB } from './src/lib/db';
import { User } from './src/models/user';
import { Cart } from './src/models/cart';
async function cleanup() {
  try {
    await connectDB();
    const user = await User.findOne({ email: EMAIL, name: 'کاربر آزمایشی سبد' }).lean();
    if (user) { await Cart.deleteMany({ user: user._id }); await User.deleteOne({ _id: user._id }); }
    await Cart.deleteMany({ guestId: { $in: GUESTS } });
  } finally { await mongoose.disconnect(); }
}
cleanup().catch(() => { console.error('Cart acceptance cleanup failed'); process.exitCode = 1; });
""".replace("EMAIL", json.dumps(email)).replace("GUESTS", json.dumps(guest_ids))
    subprocess.run(["node", "node_modules/tsx/dist/cli.mjs", "--conditions=react-server", "--env-file=.env.local", "-e", code], check=True, capture_output=True)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=str(Path(os.environ["ProgramFiles(x86)"]) / "Microsoft/Edge/Application/msedge.exe"), headless=True)
        context = browser.new_context(viewport={"width": 360, "height": 800}, extra_http_headers={"x-forwarded-for": "127.0.0.88"})
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        products = context.request.get(f"{BASE}/api/products?inStock=true").json()
        # Public endpoint wraps the paginated DTO in ActionResult.
        if "data" in products: products = products["data"]
        rows = products["items"][:2]
        assert len(rows) == 2
        page.goto(f"{BASE}/cart")
        expect(page.get_by_role("heading", name="سبد خرید شما خالی است", exact=True)).to_be_visible()
        assert not any(c["name"] == "cart_id" for c in context.cookies())
        for product in rows:
            page.goto(f"{BASE}/products/{product['slug']}")
            page.get_by_role("button", name="افزودن به سبد خرید", exact=True).click()
            expect(page.get_by_role("status").filter(has_text="سبد خرید به‌روز شد")).to_be_visible()
        cookie = next(c for c in context.cookies() if c["name"] == "cart_id")
        guest_ids.append(cookie["value"])
        assert cookie["httpOnly"] and cookie["sameSite"] == "Lax"
        page.goto(f"{BASE}/cart")
        expect(page.locator("[data-cart-item]")).to_have_count(2)
        expect(page.locator("[data-cart-count]")).to_have_text("۲")
        page.reload()
        expect(page.locator("[data-cart-item]")).to_have_count(2)
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        for product in rows:
            article = page.locator("[data-cart-item]").filter(has_text=product["title"])
            expect(article.get_by_role("button", name="کاهش تعداد")).to_be_disabled()
            expect(article.locator("output")).to_have_text("۱")
        page.goto(f"{BASE}/register?callbackUrl=/cart")
        page.get_by_label("نام و نام خانوادگی", exact=True).fill("کاربر آزمایشی سبد")
        page.get_by_label("ایمیل", exact=True).fill(email)
        page.get_by_label("رمز عبور", exact=True).fill("Customer123!")
        page.get_by_label("تکرار رمز عبور", exact=True).fill("Customer123!")
        page.get_by_role("button", name="ساخت حساب کاربری", exact=True).click()
        page.wait_for_url(f"{BASE}/cart")
        expect(page.locator("[data-cart-item]")).to_have_count(2)
        assert not any(c["name"] == "cart_id" for c in context.cookies())
        # A new guest cart merges into the same existing customer cart on login.
        context.clear_cookies()
        for product in rows:
            page.goto(f"{BASE}/products/{product['slug']}")
            page.get_by_role("button", name="افزودن به سبد خرید", exact=True).click()
            expect(page.get_by_role("status").filter(has_text="سبد خرید به‌روز شد")).to_be_visible()
        guest_ids.append(next(c["value"] for c in context.cookies() if c["name"] == "cart_id"))
        page.goto(f"{BASE}/login?callbackUrl=/cart")
        page.get_by_label("ایمیل", exact=True).fill(email)
        page.get_by_label("رمز عبور", exact=True).fill("Customer123!")
        page.get_by_role("button", name="ورود", exact=True).click()
        page.wait_for_url(f"{BASE}/cart")
        expect(page.locator("[data-cart-item]")).to_have_count(2)
        first = page.locator("[data-cart-item]").filter(has_text=rows[0]["title"])
        expect(first.locator("output")).to_have_text(str(min(2, rows[0]["stock"])).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")))
        if rows[0]["stock"] > 1:
            first.get_by_role("button", name="کاهش تعداد", exact=True).click()
        expected_count = str(1 + min(2, rows[1]["stock"])).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))
        expect(page.locator("[data-cart-count]")).to_have_text(expected_count)
        expect(first.locator("output")).to_have_text("۱")
        for width in [360, 1440]:
            page.set_viewport_size({"width": width, "height": 900})
            for theme in ["light", "dark"]:
                page.emulate_media(color_scheme=theme)
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (width, theme)
                assert page.locator("html").get_attribute("dir") == "rtl"
                page.screenshot(path=str(Path(os.environ["TEMP"]) / f"launchox-cart-{width}-{theme}.png"), full_page=True)
        page.on("dialog", lambda dialog: dialog.accept())
        first.get_by_role("button", name="حذف از سبد", exact=True).click()
        expect(page.locator("[data-cart-item]")).to_have_count(1)
        page.get_by_role("button", name="حذف از سبد", exact=True).click()
        expect(page.get_by_role("heading", name="سبد خرید شما خالی است", exact=True)).to_be_visible()
        expect(page.locator("[data-cart-count]")).to_have_text("۰")
        assert not errors, errors
        browser.close()
        print("PASS: guest persistence, register/login merge, stock limits, header updates, quantity/removal, empty state, RTL, 360/1440px and light/dark.")
finally:
    cleanup()
