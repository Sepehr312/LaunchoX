import asyncio
import os
import re
import time
from pathlib import Path
from urllib.parse import urlencode, urlparse

from playwright.async_api import async_playwright, expect

BASE_URL = os.environ.get("LAUNCHO_PRODUCTS_TEST_URL", "http://127.0.0.1:3002")
DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")


def attribute(product, key):
    return next((item["value"] for item in product["attributes"] if item["key"] == key), "")


def capacity_group(product):
    number = re.match(r"\s*([0-9]+(?:\.[0-9]+)?)", attribute(product, "ظرفیت").translate(DIGITS).replace("٬", "").replace(",", ""))
    if not number:
        return None
    value = float(number.group(1))
    return "small" if value < 400 else "medium" if value <= 600 else "large"


async def fetch_all(request, params):
    products = []
    page = 1
    while True:
        response = await request.get(f"{BASE_URL}/api/products?{urlencode({**params, 'page': page}, doseq=True)}")
        assert response.status == 200, await response.text()
        data = (await response.json())["data"]
        products.extend(data["items"])
        if page >= data["totalPages"]:
            assert len(products) == data["total"]
            assert len({item["id"] for item in products}) == len(products)
            return products
        page += 1


async def main():
    edge = Path(os.environ["PROGRAMFILES(X86)"]) / "Microsoft/Edge/Application/msedge.exe"
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(executable_path=str(edge), headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        products = await fetch_all(page.request, {"limit": 48})
        assert products, "Catalog must contain products for browser acceptance"
        brands = sorted({attribute(item, "برند") for item in products} - {""})
        energies = sorted({attribute(item, "رده انرژی") for item in products} - {""})

        # Compare every server-side filter against the full, unfiltered dataset.
        cases = [({"brands": brand}, lambda item, brand=brand: attribute(item, "برند") == brand) for brand in brands]
        cases += [({"energies": energy}, lambda item, energy=energy: attribute(item, "رده انرژی") == energy) for energy in energies]
        cases += [({"capacity": group}, lambda item, group=group: capacity_group(item) == group) for group in ["small", "medium", "large"]]
        cases += [({"discounted": "true", "sort": "discount"}, lambda item: item.get("compareAtPrice", 0) > item["price"])]
        cases += [({"brands": brands, "energies": energies, "capacity": "medium", "inStock": "true", "discounted": "true"}, lambda item: bool(attribute(item, "برند")) and bool(attribute(item, "رده انرژی")) and capacity_group(item) == "medium" and item["stock"] > 0 and item.get("compareAtPrice", 0) > item["price"])]
        for params, matches in cases:
            result = await fetch_all(page.request, {**params, "limit": 2})
            assert {item["id"] for item in result} == {item["id"] for item in products if matches(item)}, params
            if params.get("sort") == "discount":
                percentages = [1 - item["price"] / item["compareAtPrice"] for item in result]
                assert percentages == sorted(percentages, reverse=True)

        candidate = next(item for item in products if item.get("compareAtPrice", 0) > item["price"] and item["stock"] > 0 and capacity_group(item) and attribute(item, "برند") and attribute(item, "رده انرژی"))
        await page.goto(f"{BASE_URL}/products", wait_until="networkidle")
        sidebar = page.locator("aside")
        assert await sidebar.get_by_role("button", name="اعمال فیلترها", exact=True).count() == 0
        sections = sidebar.locator('details')
        assert await sections.count() == 4
        assert await sidebar.locator('details input[role="switch"]').count() == 0
        for section in await sections.all():
            summary = section.locator('summary')
            await expect(section.locator('fieldset')).to_be_hidden()
            await summary.click()
            await expect(section.locator('fieldset')).to_be_visible()
            await summary.press("Enter")
            await expect(section.locator('fieldset')).to_be_hidden()
            await summary.press("Enter")
            await expect(section.locator('fieldset')).to_be_visible()
        for switch in await sidebar.locator('input[role="switch"]').all():
            await expect(switch).to_be_visible()
        filter_requests = []
        page.on("request", lambda request: filter_requests.append(request.url))
        started = time.perf_counter()
        await sidebar.get_by_label(attribute(candidate, "برند"), exact=True).check()
        await page.wait_for_url("**brands=**")
        first_filter_ms = round((time.perf_counter() - started) * 1000)
        await page.wait_for_load_state("networkidle")
        await sections.first.locator('summary').click()
        await sidebar.get_by_label(attribute(candidate, "رده انرژی"), exact=True).check()
        await page.wait_for_url("**energies=**")
        await page.wait_for_load_state("networkidle")
        await expect(sections.first.locator('fieldset')).to_be_hidden()
        assert await sidebar.get_by_label(attribute(candidate, "برند"), exact=True).is_checked()
        await sections.first.locator('summary').press("Enter")
        await sidebar.locator(f'input[type="radio"][value="{capacity_group(candidate)}"]').check()
        await page.wait_for_url("**capacity=**")
        await page.wait_for_load_state("networkidle")
        await sidebar.locator('input[role="switch"]').nth(0).check()
        await page.wait_for_url("**inStock=true**")
        await page.wait_for_load_state("networkidle")
        await sidebar.locator('input[role="switch"]').nth(1).check()
        await page.wait_for_url("**discounted=true**")
        await page.wait_for_load_state("networkidle")
        for key in ["brands", "energies", "capacity", "inStock", "discounted"]:
            assert key in page.url
        assert any("/api/products?" in url for url in filter_requests)
        assert not any("_rsc=" in url and ("brands=" in url or "inStock=" in url) for url in filter_requests), filter_requests
        await page.reload(wait_until="networkidle")
        assert await sidebar.get_by_label(attribute(candidate, "برند"), exact=True).is_checked()
        assert await sidebar.get_by_label(attribute(candidate, "رده انرژی"), exact=True).is_checked()
        await page.locator("select").select_option("discount")
        await page.wait_for_url("**sort=discount**")
        await page.wait_for_load_state("networkidle")
        api = await page.request.get(f"{BASE_URL}/api/products?{urlparse(page.url).query}")
        data = (await api.json())["data"]
        links = await page.locator('[data-arctic-product-card] a').evaluate_all("nodes => nodes.map(node => node.getAttribute('href'))")
        assert links == [f"/products/{item['slug']}" for item in data["items"]]
        assert candidate["id"] in {item["id"] for item in data["items"]}

        params = {"brands": brands, "energies": energies, "limit": 6, "sort": "discount"}
        expected = await fetch_all(page.request, params)
        await page.goto(f"{BASE_URL}/products?{urlencode(params, doseq=True)}", wait_until="networkidle")
        assert await page.locator('nav[aria-label="صفحه‌بندی محصولات"]').count() == 0
        cards = page.locator('[data-arctic-product-card]')
        for _ in range(len(expected)):
            count = await cards.count()
            if count == len(expected):
                break
            await page.locator('[data-catalog-load-more]').scroll_into_view_if_needed()
            await expect(cards).not_to_have_count(count)
        links = await cards.locator('a').evaluate_all("nodes => nodes.map(node => node.getAttribute('href'))")
        assert links == [f"/products/{item['slug']}" for item in expected]
        assert len(links) == len(set(links))
        await expect(page.locator('[data-catalog-load-more]')).to_have_text("همهٔ محصولات نمایش داده شدند")
        assert page.url.count("brands=") == len(brands)
        assert page.url.count("energies=") == len(energies)
        assert "page=" not in page.url
        await page.evaluate("window.scrollTo({top: document.querySelector('aside').parentElement.offsetTop + 150, behavior: 'instant'})")
        await page.wait_for_timeout(100)
        first_top = await sidebar.evaluate("node => node.getBoundingClientRect().top")
        await page.evaluate("window.scrollBy({top: 250, behavior: 'instant'})")
        await page.wait_for_timeout(100)
        second_top = await sidebar.evaluate("node => node.getBoundingClientRect().top")
        assert abs(first_top - 100) < 2 and abs(second_top - first_top) < 2, (first_top, second_top)
        assert await sidebar.evaluate("node => node.clientHeight <= innerHeight - 100")
        assert await sidebar.evaluate("node => getComputedStyle(node).scrollbarWidth") == "none"
        for summary in await sections.locator('summary').all():
            await summary.click()
        await page.set_viewport_size({"width": 1440, "height": 600})
        maximum_scroll = await sidebar.evaluate("node => { node.scrollTop = 0; return node.scrollHeight - node.clientHeight; }")
        assert maximum_scroll > 0
        await sidebar.hover()
        await page.mouse.wheel(0, 300)
        await expect(sidebar).to_have_js_property("scrollTop", min(300, maximum_scroll))
        await sidebar.evaluate("node => node.scrollTop = node.scrollHeight")
        page_scroll = await page.evaluate("scrollY")
        await page.mouse.wheel(0, 250)
        await page.wait_for_function("previous => scrollY > previous", arg=page_scroll)
        await sidebar.evaluate("node => node.scrollTop = 0")
        page_scroll = await page.evaluate("scrollY")
        await page.mouse.wheel(0, -250)
        await page.wait_for_function("previous => scrollY < previous", arg=page_scroll)
        await page.set_viewport_size({"width": 1440, "height": 1000})
        await sidebar.locator('input[role="switch"]').nth(0).check()
        await page.wait_for_url("**inStock=true**")
        await page.wait_for_load_state("networkidle")
        filtered = await fetch_all(page.request, {**params, "inStock": "true"})
        filtered_links = {f"/products/{item['slug']}" for item in filtered}
        assert set(await cards.locator('a').evaluate_all("nodes => nodes.map(node => node.getAttribute('href'))")).issubset(filtered_links)

        failed_once = False
        async def fail_next_batch(route):
            nonlocal failed_once
            if "page=2" in route.request.url and not failed_once:
                failed_once = True
                await route.fulfill(status=500, content_type="application/json", body='{"error":"Temporary error"}')
            else:
                await route.continue_()
        await page.route("**/api/products?**", fail_next_batch)
        await page.goto(f"{BASE_URL}/products?limit=6", wait_until="networkidle")
        await page.locator('[data-catalog-load-more]').scroll_into_view_if_needed()
        await expect(page.get_by_role("button", name="تلاش دوباره", exact=True)).to_be_visible()
        assert await cards.count() == 6
        await page.get_by_role("button", name="تلاش دوباره", exact=True).click()
        await expect(cards).not_to_have_count(6)
        await expect(page.locator('[data-products-catalog] main > [role="alert"]')).to_have_count(0)
        await page.unroute("**/api/products?**", fail_next_batch)

        for width in [360, 768, 1440]:
            await page.set_viewport_size({"width": width, "height": 1000})
            for theme in ["light", "dark"]:
                await page.add_init_script(f"localStorage.setItem('launchox-preview-theme', '{theme}')")
                await page.goto(f"{BASE_URL}/products", wait_until="networkidle")
                assert await page.locator('[data-products-catalog]').get_attribute("data-theme") == theme
                assert await sidebar.locator('details[open]').count() == 0
                if width == 360 and theme == "light":
                    count = await cards.count()
                    await page.locator('[data-catalog-load-more]').scroll_into_view_if_needed()
                    await expect(cards).not_to_have_count(count)
                    await page.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
                if width < 1024:
                    trigger = page.locator('[aria-haspopup="dialog"][aria-controls]').last
                    await trigger.click()
                    drawer = page.locator("dialog[open]")
                    assert await drawer.locator("fieldset").count() == 5
                    assert await drawer.locator('details input[role="switch"]').count() == 0
                    for section in await drawer.locator('details').all():
                        await expect(section.locator('fieldset')).to_be_hidden()
                        await section.locator('summary').click()
                        await expect(section.locator('fieldset')).to_be_visible()
                        if width == 360 and theme == "light":
                            await section.locator('summary').click()
                            await expect(section.locator('fieldset')).to_be_hidden()
                            await section.locator('summary').click()
                            await expect(section.locator('fieldset')).to_be_visible()
                    await drawer.get_by_label(brands[0], exact=True).check()
                    await page.wait_for_url("**brands=**")
                    await page.wait_for_load_state("networkidle")
                    await drawer.get_by_label(energies[0], exact=True).check()
                    await page.wait_for_url("**energies=**")
                    await page.wait_for_load_state("networkidle")
                    await drawer.locator('input[type="radio"][value="small"]').check()
                    await page.wait_for_url("**capacity=small**")
                    await page.wait_for_load_state("networkidle")
                    await drawer.locator('input[role="switch"]').nth(1).check()
                    await page.wait_for_url("**discounted=true**")
                    await page.wait_for_load_state("networkidle")
                    assert await page.locator("dialog[open]").count() == 1
                    await drawer.get_by_role("button", name="اعمال فیلترها", exact=True).click()
                    assert await page.evaluate("document.body.style.overflow") != "hidden"
                    await trigger.click()
                    await page.keyboard.press("Escape")
                    assert await trigger.evaluate("node => node === document.activeElement")
                assert await page.locator("header").count() == 1
                assert await page.locator("html").get_attribute("dir") == "rtl"
                assert await page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (width, theme)
                await page.screenshot(path=str(Path(os.environ["TEMP"]) / f"launchox-products-filters-{width}-{theme}.png"))
        await page.goto(f"{BASE_URL}/products?brands=missing-brand", wait_until="networkidle")
        assert await page.locator('[data-arctic-product-card]').count() == 0
        await page.locator('[class*="activeFilters"] button').click()
        await page.wait_for_url(f"{BASE_URL}/products")
        await page.wait_for_load_state("networkidle")
        assert await page.locator('[data-arctic-product-card]').count() > 0
        await sidebar.locator('details').nth(1).locator('summary').click()
        slider = sidebar.locator('input[type="range"]').first
        await slider.focus()
        await slider.press("ArrowUp")
        await page.wait_for_url("**minPrice=1000000**")
        await page.wait_for_load_state("networkidle")
        assert await slider.input_value() == "1000000"
        await page.go_back(wait_until="networkidle")
        await page.wait_for_url(lambda url: "minPrice=" not in url)
        await page.wait_for_load_state("networkidle")
        await expect(slider).to_have_value("0")
        assert not errors, errors
        print(f"First automatic brand filter: {first_filter_ms} ms; API-only filter requests verified")
        print(f"PASS: {len(cases)} real-data filter combinations; complete infinite list with correct order and no duplicates; sticky desktop filters; filter reset; desktop/mobile controls; URL/reload/back/reset; six viewport/theme cases; no overflow or browser errors")
        await browser.close()


asyncio.run(main())
