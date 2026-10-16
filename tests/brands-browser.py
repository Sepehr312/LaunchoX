import os
import re
from pathlib import Path
from urllib.parse import unquote, urlencode, urlparse

from playwright.sync_api import expect, sync_playwright

BASE_URL = os.environ.get("LAUNCHO_BRANDS_TEST_URL", "http://127.0.0.1:3002")
DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")


def main():
    edge = Path(os.environ["PROGRAMFILES(X86)"]) / "Microsoft/Edge/Application/msedge.exe"
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=str(edge), headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        response = page.goto(f"{BASE_URL}/brands", wait_until="networkidle")
        assert response.status == 200
        assert page.locator('meta[name="robots"][content*="noindex"]').count() == 0
        expect(page.locator("html")).to_have_attribute("dir", "rtl")
        expect(page.locator("header")).to_be_visible()
        expect(page.locator("footer")).to_be_visible()
        cards = page.locator('main a[href^="/brands/"]')
        total = cards.count()
        assert total > 0, "Use an isolated seeded database for brand interaction acceptance"
        names = cards.locator("h3").all_text_contents()
        expected_names = page.evaluate("names => [...names].sort((a,b) => a.localeCompare(b, 'fa', {sensitivity:'base', numeric:true}))", names)
        assert names == expected_names
        search = page.get_by_role("searchbox", name="جست‌وجوی برند", exact=True)
        for width, columns in [(360, 2), (768, 3), (1440, 4)]:
            page.set_viewport_size({"width": width, "height": 1000})
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), width
            grid_columns = cards.first.evaluate("el => getComputedStyle(el.parentElement).gridTemplateColumns.split(' ').length")
            assert grid_columns == columns, (width, grid_columns)
        name = names[0]
        spaced_search = "  " + "  ".join(name.split()) + "  "
        search.fill(spaced_search)
        expect(cards.filter(has=page.locator("h3", has_text=name))).to_have_count(1)
        page.get_by_role("button", name="پاک کردن جست‌وجو", exact=True).click()
        expect(cards).to_have_count(total)
        english = next((cards.nth(index).get_attribute("href") for index in range(total)
                        if re.fullmatch(r"[a-z0-9-]+", unquote(urlparse(cards.nth(index).get_attribute("href")).path.rsplit("/", 1)[-1]))), None)
        if english:
            slug = unquote(urlparse(english).path.rsplit("/", 1)[-1])
            search.fill("  " + slug.upper().replace("-", "  ") + "  ")
            assert cards.count() >= 1
        search.fill("zzzz-no-matching-brand-zzzz")
        expect(page.get_by_role("heading", name="برندی با این نام پیدا نشد")).to_be_visible()
        expect(cards).to_have_count(0)
        page.get_by_role("button", name="نمایش تمام برندها").click()
        expect(cards).to_have_count(total)
        for index in range(total):
            card = cards.nth(index)
            href = card.get_attribute("href")
            count = int(card.locator("p").inner_text().split()[0].translate(DIGITS))
            result = page.request.get(f"{BASE_URL}/api/products?{urlencode({"brandSlug": unquote(urlparse(href).path.rsplit("/", 1)[-1]), "limit": 1})}")
            assert result.status == 200
            assert result.json()["data"]["total"] == count
        for image in cards.locator("img").all():
            assert image.evaluate("img => img.complete && img.naturalWidth > 0")
        cards.first.click()
        page.wait_for_url("**/brands/*")
        expect(page.locator("[data-brand-catalog=true]")).to_be_visible()
        page.get_by_role("combobox", name="مرتب‌سازی محصولات").select_option("price_asc")
        page.wait_for_url("**/*sort=price_asc*")
        assert urlparse(page.url).path.startswith("/brands/")
        assert not errors, errors
        browser.close()
        print("Brands browser acceptance passed: public route, search, sorting, counts, links and 2/3/4-column layouts")


if __name__ == "__main__":
    main()
