import asyncio
import os
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.async_api import async_playwright, expect

BASE_URL = os.environ.get("LAUNCHO_CATEGORY_TEST_URL", "http://127.0.0.1:3000")


async def main():
    edge = Path(os.environ["PROGRAMFILES(X86)"]) / "Microsoft/Edge/Application/msedge.exe"
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(executable_path=str(edge), headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        await page.goto(BASE_URL, wait_until="networkidle")
        links = page.locator('[data-arctic-categories] li a')
        assert await links.count() == 8
        destinations = await links.evaluate_all("nodes => nodes.map(node => ({href: node.getAttribute('href'), name: node.textContent.trim()}))")
        for destination in destinations:
            await page.goto(BASE_URL + destination["href"], wait_until="networkidle")
            await expect(page.locator("h1")).to_have_text(destination["name"])
            assert await page.locator('aside details').count() == 4
            assert await page.locator('aside input[role="switch"]').count() == 2
        await page.goto(BASE_URL + "/categories/digital?limit=1", wait_until="networkidle")
        requests = []
        def record_request(request):
            if "/api/products?" in request.url:
                requests.append(request.url)
        page.on("request", record_request)
        stock = page.locator('aside input[role="switch"]').first
        await stock.check()
        await page.wait_for_url("**inStock=true**")
        assert urlparse(page.url).path == "/categories/digital"
        await page.reload(wait_until="networkidle")
        await expect(stock).to_be_checked()
        await page.locator('aside button').first.click()
        await page.wait_for_url(BASE_URL + "/categories/digital")
        await expect(stock).not_to_be_checked()
        await page.go_back(wait_until="networkidle")
        await expect(stock).to_be_checked()
        await page.go_forward(wait_until="networkidle")
        await expect(stock).not_to_be_checked()
        await page.locator('select').select_option("price_desc")
        await page.wait_for_url("**sort=price_desc**")
        await page.locator('[data-catalog-load-more]').scroll_into_view_if_needed()
        await page.wait_for_load_state("networkidle")
        page.remove_listener("request", record_request)
        for url in set(requests):
            params = parse_qs(urlparse(url).query)
            assert "category" in params, url
            response = await page.request.get(url)
            assert response.ok, url
            body = await response.json()
            assert all(item["category"]["slug"] == "digital" for item in body["data"]["items"])
        assert any("page=" in url for url in requests), "Incremental loading must be exercised"
        for width in [360, 768, 1440]:
            await page.set_viewport_size({"width": width, "height": 900})
            for theme in ["light", "dark"]:
                await page.evaluate("theme => { localStorage.setItem('launchox-preview-theme', theme); dispatchEvent(new StorageEvent('storage', {key: 'launchox-preview-theme', newValue: theme})); }", theme)
                await page.goto(BASE_URL + "/categories/clothing", wait_until="networkidle")
                await expect(page.locator('[data-products-catalog]')).to_have_attribute("data-theme", theme)
                assert await page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (width, theme)
                if width < 1024:
                    await page.locator('[data-products-catalog] button[aria-haspopup="dialog"]').click()
                    drawer = page.locator("dialog[open]")
                    assert await drawer.locator("details").count() == 4
                    await drawer.locator('input[role="switch"]').first.check()
                    await page.wait_for_url("**inStock=true**")
                    await expect(drawer).to_be_visible()
                    await drawer.locator('button').last.click()
                    await expect(drawer).not_to_be_visible()
        assert not errors, errors
        print("PASS: eight category destinations, scoped filters/reset/history/reload/sort/loading, mobile panels, responsive themes")
        await browser.close()


asyncio.run(main())
