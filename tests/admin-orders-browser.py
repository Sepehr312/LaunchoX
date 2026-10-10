"""Order administration acceptance against an isolated production database."""
exec(open('tests/admin-browser.py', encoding='utf-8').read().split('with sync_playwright() as p:')[0])
database("""
const user=await db.collection('users').findOne({role:'customer'});
const product=new mongoose.Types.ObjectId();
await db.collection('products').insertOne({_id:product,title:'محصول تست',stock:3});
for(const [index,status] of ['pending','processing','shipped','delivered','cancelled'].entries()) {
 await db.collection('orders').insertOne({orderNumber:'LX-'+(400001+index),user:user._id,items:[{product,title:'محصول تست',slug:'test',image:'/images/products/compact.png',price:100000,quantity:2}],subtotal:200000,shippingFee:50000,total:250000,shippingAddress:{recipientName:'گیرنده تست',province:'تهران',city:'تهران',addressLine:'خیابان تست',postalCode:'1234567890',mobile:'09123456789'},status,payment:{status:status==='pending'?'unpaid':'paid',refId:'test-ref'},note:'یادداشت تست',statusHistory:[{status,changedAt:new Date(),changedBy:user._id}],createdAt:new Date(),updatedAt:new Date()});
}
""")
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=str(Path(os.environ['ProgramFiles(x86)'])/'Microsoft/Edge/Application/msedge.exe'),headless=True)
    guest=browser.new_page(); guest.goto(BASE+'/admin/orders'); assert '/login' in guest.url
    def login(role):
        page=browser.new_page(extra_http_headers={'x-forwarded-for':'127.'+'.'.join(str(b) for b in uuid.uuid4().bytes[:3])})
        page.goto(BASE+'/login?callbackUrl=/admin/orders')
        page.get_by_label('ایمیل',exact=True).fill(role+'@example.com'); page.get_by_label('رمز عبور',exact=True).fill('Browser123!')
        page.get_by_role('button',name='ورود',exact=True).click(); page.wait_for_url(BASE+'/admin/orders'); return page
    denied=login('customer'); expect(denied.get_by_text('صفحه یا مورد موردنظر پیدا نشد',exact=False).first).to_be_visible()
    page=login('admin'); errors=[]; page.on('pageerror',lambda error:errors.append(str(error)))
    expect(page.locator('tbody tr')).to_have_count(5)
    for width in [360,768,1440]:
        page.set_viewport_size({'width':width,'height':900}); assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.locator('select[name=status]').select_option('processing'); page.get_by_role('button',name='اعمال فیلتر').click()
    expect(page.locator('tbody tr')).to_have_count(1)
    page.locator('tbody a').click(); expect(page.get_by_role('heading',name='اقلام سفارش')).to_be_visible()
    expect(page.get_by_text('گیرنده تست',exact=True)).to_be_visible(); expect(page.get_by_text('یادداشت: یادداشت تست',exact=True)).to_be_visible()
    for width in [360,768,1440]:
        page.set_viewport_size({'width':width,'height':900}); assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.locator('select[name=status]').select_option('shipped'); page.get_by_role('button',name='ثبت وضعیت',exact=True).click()
    expect(page.get_by_role('status')).to_contain_text('وضعیت سفارش ثبت شد')
    expect(page.locator('select[name=status] option')).to_have_count(1)
    page.get_by_role('button',name='ثبت وضعیت',exact=True).click()
    expect(page.get_by_text('این سفارش تغییر وضعیت دیگری ندارد.',exact=True)).to_be_visible()
    database("const o=await db.collection('orders').findOne({orderNumber:'LX-400002'});if(o.status!=='delivered'||o.statusHistory.length!==3)throw Error('Status persistence failed');const admin=await db.collection('users').findOne({role:'admin'});if(String(o.statusHistory[2].changedBy)!==String(admin._id))throw Error('Wrong actor')")
    page.goto(BASE+'/admin/orders?status=pending'); page.locator('tbody a').click()
    expect(page.locator('select[name=status] option')).to_have_count(1)
    expect(page.locator('select[name=status]')).to_have_value('cancelled')
    page.locator('select[name=status]').evaluate("e => e.add(new Option('forbidden', 'shipped'))")
    page.locator('select[name=status]').select_option('shipped')
    page.get_by_role('button',name='ثبت وضعیت',exact=True).click()
    expect(page.get_by_role('alert')).to_be_visible()
    database("const o=await db.collection('orders').findOne({orderNumber:'LX-400001'});if(o.status!=='pending'||o.statusHistory.length!==1)throw Error('Forbidden transition persisted')")
    page.locator('select[name=status]').select_option('cancelled')
    page.get_by_role('button',name='ثبت وضعیت',exact=True).click(); expect(page.get_by_text('این سفارش تغییر وضعیت دیگری ندارد.',exact=True)).to_be_visible()
    database("const p=await db.collection('products').findOne({title:'محصول تست'});if(p.stock!==5)throw Error('Stock not restored')")
    page.goto(BASE+'/admin/orders?status=pending'); expect(page.get_by_text('سفارشی با وضعیت انتخاب‌شده پیدا نشد؛ وضعیت دیگری را انتخاب کنید.',exact=True)).to_be_visible()
    page.goto(BASE+'/admin/orders?status=invalid'); expect(page.locator('p[role=alert]')).to_be_visible()
    page.goto(BASE+'/admin/orders/not-an-id'); expect(page.get_by_text('صفحه یا مورد موردنظر پیدا نشد',exact=False).first).to_be_visible()
    assert not errors,errors
    browser.close()
print('PASS: admin guards, filtering, details, legal transitions, history actor, cancellation stock, terminal states, invalid inputs, empty state and mobile detail overflow.')
