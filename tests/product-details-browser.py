import asyncio
import json
import os
import subprocess
import urllib.request
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE = os.environ.get('LAUNCHO_PRODUCT_DETAILS_URL','http://localhost:3018')
SHOTS = Path(os.environ.get('TEMP','.')) / 'launchox-product-details'
created_guests=[]

def cleanup():
    for guest in created_guests:
        code = """import mongoose from 'mongoose';
import { getEnv } from './src/lib/env.ts';
async function cleanup() {
 try {
  await mongoose.connect(getEnv().MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.collection('carts').deleteOne({ guestId: GUEST });
 }
 finally { await mongoose.disconnect(); }
}
cleanup().catch(() => { console.error('Product detail cart cleanup failed'); process.exitCode=1; });
""".replace('GUEST',json.dumps(guest))
        subprocess.run(['node','--experimental-strip-types','--conditions=react-server','--input-type=module','--env-file=.env.local','-e',code],capture_output=True,check=True)

async def main():
    SHOTS.mkdir(exist_ok=True)
    with urllib.request.urlopen(BASE+'/api/products?limit=48',timeout=30) as response:
        records=json.load(response)['data']['items']
    product=next(p for p in records if p['slug']=='digital-5')
    unavailable=next(p for p in records if p['stock']==0)
    async with async_playwright() as p:
        edge=Path(os.environ['PROGRAMFILES(X86)'])/'Microsoft/Edge/Application/msedge.exe'
        browser=await p.chromium.launch(executable_path=str(edge),headless=True)
        context=await browser.new_context(viewport={'width':1440,'height':1000}, color_scheme='dark')
        await context.add_init_script("localStorage.setItem('launchox-preview-theme','dark')")
        page=await context.new_page()
        errors, google=[],[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:google.append(r.url) if 'fonts.googleapis.com' in r.url or 'fonts.gstatic.com' in r.url else None)
        url=BASE+'/products/'+product['slug']
        await page.goto(url,wait_until='networkidle')
        details=page.locator('[data-product-details="storefront"]')
        await expect(details).to_have_attribute('data-product-id',product['id'])
        await expect(page.locator('header')).to_have_count(1)
        await expect(page.locator('footer')).to_have_count(1)
        await expect(details).not_to_contain_text('آزمایشی')
        await expect(details).not_to_contain_text('نمونه')
        await page.evaluate('document.fonts.ready')
        assert await page.locator('h1').evaluate("e=>{const family=getComputedStyle(e).fontFamily.split(',')[0].replaceAll('\"','').trim(); return [...document.fonts].some(f=>f.family.replaceAll('\"','')===family && f.status==='loaded')}")
        purchase=page.locator('aside[aria-label="خرید محصول"]')
        mobile=page.locator('[data-product-details="storefront"] [class*="mobileBuy"]')
        if os.environ.get('LAUNCHO_PRODUCT_DETAILS_VISUAL_ONLY') != '1':
            hidden= purchase.locator('input[name="product"]')
            await hidden.evaluate("e=>e.value='000000000000000000000000'")
            await purchase.get_by_role('button',name='افزودن به سبد خرید',exact=True).click()
            await expect(details.get_by_role('alert')).to_contain_text('محصول پیدا نشد')
            await expect(purchase.locator('output')).to_have_count(0)
            assert not any(c['name']=='cart_id' for c in await context.cookies())
            await hidden.evaluate('(e,id)=>e.value=id',product['id'])
            await purchase.get_by_role('button',name='افزودن به سبد خرید',exact=True).click()
            await expect(purchase.locator('output')).to_have_text('۱',timeout=15000)
            guest=next(c for c in await context.cookies() if c['name']=='cart_id')
            created_guests.append(guest['value'])
            assert guest['httpOnly'] and guest['sameSite']=='Lax'
            await expect(page.locator('[data-cart-count]')).to_have_text('۱')
            await page.reload(wait_until='networkidle')
            await expect(purchase.locator('output')).to_have_text('۱')
            await purchase.get_by_role('button',name='افزایش تعداد',exact=True).click()
            await expect(purchase.locator('output')).to_have_text('۲')
            await expect(page.locator('[data-cart-count]')).to_have_text('۲')
            await purchase.get_by_role('button',name='کاهش تعداد',exact=True).click()
            await expect(purchase.locator('output')).to_have_text('۱')
            await purchase.locator('input[name="quantity"]').evaluate("e=>e.value='9'")
            await purchase.get_by_role('button',name='افزایش تعداد',exact=True).click()
            await expect(purchase.locator('output')).to_have_text('۱۰')
            await expect(purchase.get_by_role('button',name='افزایش تعداد',exact=True)).to_be_disabled()
            await page.goto(BASE+'/cart',wait_until='networkidle')
            item=page.locator('[data-cart-item]')
            await expect(item).to_have_count(1)
            await expect(item.get_by_role('combobox',name='تعداد',exact=True)).to_have_value('10')
            await item.get_by_role('combobox',name='تعداد',exact=True).select_option('1')
            await item.get_by_role('button',name='تغییر تعداد',exact=True).click()
            await expect(page.locator('[data-cart-count]')).to_have_text('۱')
            await page.set_viewport_size({'width':375,'height':900})
            await page.goto(url,wait_until='networkidle')
            mobile=page.locator('[aria-label="خرید سریع"]')
            await expect(mobile.locator('output')).to_have_text('۱')
            await mobile.get_by_role('button',name='حذف از سبد خرید',exact=True).click()
            await expect(mobile.get_by_role('button',name='افزودن به سبد خرید',exact=True)).to_be_enabled()
            await page.goto(BASE+'/cart',wait_until='networkidle')
            await expect(page.get_by_text('سبد خرید شما خالی است.',exact=True)).to_be_visible()
            print('PASS real server actions: failed request, guest cookie, add, persistence, increment/decrement, ten-item cap, header count, cart page and mobile removal',flush=True)
        for width in [320,375,390,430,768,1440]:
            await page.set_viewport_size({'width':width,'height':900})
            await page.goto(url,wait_until='networkidle')
            await page.evaluate('document.fonts.ready')
            for img in await page.locator('main img').all():
                await img.scroll_into_view_if_needed()
                await page.wait_for_function('e=>e.complete&&e.naturalWidth>0',arg=await img.element_handle(),timeout=15000)
            await page.locator('#related-products-track').evaluate('e=>e.scrollTo({left:0,behavior:"instant"})')
            await page.evaluate('scrollTo(0,0)')
            assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
            assert await details.evaluate('e=>getComputedStyle(e).colorScheme')=='light'
            assert 'rgb(234, 245, 255)' in await page.locator('body').evaluate('e=>getComputedStyle(e).backgroundImage')
            assert await page.locator('header').evaluate('e=>getComputedStyle(e).colorScheme')=='light'
            assert await page.locator('footer').evaluate('e=>getComputedStyle(e).colorScheme')=='light'
            if width < 1024: await expect(mobile).to_be_visible()
            else: await expect(mobile).not_to_be_visible()
            await expect(page.locator('header')).to_have_count(1)
            await expect(page.locator('footer')).to_have_count(1)
            await page.screenshot(path=str(SHOTS/f'product-{width}.png'),full_page=True)
            print(f'PASS {width}px: responsive light page, one header/footer, fixed mobile purchase and no overflow',flush=True)
        await page.get_by_role('button',name='باز کردن گالری بزرگ',exact=True).click()
        await expect(page.locator('dialog[aria-labelledby="image-dialog-title"]')).to_be_visible()
        await page.keyboard.press('Escape')
        related=page.locator('#related article a').first
        target=await related.get_attribute('href')
        await related.click()
        await page.wait_for_url(BASE+target)
        await expect(page.locator('h1')).to_have_count(1)
        await page.goto(BASE+'/products/'+unavailable['slug'],wait_until='networkidle')
        await expect(page.locator('aside[aria-label="خرید محصول"]').get_by_role('button',name='ناموجود',exact=True)).to_be_disabled()
        for slug in ['product-does-not-exist','invalid_slug']:
            response=await page.goto(BASE+'/products/'+slug,wait_until='domcontentloaded')
            assert response.status==404,(slug,response.status)
        assert not google,google
        assert not errors,errors
        print('PASS gallery, real related navigation, unavailable product, unknown/invalid 404s, loaded local font and zero Google requests/browser errors',flush=True)
        print(f'Screenshots: {SHOTS}',flush=True)
        await browser.close()

try:
    asyncio.run(main())
finally:
    cleanup()
