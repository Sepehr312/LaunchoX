"""Stage 10 acceptance against an isolated, seeded database and production server."""
import json
import os
import subprocess
import uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE = os.environ.get("LAUNCHO_ACCOUNT_TEST_URL", "http://localhost:3020")
DB = os.environ["LAUNCHO_ACCOUNT_TEST_DB"]
assert DB.endswith("/launchox_stage10_browser")
expect.set_options(timeout=60000)
def database(code):
    script = "const mongoose=require('mongoose'); const bcrypt=require('bcryptjs'); (async()=>{await mongoose.connect(" + json.dumps(DB) + "); const db=mongoose.connection; " + code + "; await mongoose.disconnect();})().catch(e=>{console.error(e);process.exitCode=1});"
    return subprocess.run(["node", "-e", script], check=True, capture_output=True, text=True, encoding="utf-8").stdout.strip()
order_id = database("""
await db.collection('orders').deleteMany({});
await db.collection('users').deleteMany({email:'other-stage10@example.com'});
await db.collection('users').updateOne({email:'customer@launchox.local'},{$set:{passwordHash:await bcrypt.hash('Customer123!',12)}});
const user=await db.collection('users').findOne({email:'customer@launchox.local'});
const other=await db.collection('users').insertOne({name:'Other customer',email:'other-stage10@example.com',passwordHash:await bcrypt.hash('Customer123!',12),role:'customer',isActive:true,addresses:[],createdAt:new Date(),updatedAt:new Date()});
const product=await db.collection('products').findOne({isActive:true});
const order={orderNumber:'LX-910010',user:user._id,items:[{product:product._id,title:product.title,slug:product.slug,image:product.images[0],price:product.price,quantity:1}],subtotal:product.price,shippingFee:0,total:product.price,shippingAddress:user.addresses[0],status:'pending',payment:{status:'unpaid'},statusHistory:[{status:'pending',changedAt:new Date()}],createdAt:new Date(),updatedAt:new Date()};
await db.collection('products').updateOne({_id:product._id},{$inc:{stock:-1}});
const result=await db.collection('orders').insertOne(order); console.log(result.insertedId.toString());
""")
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=str(Path(os.environ['ProgramFiles(x86)'])/'Microsoft/Edge/Application/msedge.exe'),headless=True)
    owner=browser.new_context(extra_http_headers={"x-forwarded-for": "127."+".".join(str(byte) for byte in uuid.uuid4().bytes[:3])}); page=owner.new_page(); page.set_default_timeout(60000)
    errors=[]; page.on('pageerror',lambda e: errors.append(str(e)))
    def login(page,email,password="Customer123!"):
        page.goto(BASE+'/login?callbackUrl=/account')
        page.get_by_label('ایمیل',exact=True).fill(email)
        page.get_by_label('رمز عبور',exact=True).fill(password)
        page.get_by_role('button',name='ورود',exact=True).click(); page.wait_for_url(BASE+'/account')
        assert page.context.request.get(BASE+'/api/auth/session').json()['user']['email']==email
    def visuals(path):
        page.goto(BASE+path)
        page.wait_for_load_state('networkidle')
        for width in [360,768,1440]:
            page.set_viewport_size({'width':width,'height':1000})
            for theme in ['light','dark']:
                page.emulate_media(color_scheme=theme)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (path,width,theme)
                assert page.locator('html').get_attribute('dir')=='rtl'
                assert page.locator('html').get_attribute('lang')=='fa'
                page.evaluate('document.fonts.ready')
                assert page.evaluate("Array.from(document.fonts).some(f=>f.family.toLowerCase().includes('vazirmatn') && f.status==='loaded')")
                page.screenshot(path=str(Path(os.environ['TEMP'])/('account-'+path.replace('/','-')+f'-{width}-{theme}.png')),full_page=True)
    login(page,'customer@launchox.local')
    page.get_by_label('نام',exact=True).fill('مشتری مرحله ده')
    page.get_by_label('موبایل',exact=True).fill('۰۹۱۲۳۴۵۶۷۸۹')
    page.locator('form').filter(has=page.locator('input[name="name"]')).get_by_role('button').click()
    expect(page.get_by_role('status').filter(has_text='تغییرات ذخیره شد')).to_be_visible()
    visuals('/account'); expect(page.get_by_label('نام',exact=True)).to_have_value('مشتری مرحله ده')
    page.get_by_label('رمز عبور فعلی',exact=True).fill('wrong')
    page.get_by_label('رمز عبور جدید',exact=True).fill('Changed123!')
    page.get_by_label('تکرار رمز عبور جدید',exact=True).fill('Changed123!')
    page.locator('form').filter(has=page.locator('input[name="currentPassword"]')).get_by_role('button').click()
    expect(page.get_by_text('رمز عبور فعلی صحیح نیست',exact=True)).to_be_visible()
    page.get_by_label('رمز عبور فعلی',exact=True).fill('Customer123!')
    page.get_by_label('رمز عبور جدید',exact=True).fill('Changed123!')
    page.get_by_label('تکرار رمز عبور جدید',exact=True).fill('Changed123!')
    page.locator('form').filter(has=page.locator('input[name="currentPassword"]')).get_by_role('button').click()
    expect(page.get_by_role('status').filter(has_text='تغییرات ذخیره شد')).to_be_visible()
    verification=browser.new_context(extra_http_headers={"x-forwarded-for": "127."+".".join(str(byte) for byte in uuid.uuid4().bytes[:3])}); verification_page=verification.new_page(); login(verification_page,'customer@launchox.local','Changed123!'); verification.close()
    visuals('/account/addresses')
    add=page.locator('form').filter(has=page.locator('input[value="add"]'))
    for name,value in [('title','دفتر'),('recipientName','مشتری'),('mobile','09123456789'),('province','تهران'),('city','تهران'),('postalCode','1234567890'),('addressLine','نشانی دفتر')]: add.locator(f'input[name="{name}"]').fill(value)
    add.get_by_role('button').click(); expect(page.get_by_role('heading',name='دفتر')).to_be_visible()
    section=page.locator('section').filter(has=page.get_by_role('heading',name='دفتر',exact=False))
    section.get_by_role('button',name='انتخاب پیش‌فرض',exact=True).click(); expect(section.get_by_text('پیش‌فرض',exact=True)).to_be_visible()
    section.locator('input[name="city"]').fill('شیراز'); section.get_by_role('button',name='ذخیرهٔ تغییرات',exact=True).click(); page.reload()
    expect(page.locator('section').filter(has=page.get_by_role('heading',name='دفتر',exact=False)).locator('input[name="city"]')).to_have_value('شیراز')
    page.on('dialog',lambda dialog:dialog.accept())
    page.locator('section').filter(has=page.get_by_role('heading',name='دفتر',exact=False)).get_by_role('button',name='حذف آدرس',exact=True).click()
    expect(page.get_by_role('heading',name='دفتر',exact=False)).to_have_count(0)
    visuals('/account/orders'); visuals('/account/orders/'+order_id)
    expect(page.get_by_role('button',name='لغو سفارش')).to_be_visible()
    foreign=browser.new_context(extra_http_headers={"x-forwarded-for": "127."+".".join(str(byte) for byte in uuid.uuid4().bytes[:3])}); foreign_page=foreign.new_page(); login(foreign_page,'other-stage10@example.com')
    response=foreign_page.goto(BASE+'/account/orders/'+order_id)
    assert response.status==404, (response.status,response.url,response.headers,foreign_page.locator('main').inner_text())
    assert foreign_page.get_by_text('LX-۹۱۰۰۱۰',exact=True).count()==0
    invalid=foreign_page.goto(BASE+'/account/orders/not-an-id'); assert invalid.status==404
    page.get_by_role('button',name='لغو سفارش',exact=True).click()
    expect(page.get_by_text('لغو شده',exact=True).first).to_be_visible()
    expect(page.get_by_role('button',name='لغو سفارش')).to_have_count(0)
    assert not errors,errors
    browser.close()
print('PASS: profile/password/address CRUD/default, own orders/cancellation, foreign and malformed order HTTP 404; RTL light/dark at 360/768/1440.')
