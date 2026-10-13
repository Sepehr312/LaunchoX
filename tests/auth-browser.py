"""Run against the local app using an externally installed Playwright and Edge."""
import json
import os
import atexit
import subprocess
from pathlib import Path
import re
import uuid
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("LAUNCHO_AUTH_TEST_URL", "http://localhost:3000")
settings = {}
for line in Path(".env.local").read_text(encoding="utf-8-sig").splitlines():
    if "=" in line and not line.lstrip().startswith("#"):
        key, value = line.split("=", 1)
        settings[key.strip()] = value.strip().strip('"').strip("'")


def cleanup_account(email):
    code = """
import mongoose from 'mongoose';
import { connectDB } from './src/lib/db';
import { User } from './src/models/user';
async function cleanup() {
  try {
    await connectDB();
    await User.deleteOne({ email: EMAIL, name: 'کاربر آزمایشی' });
  } finally { await mongoose.disconnect(); }
}
cleanup().catch(() => { console.error('Acceptance cleanup failed'); process.exitCode = 1; });
""".replace("EMAIL", json.dumps(email))
    subprocess.run(["node", "node_modules/tsx/dist/cli.mjs", "--conditions=react-server", "--env-file=.env.local", "-e", code], check=True, capture_output=True, text=True)
    print("Acceptance test account removed.")


def form_login(page, email, password, target="/account"):
    page.goto(f"{BASE}/login?callbackUrl={target}")
    page.get_by_label("ایمیل", exact=True).fill(email)
    page.get_by_label("رمز عبور", exact=True).fill(password)
    page.get_by_role("button", name="ورود", exact=True).click()


def check_mobile(page):
    assert page.evaluate("document.documentElement.lang") == "fa"
    assert page.evaluate("document.documentElement.dir") == "rtl"
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")


def session(context):
    return context.request.get(f"{BASE}/api/auth/session").json()


