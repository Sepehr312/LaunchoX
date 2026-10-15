import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright, expect

SHOTS=Path(os.environ.get('TEMP','.'))/'launchox-brands-listing'
SHOTS.mkdir(exist_ok=True)

async def main():
    async with async_playwright() as p:
        edge=Path(os.environ['PROGRAMFILES(X86)'])/'Microsoft/Edge/Application/msedge.exe'
        browser=await p.chromium.launch(executable_path=str(edge),headless=True)
        page=await browser.new_page(viewport={'width':1440,'height':1000},color_scheme='dark')
        errors=[]
        page.on('pageerror',lambda error: errors.append(str(error)))
        response=await page.goto('http://localhost:3025/brands',wait_until='networkidle',timeout=60000)
        assert response.status==200
        await page.evaluate('document.fonts.ready')
        await page.goto('http://localhost:3025/',wait_until='networkidle',timeout=60000)
        header=page.locator('header').first
        await expect(header.locator('a[href="/brands"]').first).to_be_visible()
        await header.locator('a[href="/brands"]').first.click()
        await page.wait_for_url('**/brands')
        await page.set_viewport_size({'width':360,'height':1000})
        await header.locator('button[aria-haspopup="dialog"]').last.click()
        drawer=header.locator('dialog')
        await expect(drawer.locator('a[href="/brands"]')).to_be_visible()
        await drawer.locator('a[href="/brands"]').click()
        await expect(drawer).not_to_be_visible()
        grid=page.locator('[data-brands-listing] ul')
        cards=grid.locator('li')
        assert await cards.count()==10
        for width,columns in [(360,2),(768,3),(1024,4),(1440,4)]:
            await page.set_viewport_size({'width':width,'height':1000})
            assert await grid.evaluate('(el)=>getComputedStyle(el).gridTemplateColumns.split(" ").length')==columns
            assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            heights=await cards.evaluate_all('(items)=>items.map(el=>el.getBoundingClientRect().height)')
            assert max(heights)-min(heights)<1
            await page.screenshot(path=str(SHOTS/f'brands-listing-{width}.png'),full_page=True)
        search=page.locator('#brand-search')
        await search.fill('Nordic')
        await expect(cards).to_have_count(1)
        await expect(cards).to_contain_text('نوردیک')
        await search.fill('نوردیک')
        await expect(cards).to_have_count(1)
        await search.fill('unmatched-brand')
        await expect(cards).to_have_count(0)
        await expect(page.get_by_text('برندی با این نام پیدا نشد',exact=True)).to_be_visible()
        await page.get_by_role('button',name='نمایش تمام برندها').click()
        await expect(cards).to_have_count(10)
        ascending=await cards.locator('h3').all_text_contents()
        await page.locator('[data-brands-listing] select').select_option('desc')
        assert await cards.locator('h3').all_text_contents()==ascending[::-1]
        from urllib.parse import quote
        records=await cards.evaluate_all('(items)=>items.map(el=>({name:el.querySelector("h3").textContent,href:el.querySelector("a").getAttribute("href"),count:el.querySelector("p").textContent}))')
        for record in records:
            target=await page.request.get('http://localhost:3025'+record['href'])
            assert target.status==200
            assert '/products?brands=' in target.url or 'NEXT_REDIRECT' in await target.text(),record['href']
            api_result=await page.request.get('http://localhost:3025/api/products?brands='+quote(record['name']))
            actual=(await api_result.json())['data']['total']
            expected=int(record['count'].split()[0].translate(str.maketrans('??????????','0123456789')))
            assert actual==expected,(record,actual)
        first=cards.first
        brand=await first.locator('h3').inner_text()
        displayed=await first.locator('p').inner_text()
        persian='۰۱۲۳۴۵۶۷۸۹'
        count=int(displayed.split()[0].translate(str.maketrans(persian,'0123456789')))
        href=await first.locator('a').get_attribute('href')
        assert href.startswith('/brands/')
        await first.locator('a').click()
        await page.wait_for_url('**/products?brands=*',timeout=60000)
        from urllib.parse import parse_qs,urlsplit,quote
        assert parse_qs(urlsplit(page.url).query)['brands']==[brand]
        api=await page.request.get('http://localhost:3025/api/products?brands='+quote(brand))
        payload=await api.json()
        assert payload['data']['total']==count,(payload,count)
        assert not errors,errors
        print(json.dumps({'viewports':'360/768/1024/1440','columns':'2/3/4/4','brands':10,'search':'Persian/English/empty/reset passed','sort':'passed','slug_redirect':'passed','product_count':count,'page_errors':errors}))
        await browser.close()
asyncio.run(main())
