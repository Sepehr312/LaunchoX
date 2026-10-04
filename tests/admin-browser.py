"""Section 11.1 acceptance against an isolated production server/database."""
import json
import os
import subprocess
import uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('LAUNCHO_ADMIN_TEST_URL', 'http://localhost:3021')
DB = os.environ['LAUNCHO_ADMIN_TEST_DB']
assert DB.endswith('/launchox_stage11_browser')
expect.set_options(timeout=60000)

def database(code):
    script = "const mongoose=require('mongoose');const bcrypt=require('bcryptjs');(async()=>{await mongoose.connect("+json.dumps(DB)+");const db=mongoose.connection.db;"+code+";await mongoose.disconnect()})().catch(e=>{console.error(e);process.exitCode=1})"
    return subprocess.run(['node', '-e', script], check=True, capture_output=True, text=True, encoding='utf-8', timeout=60).stdout

database("""
await db.dropDatabase();
for(const role of ['admin','customer']) await db.collection('users').insertOne({name:'Browser user',email:role+'@example.com',passwordHash:await bcrypt.hash('Browser123!',12),role,isActive:true,addresses:[],createdAt:new Date(),updatedAt:new Date()});
""")
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=str(Path(os.environ['ProgramFiles(x86)'])/'Microsoft/Edge/Application/msedge.exe'), headless=True)
    def context():
        return browser.new_context(extra_http_headers={'x-forwarded-for':'127.'+'.'.join(str(b) for b in uuid.uuid4().bytes[:3])})
    guest = context(); page = guest.new_page(); page.goto(BASE+'/admin'); assert '/login' in page.url
    def login(role):
        ctx = context(); page = ctx.new_page(); page.goto(BASE+'/login?callbackUrl=/admin')
        page.get_by_label('ایمیل',exact=True).fill(role+'@example.com'); page.get_by_label('رمز عبور',exact=True).fill('Browser123!')
        page.get_by_role('button',name='ورود',exact=True).click(); page.wait_for_url(BASE+'/admin'); return ctx,page
    customer, denied = login('customer')
    expect(denied.get_by_role('heading',name='داشبورد فروشگاه')).to_have_count(0)
    expect(denied.get_by_text('صفحه پیدا نشد',exact=False).first).to_be_visible()
    admin,page = login('admin'); errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
    expect(page.get_by_text('هنوز سفارشی ثبت نشده است.',exact=True)).to_be_visible()
    expect(page.get_by_text('هیچ محصولی با موجودی کمتر از پنج واحد وجود ندارد.',exact=True)).to_be_visible()
    database("""
const user=await db.collection('users').findOne({role:'customer'});
for(let i=0;i<12;i++) await db.collection('orders').insertOne({orderNumber:'LX-'+(300000+i),user:user._id,shippingAddress:{recipientName:'مشتری آزمایشی'},total:100000,status:'pending',payment:{status:'unpaid'},createdAt:new Date(Date.now()-i*1000),updatedAt:new Date()});
await db.collection('products').insertMany([{title:'یخچال با موجودی کم',stock:4,isActive:true},{title:'یخچال ناموجود',stock:0,isActive:false},{title:'موجودی کافی',stock:5,isActive:true}]);
""")
    page.reload(); expect(page.locator('#latest-orders').locator('..').locator('article')).to_have_count(10)
    expect(page.locator('#low-stock').locator('..').locator('li')).to_have_count(2)
    expect(page.get_by_text('LX-۳۰۰۰۰۰',exact=True)).to_be_visible()
    expect(page.get_by_text('LX-۳۰۰۰۱۰',exact=True)).to_have_count(0)
    expect(page.get_by_role('navigation',name='ناوبری مدیریت').get_by_role('link',name='نمای کلی')).to_have_attribute('aria-current','page')
    expect(page.get_by_role('navigation',name='ناوبری مدیریت').get_by_role('link',name='کاربران',exact=True)).to_have_attribute('href','/admin/users')
    for width in [360,768,1440]:
        page.set_viewport_size({'width':width,'height':1000})
        for theme in ['light','dark']:
            page.emulate_media(color_scheme=theme); page.evaluate('document.fonts.ready')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(width,theme)
            assert page.evaluate('Array.from(document.querySelectorAll("main *")).every(e=>e.getBoundingClientRect().right<=innerWidth+1 && e.getBoundingClientRect().left>=-1)'),(width,theme)
            assert page.locator('html').get_attribute('dir')=='rtl'
            assert page.evaluate("Array.from(document.fonts).some(f=>f.family.toLowerCase().includes('vazirmatn') && f.status==='loaded')")
            page.screenshot(path=str(Path(os.environ['TEMP'])/f'admin-{width}-{theme}.png'),full_page=True)
    assert not errors,errors
    page.get_by_role('button',name='خروج',exact=True).click(); page.wait_for_url(BASE+'/')
    page.goto(BASE+'/admin'); assert '/login' in page.url
    browser.close()
print('PASS: admin guard, guest redirect, customer denial, empty/populated lists, ten latest orders, low-stock threshold, navigation/logout, RTL/font/light/dark at 360/768/1440.')
