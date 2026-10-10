"""Category acceptance against an isolated production server/database."""
exec(open('tests/admin-browser.py', encoding='utf-8').read().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=str(Path(os.environ['ProgramFiles(x86)'])/'Microsoft/Edge/Application/msedge.exe'), headless=True)
    guest = browser.new_page(); guest.goto(BASE+'/admin/categories'); assert '/login' in guest.url
    def login(role):
        page = browser.new_page(extra_http_headers={'x-forwarded-for':'127.'+'.'.join(str(b) for b in uuid.uuid4().bytes[:3])}); page.goto(BASE+'/login?callbackUrl=/admin/categories')
        page.get_by_label('ایمیل', exact=True).fill(role+'@example.com'); page.get_by_label('رمز عبور', exact=True).fill('Browser123!')
        page.get_by_role('button', name='ورود', exact=True).click(); page.wait_for_url(BASE+'/admin/categories'); return page
    customer = login('customer'); expect(customer.get_by_text('صفحه یا مورد موردنظر پیدا نشد', exact=False).first).to_be_visible()
    page = login('admin'); errors=[]; page.on('pageerror', lambda e: errors.append(str(e)))
    expect(page.get_by_text('دسته‌بندی‌ای ثبت نشده است.', exact=True)).to_be_visible()
    def create(name, parent=None):
        page.set_viewport_size({'width':360,'height':900})
        page.goto(BASE+'/admin/categories/new'); page.get_by_label('نام دسته‌بندی', exact=True).fill(name)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        if parent: page.get_by_label('دستهٔ والد', exact=True).select_option(label=parent)
        page.get_by_role('button', name='ذخیره دسته‌بندی', exact=True).click(); expect(page.get_by_role('status')).to_contain_text('دسته‌بندی ذخیره شد')
    create('والد آزمایشی'); create('فرزند آزمایشی', 'والد آزمایشی')
    for width in [360, 768, 1440]:
        page.set_viewport_size({'width':width,'height':900}); assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.goto(BASE+'/admin/categories')
    row = page.locator('tbody tr').filter(has=page.locator('td:first-child').filter(has_text='والد آزمایشی'))
    page.once('dialog', lambda d:d.accept()); row.get_by_role('button', name='حذف دسته‌بندی').click(); expect(row.get_by_role('alert')).to_contain_text('قابل حذف نیست')
    child = page.locator('tbody tr').filter(has=page.get_by_text('فرزند آزمایشی', exact=True))
    child.get_by_role('link', name='ویرایش', exact=True).click(); page.set_viewport_size({'width':360,'height':900}); assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'); page.get_by_label('دستهٔ والد', exact=True).select_option(''); page.get_by_label('دسته‌بندی فعال', exact=True).uncheck()
    page.get_by_role('button', name='ذخیره دسته‌بندی', exact=True).click(); expect(page.get_by_role('status')).to_contain_text('دسته‌بندی ذخیره شد')
    database("const c=await db.collection('categories').findOne({name:'فرزند آزمایشی'});if(c.parent)throw Error('Parent not cleared');await db.collection('products').insertOne({title:'linked',category:c._id,isActive:false})")
    page.goto(BASE+'/admin/categories'); child = page.locator('tbody tr').filter(has=page.get_by_text('فرزند آزمایشی', exact=True))
    expect(child).to_contain_text('غیرفعال'); page.once('dialog', lambda d:d.accept()); child.get_by_role('button', name='حذف دسته‌بندی').click(); expect(child.get_by_role('alert')).to_contain_text('قابل حذف نیست')
    database("await db.collection('products').deleteMany({})")
    page.once('dialog', lambda d:d.dismiss()); child.get_by_role('button', name='حذف دسته‌بندی').click(); expect(child).to_have_count(1)
    page.once('dialog', lambda d:d.accept()); child.get_by_role('button', name='حذف دسته‌بندی').click(); expect(child).to_have_count(0)
    page.set_viewport_size({'width':360,'height':900}); assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'); assert not errors, errors
    browser.close()
print('PASS: category admin access, empty state, create, parent selection/removal, inactive editing, deletion conflicts, confirmation and mobile overflow.')
