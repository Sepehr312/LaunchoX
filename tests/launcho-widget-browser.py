"""Check the live assistant and App Router visibility against a running local app."""
import json
import sys
from playwright.sync_api import sync_playwright, expect

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
loader = "https://ag.launchox.ir/widget/loader.js"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="msedge", headless=True)
    try:
        for width, height in [(1440, 1000), (360, 800)]:
            context = browser.new_context(viewport={"width": width, "height": height})
            requests = []
            context.on("request", lambda request: requests.append(request.url))
            page = context.new_page()
            page.goto(base + "/login", wait_until="domcontentloaded")
            host = page.locator("#launcho-widget")
            button = host.get_by_role("button", name="دستیار لانچو", exact=True)
            expect(button).to_be_visible(timeout=60000)
            assert page.locator(f'script[src="{loader}"]').count() == 1
            page.evaluate("window.__originalLaunchoHost = document.getElementById('launcho-widget')")
            button.click()
            frame = host.locator("iframe")
            expect(frame).to_be_visible(timeout=60000)
            expect(host.locator(".feedback")).to_be_hidden(timeout=60000)
            assert frame.get_attribute("src").startswith("https://ag.launchox.ir/widget/widget.html#")
            expect(frame.content_frame.get_by_role("heading", name="دستیار لانچو")).to_be_visible()
            bounds = host.locator(".panel").bounding_box()
            assert bounds and bounds["x"] >= 0 and bounds["x"] + bounds["width"] <= width
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")

            button.click()
            page.locator('a[href="/"]').first.click()
            expect(page).to_have_url(base + "/", timeout=60000)
            page.locator('footer a[href="/products"]').first.click(timeout=60000)
            expect(page).to_have_url(base + "/products", timeout=60000)
            expect(button).to_be_visible()
            assert page.evaluate("window.__originalLaunchoHost === document.getElementById('launcho-widget')")
            button.click()
            expect(frame).to_be_visible()

            # Next.js integrates native history with usePathname, without admin credentials.
            # This tests client route transitions; it does not bypass server admin guards.
            for path in ["/admin", "/admin/products"]:
                page.evaluate("path => history.pushState(null, '', path)", path)
                expect(button).to_be_hidden()
                expect(frame).to_be_hidden()
            page.evaluate("history.pushState(null, '', '/login')")
            expect(button).to_be_visible()
            expect(frame).to_be_visible()
            assert page.evaluate("window.__originalLaunchoHost === document.getElementById('launcho-widget')")
            assert host.count() == 1
            assert requests.count(loader) == 1
            assert page.locator(f'script[src="{loader}"]').count() == 1
            page.evaluate("history.pushState(null, '', '/administrator')")
            expect(button).to_be_visible()
            page.evaluate("history.pushState(null, '', '/login')")
            page.reload(wait_until="domcontentloaded")
            expect(button).to_be_visible(timeout=60000)
            assert page.locator(f'script[src="{loader}"]').count() == 1
            print(json.dumps({"viewport": width, "live_widget": "passed", "admin_hidden": "passed", "reload": "passed"}))
            context.close()
    finally:
        browser.close()
