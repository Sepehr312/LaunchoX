"""Check the real login UI using a local action response, without sending SMS."""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[1]
output = root / 'tmp'
output.mkdir(exist_ok=True)
base = 'http://127.0.0.1:3046'

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(permissions=['clipboard-read', 'clipboard-write'], viewport={'width': 540, 'height': 850})
    page = context.new_page()
    errors = []
    intercepted = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def action_response(route):
        if route.request.method != 'POST' or not route.request.headers.get('next-action'):
            route.continue_()
            return
        intercepted.append(route.request.url)
        now = datetime.now(timezone.utc)
        result = {'a': {'ok': True, 'data': {
            'mobile': '09123456789', 'challengeId': 'b' * 64,
            'expiresAt': (now + timedelta(minutes=5)).isoformat(),
            'resendAt': (now + timedelta(minutes=1)).isoformat(),
        }}}
        # A minimal Flight action result prevents the actual SMS action from executing.
        route.fulfill(status=200, content_type='text/x-component', body='0:' + json.dumps(result) + '\n')

    page.route('**/login**', action_response)
    page.goto(base + '/login?callbackUrl=%2Faccount', wait_until='networkidle')
    page.locator('input[name=mobile]').fill('09123456789')
    page.locator('button[type=submit]').click()
    field = page.locator('input[name=code]')
    expect(field).to_be_visible()
    slots = page.locator('[data-filled]')
    expect(slots).to_have_count(6)
    field.fill('123')
    page.screenshot(path=str(output / 'otp-login-540.png'), full_page=True)
    page.set_viewport_size({'width': 360, 'height': 850})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(output / 'otp-login-360.png'), full_page=True)
    field.press('Control+a')
    page.evaluate('navigator.clipboard.writeText("\u06f1\u06f2\u06f3 \u06f4\u06f5\u06f6")')
    field.press('Control+v')
    expect(field).to_have_value('123456')
    field.press('End')
    field.press('Backspace')
    expect(field).to_have_value('12345')
    assert len(intercepted) == 1
    assert page.evaluate('localStorage.length + sessionStorage.length') == 0
    assert not errors, errors
    browser.close()
print(json.dumps({'realLoginLayout': True, 'sixSlots': True, 'paste': True, 'mobileOverflow': False, 'realSmsRequests': 0}))