def register(page, email, confirm="Customer123!"):
    page.get_by_label("نام و نام خانوادگی", exact=True).fill("کاربر آزمایشی")
    page.get_by_label("ایمیل", exact=True).fill(email)
    page.get_by_label("رمز عبور", exact=True).fill("Customer123!")
    page.get_by_label("تکرار رمز عبور", exact=True).fill(confirm)
    page.get_by_role("button", name="ساخت حساب کاربری", exact=True).click()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=str(Path(os.environ["ProgramFiles(x86)"]) / "Microsoft/Edge/Application/msedge.exe"),
        headless=True,
    )
    browser_errors = []

    def context(ip):
        ctx = browser.new_context(viewport={"width": 360, "height": 800}, extra_http_headers={"x-forwarded-for": ip})
        ctx.on("page", lambda page: page.on("pageerror", lambda error: browser_errors.append(str(error))))
        return ctx

    guest = context("127.0.0.20")
    page = guest.new_page()
    for target in ["/account", "/account/addresses", "/admin", "/checkout"]:
        page.goto(BASE + target)
        expect(page).to_have_url(re.compile(r"/login\?callbackUrl="))
        assert "callbackUrl=" in page.url
    check_mobile(page)
    page.get_by_role("link", name="ثبت‌نام کنید").click()
    expect(page).to_have_url(re.compile(r"/register\?callbackUrl="))
    check_mobile(page)
    page.get_by_role("link", name="وارد شوید").click()
    expect(page).to_have_url(re.compile(r"/login\?callbackUrl="))

    for ip, email, password, role, target in [
        ("127.0.0.21", settings["SEED_ADMIN_EMAIL"], settings["SEED_ADMIN_PASSWORD"], "admin", "/admin"),
        ("127.0.0.22", "customer@launchox.local", "Customer123!", "customer", "/account"),
    ]:
        ctx = context(ip)
        page = ctx.new_page()
        form_login(page, email, password, target)
        expect(page).to_have_url(BASE + target, timeout=30000)
        data = session(ctx)
        assert data["user"]["role"] == role and data["user"]["id"]
        assert "password" not in json.dumps(data).lower()
        ttl = (datetime.fromisoformat(data["expires"].replace("Z", "+00:00")) - datetime.now(timezone.utc)).total_seconds()
        assert 29 * 86400 < ttl <= 30 * 86400
        assert any(cookie["httpOnly"] for cookie in ctx.cookies() if "session-token" in cookie["name"])
        check_mobile(page)
        for auth_page in ["/login", "/register"]:
            page.goto(BASE + auth_page)
            expect(page).to_have_url(BASE + "/account")
            expect(page.locator('header a[aria-label="حساب کاربری"]')).to_have_attribute("href", "/account")
        if role == "customer":
            response = page.goto(BASE + "/admin")
            assert response.status == 404, f"Expected actual 404, got {response.status}"
            expect(page.get_by_role("heading", name="صفحه یا مورد موردنظر پیدا نشد")).to_be_visible()
            assert "پنل مدیریت" not in page.locator("body").inner_text()
        page.goto(BASE + target)
        page.get_by_role("button", name=re.compile(r"^خروج(?: از حساب)?$")).click()
        expect(page).to_have_url(BASE + "/", timeout=30000)
        assert not session(ctx)
        page.goto(BASE + "/account")
        expect(page).to_have_url(re.compile(r"/login\?callbackUrl="))
        ctx.close()

    wrong = context("127.0.0.23")
    page = wrong.new_page()
    for email in ["unknown@launchox.local", "customer@launchox.local"]:
        form_login(page, email, "WrongPassword123!")
        expect(page.locator("form [role=alert]")).to_have_text("ایمیل یا رمز عبور اشتباه است", timeout=30000)
        assert not session(wrong)

    limited = context("127.0.0.24")
    page = limited.new_page()
    for index in range(6):
        form_login(page, "customer@launchox.local", "WrongPassword123!")
        expected = "ایمیل یا رمز عبور اشتباه است" if index < 5 else "تعداد تلاش‌ها بیش از حد مجاز است؛ پس از ۱۵ دقیقه دوباره تلاش کنید"
        expect(page.locator("form [role=alert]")).to_have_text(expected, timeout=30000)

    registered = context("127.0.0.25")
    page = registered.new_page()
    email = f"step6-{uuid.uuid4().hex}@launchox.local"
    atexit.register(cleanup_account, email)
    page.goto(BASE + "/register?callbackUrl=/account")
    register(page, email, "Mismatch123!")
    expect(page.locator("#confirmPassword-error")).to_have_text("تکرار رمز عبور یکسان نیست", timeout=30000)
    expect(page.get_by_label("نام و نام خانوادگی", exact=True)).to_have_value("کاربر آزمایشی")
    expect(page.get_by_label("ایمیل", exact=True)).to_have_value(email)
    expect(page.get_by_label("رمز عبور", exact=True)).to_have_value("Customer123!")
    page.get_by_label("تکرار رمز عبور", exact=True).fill("Customer123!")
    page.evaluate("""() => {
      const role = document.createElement('input');
      role.name = 'role'; role.value = 'admin'; role.type = 'hidden';
      document.querySelector('form').append(role);
    }""")
    page.get_by_role("button", name="ساخت حساب کاربری", exact=True).click()
    expect(page).to_have_url(BASE + "/account", timeout=30000)
    assert session(registered)["user"]["role"] == "customer"
    page.get_by_role("button", name=re.compile(r"^خروج(?: از حساب)?$")).click()
    expect(page).to_have_url(BASE + "/")
    form_login(page, email, "Customer123!")
    expect(page).to_have_url(BASE + "/account", timeout=30000)
    duplicate = context("127.0.0.26")
    page = duplicate.new_page()
    page.goto(BASE + "/register")
    register(page, email)
    expect(page.locator("form [role=alert]")).to_have_text("این ایمیل قبلاً ثبت شده است", timeout=30000)

    safe = context("127.0.0.27")
    page = safe.new_page()
    page.goto(BASE + "/login?callbackUrl=https://evil.example")
    assert page.locator('input[name="callbackUrl"]').input_value() == "/"

    register_limit = context("127.0.0.28")
    page = register_limit.new_page()
    for index in range(6):
        page.goto(BASE + "/register")
        register(page, email, "Mismatch123!")
        expected = "اطلاعات ثبت‌نام معتبر نیست" if index < 5 else "تعداد تلاش‌ها بیش از حد مجاز است؛ پس از ۱۵ دقیقه دوباره تلاش کنید"
        expect(page.locator("form [role=alert]")).to_have_text(expected, timeout=30000)

    direct = context("127.0.0.29")
    csrf = direct.request.get(BASE + "/api/auth/csrf").json()["csrfToken"]
    for index in range(6):
        response = direct.request.post(BASE + "/api/auth/callback/credentials", form={
            "email": "customer@launchox.local", "password": "WrongPassword123!",
            "csrfToken": csrf, "callbackUrl": BASE + "/account",
        }, headers={"X-Auth-Return-Redirect": "1"})
        target = response.json()["url"]
        assert ("code=credentials" if index < 5 else "code=rate_limit") in target
    assert not session(direct)

    assert not browser_errors, browser_errors
    print("PASS: seeded admin/customer login and logout, real customer/admin 404, guest guards, registration and auto-login, errors, rate limits, callback validation, RTL and 360px forms.")
    print(f"Temporary acceptance account: {email}")
    browser.close()
