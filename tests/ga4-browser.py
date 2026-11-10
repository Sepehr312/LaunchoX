"""Exercise the production App Router observer without sending data to Google."""
import json
import os
import re
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import time
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
base = "http://localhost:3044"
measurement_id = "G-G60YTNFZEF"
development = "--development" in sys.argv
environment = {
    **os.environ,
    "NODE_ENV": "development" if development else "production",
    "AUTH_URL": base,
    "AUTH_SECRET": secrets.token_hex(32),
    "MONGODB_URI": "mongodb://127.0.0.1:27017/launchox_ga4_read_only_test",
    "NEXT_PUBLIC_GA_MEASUREMENT_ID": measurement_id,
    "SMS_IR_ENABLED": "false",
}

with tempfile.TemporaryFile() as output:
    server = subprocess.Popen(
        ["node", "node_modules/next/dist/bin/next", "dev" if development else "start", "-p", "3044"],
        cwd=root, env=environment, stdout=output, stderr=output,
    )
    try:
        for attempt in range(90):
            try:
                with urlopen(base + "/login", timeout=2) as response:
                    if response.status == 200:
                        break
            except OSError:
                if server.poll() is not None:
                    raise RuntimeError("Production server exited before readiness")
                time.sleep(1)
        else:
            raise RuntimeError("Production server did not become ready")

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(channel="msedge", headless=True)
            context = browser.new_context()
            loaded = []
            blocked = []

            def google_request(route):
                if "googletagmanager.com/gtag/js" in route.request.url:
                    loaded.append(route.request.url)
                    route.fulfill(status=200, content_type="application/javascript", body="window.__ga4Loads = (window.__ga4Loads || 0) + 1;")
                else:
                    blocked.append(route.request.url)
                    route.abort()

            context.route(re.compile(r"^https://[^/]*(?:google|doubleclick)[^/]*/"), google_request)
            page = context.new_page()
            page.goto(base + "/login")
            page.wait_for_timeout(1000)
            assert not loaded, "Excluded initial page loaded Google tag"
            page.goto(base + "/?email=private%40example.com#secret-token")
            if development:
                page.wait_for_timeout(1000)
                assert not loaded
                assert page.evaluate("typeof window.dataLayer") == "undefined"
                assert not blocked
                browser.close()
                print("PASS development: no Google script, tracking queue or analytics requests despite configured measurement ID")
                sys.exit(0)
            page.wait_for_function("window.dataLayer && Array.from(window.dataLayer).some(x => x[0] === 'event')")

            def events():
                return page.evaluate("Array.from(window.dataLayer || []).map(x => Array.from(x)).filter(x => x[0] === 'event')")

            assert len(events()) == 1
            page.locator('a[href="/products"]').first.click()
            page.wait_for_url(base + "/products")
            page.wait_for_function("window.dataLayer.filter(x => x[0] === 'event').length === 2")
            page.evaluate("history.pushState({}, '', '/products?email=private@example.com#secret-token')")
            page.wait_for_timeout(300)
            assert len(events()) == 2, "Query/hash change counted as a view"
            page.go_back()
            page.go_back()
            page.wait_for_function("window.dataLayer.filter(x => x[0] === 'event').length === 3")

            for path in ["/admin", "/admin/users", "/account/orders/private-order", "/checkout/result?token=secret-token", "/login"]:
                page.evaluate("path => history.pushState({}, '', path)", path)
                page.wait_for_function("window['ga-disable-G-G60YTNFZEF'] === true")
                assert len(events()) == 3

            page.evaluate("history.pushState({}, '', '/products/private@example.com')")
            page.wait_for_function("window.dataLayer.filter(x => x[0] === 'event').length === 4")
            assert events()[-1][2]["page_location"] == base + "/products/[slug]"
            commands = page.evaluate("window.dataLayer.map(x => Array.from(x))")
            payload = json.dumps(commands, default=str)
            assert "private@example.com" not in payload
            assert "secret-token" not in payload
            assert "private-order" not in payload
            assert len([x for x in commands if x and x[0] == "config"]) == 1
            page.wait_for_function("typeof window.__ga4Loads === 'number'", timeout=5000)
            assert page.evaluate("window.__ga4Loads") == 1, f"Unexpected tag executions: {page.evaluate('window.__ga4Loads')}; requests: {len(loaded)}"
            assert page.locator('script[src*="googletagmanager.com/gtag/js"]').count() == 1
            assert not blocked, "Unexpected outbound Google request"
            browser.close()
            print(f"PASS production: initial view, App Router navigation, query/hash exclusion, Back, private routes, sanitized payloads, one script execution ({len(loaded)} resource requests); no data sent to Google")
    finally:
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(server.pid), "/T", "/F"], capture_output=True, check=False)
        else:
            server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()
