"""Runs only against the disposable server created by analytics-browser.mjs."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = os.environ['LAUNCHO_ANALYTICS_URL']
mode = os.environ['LAUNCHO_ANALYTICS_MODE']
output = Path(__file__).resolve().parent.parent / 'test-results' / 'analytics'
output.mkdir(parents=True, exist_ok=True)
expect.set_options(timeout=30000)

with sync_playwright() as p:
    browser = p.chromium.launch(channel=os.environ.get('LAUNCHO_BROWSER_CHANNEL'), headless=True)

    def context(role=None):
        ctx = browser.new_context(viewport={'width': 1440, 'height': 1100})
        if role:
            ctx.add_cookies([{'name': 'authjs.session-token', 'value': os.environ[f'LAUNCHO_ANALYTICS_{role}_TOKEN'], 'url': base}])
        return ctx

    guest = context()
    guest_page = guest.new_page()
    guest_page.goto(base + '/admin/analytics')
    assert '/login' in guest_page.url
    guest.close()
    customer = context('CUSTOMER')
    customer_page = customer.new_page()
    customer_page.goto(base + '/admin/analytics')
    expect(customer_page.get_by_role('heading', name='آمار و عملکرد', exact=True)).to_have_count(0)
    customer.close()

    admin = context('ADMIN')
    page = admin.new_page()
    errors = []
    external = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: external.append(request.url) if 'analyticsdata.googleapis.com' in request.url else None)
    page.goto(base + '/admin/analytics')
    expect(page.get_by_role('heading', name='آمار و عملکرد', exact=True)).to_be_visible()
    if mode == 'configuration':
        expect(page.get_by_role('heading', name='تنظیمات گزارش کامل نیست')).to_be_visible()
        expect(page.get_by_role('heading', name='کاربران فعال', exact=True)).to_have_count(0)
        page.screenshot(path=str(output / 'configuration.png'), full_page=True)
    else:
        expect(page.get_by_role('heading', name='کاربران فعال', exact=True)).to_be_visible()
        expect(page.get_by_role('heading', name='نوع دستگاه کاربران', exact=True)).to_be_visible()
        expect(page.get_by_role('rowheader', name='موبایل', exact=True)).to_be_visible()
        expect(page.get_by_text('صفحات محصول (تجمیعی)', exact=True)).to_be_visible()
        expect(page.get_by_text('درصد تغییر قابل محاسبه نیست', exact=True)).to_be_visible()
        first_received = page.get_by_text('آخرین دریافت گزارش:', exact=False).inner_text()
        page.reload()
        expect(page.get_by_text(first_received, exact=True)).to_be_visible()
        for width in [1440, 768, 360]:
            page.set_viewport_size({'width': width, 'height': 1100})
            page.evaluate('document.fonts.ready')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Overflow at {width}'
            city_box = page.get_by_role('heading', name='کاربران فعال به تفکیک شهر', exact=True).locator('..').bounding_box()
            device_box = page.get_by_role('heading', name='نوع دستگاه کاربران', exact=True).locator('..').bounding_box()
            if width == 1440:
                assert abs(city_box['y'] - device_box['y']) < 2, 'City and device panels must sit side by side'
            if width == 360:
                assert device_box['y'] > city_box['y'], 'Mobile panels must stack vertically'
            page.screenshot(path=str(output / f'report-{width}.png'), full_page=True)
        page.set_viewport_size({'width': 1440, 'height': 1100})
        page.get_by_role('link', name='۳۰ روز', exact=True).click()
        expect(page).to_have_url(base + '/admin/analytics?days=30')
        page.get_by_text('مشاهده جدول روزانه', exact=True).click()
        assert page.locator('details tbody tr').count() == 30
        page.get_by_role('link', name='۳۰ دقیقهٔ گذشته', exact=True).click()
        expect(page).to_have_url(base + '/admin/analytics?days=realtime')
        expect(page.get_by_role('heading', name='کاربران فعال در ۳۰ دقیقهٔ گذشته', exact=True)).to_be_visible()
        expect(page.get_by_text('Tabriz', exact=True)).to_be_visible()
        minute_button = page.get_by_role('button', name='۲۲ دقیقه قبل: ۱ کاربر فعال', exact=True)
        minute_button.focus()
        minute_button.press('Enter')
        expect(minute_button).to_have_attribute('aria-pressed', 'true')
        expect(page.get_by_role('rowheader', name='تبلت', exact=True)).to_be_visible()
        expect(page.get_by_role('heading', name='کاربران جدید', exact=True)).to_have_count(0)
        for width in [1440, 360]:
            page.set_viewport_size({'width': width, 'height': 1100})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Realtime overflow at {width}'
            city_box = page.get_by_role('heading', name='کاربران فعال به تفکیک شهر', exact=True).locator('..').bounding_box()
            device_box = page.get_by_role('heading', name='نوع دستگاه کاربران', exact=True).locator('..').bounding_box()
            if width == 1440:
                assert abs(city_box['y'] - device_box['y']) < 2, 'Realtime panels must sit side by side'
            page.screenshot(path=str(output / f'realtime-{width}.png'), full_page=True)
        page.get_by_role('link', name='۳۰ روز', exact=True).click()
        expect(page.get_by_role('heading', name='کاربران فعال', exact=True)).to_be_visible()
        page.get_by_role('button', name='به‌روزرسانی', exact=True).click()
        expect(page.get_by_role('heading', name='کمی تا درخواست بعدی صبر کنید')).to_be_visible()
        expect(page.get_by_role('heading', name='کاربران فعال', exact=True)).to_have_count(0)
        page.goto(base + '/admin/analytics?days=7&days=30')
        expect(page.get_by_role('heading', name='بازهٔ گزارش معتبر نیست')).to_be_visible()
        page.get_by_role('link', name='۷ روز', exact=True).click()
        expect(page.get_by_role('heading', name='کاربران فعال', exact=True)).to_be_visible()
        assert 'TEST-ONLY-UNUSABLE-KEY' not in page.content()
        assert 'fixture@example.com' not in page.content()
    assert not errors, errors
    assert not external, external
    admin.close()
    browser.close()
    print(f'PASS analytics {mode}: current-role guards, Persian UI, no browser credentials or Data API calls' + ('; cache, refresh limit, 7/30 days, mobile 360/768/1440, no horizontal overflow' if mode == 'reports' else ''))
