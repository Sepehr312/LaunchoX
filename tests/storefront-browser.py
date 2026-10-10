import asyncio
import os
from pathlib import Path

from playwright.async_api import async_playwright


BASE_URL = os.environ.get("LAUNCHO_STOREFRONT_TEST_URL", "http://127.0.0.1:3017")
SCREENSHOT_DIR = Path(os.environ.get("TEMP", ".")) / "launchox-step7-screenshots"


def find_edge() -> str:
    candidates = [
        Path(os.environ.get("PROGRAMFILES(X86)", "")) / "Microsoft/Edge/Application/msedge.exe",
        Path(os.environ.get("PROGRAMFILES", "")) / "Microsoft/Edge/Application/msedge.exe",
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    raise RuntimeError("Microsoft Edge was not found")


async def assert_no_overflow(page, label: str) -> None:
    dimensions = await page.evaluate(
        """() => ({
          viewport: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
        })"""
    )
    assert dimensions["document"] <= dimensions["viewport"], (label, dimensions)
    assert dimensions["body"] <= dimensions["viewport"], (label, dimensions)


async def load_product_images(page) -> None:
    images = page.locator(".product-card img")
    for index in range(await images.count()):
        image = images.nth(index)
        await image.scroll_into_view_if_needed()
        await image.evaluate(
            """element => element.complete && element.naturalWidth > 0
              ? true
              : new Promise((resolve, reject) => {
                  element.addEventListener('load', () => resolve(true), { once: true });
                  element.addEventListener('error', reject, { once: true });
                })"""
        )
    await page.evaluate("window.scrollTo(0, 0)")


async def main() -> None:
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            executable_path=find_edge(), headless=True
        )
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        page_errors: list[str] = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))

        await page.emulate_media(color_scheme="light")
        response = await page.goto(BASE_URL, wait_until="domcontentloaded")
        await page.locator(".hero-carousel").wait_for()
        await page.wait_for_load_state("networkidle")
        assert response and response.status == 200
        assert await page.locator("html").get_attribute("lang") == "fa"
        assert await page.locator("html").get_attribute("dir") == "rtl"
        assert await page.locator(".hero-carousel").count() == 1
        assert await page.locator(".product-card").count() >= 4
        await load_product_images(page)
        columns = await page.locator(".product-grid").first.evaluate(
            "element => getComputedStyle(element).gridTemplateColumns.split(' ').length"
        )
        assert columns == 4, columns
        first_title = await page.locator(".hero-copy h1").text_content()
        await page.get_by_role("button", name="اسلاید بعدی").click()
        await page.wait_for_timeout(250)
        assert await page.locator(".hero-copy h1").text_content() != first_title
        await page.screenshot(path=SCREENSHOT_DIR / "home-light-desktop.png", full_page=True)

        await page.emulate_media(color_scheme="dark")
        await page.reload(wait_until="domcontentloaded")
        await page.locator(".hero-carousel").wait_for()
        await load_product_images(page)
        dark_display = await page.locator(".hero-image-dark").evaluate(
            "element => getComputedStyle(element).display"
        )
        assert dark_display != "none"
        await page.screenshot(path=SCREENSHOT_DIR / "home-dark-desktop.png", full_page=True)

        for width in (360, 390, 430):
            await page.set_viewport_size({"width": width, "height": 900})
            await page.emulate_media(color_scheme="light")
            await page.goto(BASE_URL, wait_until="domcontentloaded")
            await page.locator(".hero-carousel").wait_for()
            await page.wait_for_load_state("networkidle")
            await assert_no_overflow(page, f"home-{width}")
            menu = page.locator(".mobile-menu")
            await menu.locator("summary").click()
            assert await menu.get_attribute("open") is not None
            await page.keyboard.press("Escape")
            if width == 360:
                await page.screenshot(
                    path=SCREENSHOT_DIR / "home-mobile-360.png", full_page=True
                )
            await page.goto(f"{BASE_URL}/products?sort=price_asc&inStock=true", wait_until="domcontentloaded")
            await page.locator(".product-card").first.wait_for()
            await assert_no_overflow(page, f"products-{width}")
            assert await page.locator("select[name=sort]").input_value() == "price_asc"
            cards = page.locator(".product-card")
            assert await cards.count() > 0
            detail_href = await cards.first.locator("h3 a").get_attribute("href")
            await page.goto(f"{BASE_URL}{detail_href}", wait_until="domcontentloaded")
            await page.locator(".specification-section").wait_for()
            await assert_no_overflow(page, f"detail-{width}")
            assert await page.locator(".specification-section").count() == 1
            if width == 360:
                await page.screenshot(path=SCREENSHOT_DIR / "product-mobile-360.png", full_page=True)

        await page.set_viewport_size({"width": 768, "height": 1000})
        await page.goto(f"{BASE_URL}/products", wait_until="domcontentloaded")
        await page.wait_for_load_state("networkidle")
        await page.locator(".product-grid").wait_for()
        tablet_columns = await page.locator(".product-grid").evaluate(
            "element => getComputedStyle(element).gridTemplateColumns.split(' ').length"
        )
        assert tablet_columns == 3, tablet_columns

        api = await page.request.get(
            f"{BASE_URL}/api/products?page=2&limit=4&sort=price_desc"
        )
        assert api.status == 200
        data = (await api.json())["data"]
        assert data["page"] == 2 and data["limit"] == 4 and len(data["items"]) == 4
        invalid = await page.request.get(f"{BASE_URL}/api/products?page=0")
        assert invalid.status == 400
        assert page_errors == [], page_errors
        await browser.close()

    print(f"Storefront browser acceptance passed; screenshots: {SCREENSHOT_DIR}")


if __name__ == "__main__":
    asyncio.run(main())
