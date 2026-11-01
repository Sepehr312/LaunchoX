"""User administration acceptance against an isolated production database."""
exec(open('tests/admin-browser.py', encoding='utf-8').read().split('with sync_playwright() as p:')[0])
database("""
await db.collection('users').insertOne({name:'ادمین دوم',email:'second-admin@example.com',passwordHash:await bcrypt.hash('Browser123!',12),role:'admin',isActive:true,addresses:[],createdAt:new Date(),updatedAt:new Date()});
""")
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=str(Path(os.environ['ProgramFiles(x86)'])/'Microsoft/Edge/Application/msedge.exe'), headless=True)
    guest = browser.new_page(); guest.goto(BASE+'/admin/users'); assert '/login' in guest.url
    def login(role):
        page = browser.new_page(extra_http_headers={'x-forwarded-for':'127.'+'.'.join(str(b) for b in uuid.uuid4().bytes[:3])})
        page.goto(BASE+'/login?callbackUrl=/admin/users')
        page.get_by_label('ایمیل',exact=True).fill(role+'@example.com')
        page.get_by_label('رمز عبور',exact=True).fill('Browser123!')
        page.get_by_role('button',name='ورود',exact=True).click()
        page.wait_for_url(BASE+'/admin/users')
        return page
    customer = login('customer'); expect(customer.get_by_text('صفحه یا مورد موردنظر پیدا نشد',exact=False).first).to_be_visible()
    page = login('admin'); errors = []; page.on('pageerror',lambda error:errors.append(str(error)))
    expect(page.locator('tbody tr')).to_have_count(3)
    self_row = page.locator('tbody tr').filter(has=page.get_by_text('admin@example.com',exact=True))
    expect(self_row.get_by_role('switch')).to_be_disabled()
    expect(self_row.get_by_role('combobox')).to_have_value('admin')
    expect(page.get_by_role('navigation',name='ناوبری مدیریت').get_by_role('link',name='کاربران',exact=True)).to_have_attribute('aria-current','page')
    for width in [360,768,1440]:
        page.set_viewport_size({'width':width,'height':900})
        for theme in ['light','dark']:
            page.emulate_media(color_scheme=theme)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,theme)
            assert page.locator('html').get_attribute('dir')=='rtl'
    row = page.locator('tbody tr').filter(has_text='customer@example.com')
    expect(row.get_by_role('combobox')).to_have_value('customer')
    row.get_by_role('switch').click(); expect(row.get_by_text('غیرفعال',exact=True)).to_be_visible()
    page.reload(); row = page.locator('tbody tr').filter(has_text='customer@example.com')
    expect(row.get_by_text('غیرفعال',exact=True)).to_be_visible()
    database("const u=await db.collection('users').findOne({email:'customer@example.com'});if(u.isActive||u.role!=='customer'||!u.passwordHash)throw Error('Disable persistence failed')")
    blocked = browser.new_page(); blocked.goto(BASE+'/login')
    blocked.get_by_label('ایمیل',exact=True).fill('customer@example.com'); blocked.get_by_label('رمز عبور',exact=True).fill('Browser123!')
    blocked.get_by_role('button',name='ورود',exact=True).click(); expect(blocked.get_by_role('alert')).to_be_visible(); assert '/login' in blocked.url
    row.get_by_role('switch').click(); expect(row.get_by_text('فعال',exact=True)).to_be_visible()
    second = page.locator('tbody tr').filter(has_text='second-admin@example.com')
    second.get_by_role('switch').click(); expect(second.get_by_text('غیرفعال',exact=True)).to_be_visible()
    second.get_by_role('switch').click(); expect(second.get_by_text('فعال',exact=True)).to_be_visible()
    database("const users=await db.collection('users').find({}).toArray();if(users.some(u=>!u.isActive))throw Error('Enable persistence failed')")
    again = login('customer'); expect(again.get_by_text('صفحه یا مورد موردنظر پیدا نشد',exact=False).first).to_be_visible()
    page.goto(BASE+'/admin/products'); expect(page.get_by_role('heading',name='مدیریت محصولات',exact=True)).to_be_visible()
    page.goto(BASE+'/admin/categories'); expect(page.get_by_role('heading',name='مدیریت دسته‌بندی‌ها',exact=True)).to_be_visible()
    page.goto(BASE+'/admin/orders'); expect(page.get_by_role('heading',name='مدیریت سفارش‌ها',exact=True)).to_be_visible()
    assert not errors,errors
    browser.close()
print('PASS: guards, roles, own-account protection, persistent enable/disable, disabled login rejection, navigation and RTL/mobile/light/dark without overflow.')
