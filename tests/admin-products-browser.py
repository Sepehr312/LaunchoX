"""Product management acceptance on the isolated stage11 browser database."""
exec(open('tests/admin-browser.py',encoding='utf-8').read().split('with sync_playwright() as p:')[0])
database("const category=await db.collection('categories').insertOne({name:'دسته آزمایشی',slug:'browser-category',isActive:true,order:1});")
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=str(Path(os.environ['ProgramFiles(x86)'])/'Microsoft/Edge/Application/msedge.exe'),headless=True)
 ctx=browser.new_context();page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'/login?callbackUrl=/admin/products');page.get_by_label('ایمیل',exact=True).fill('admin@example.com');page.get_by_label('رمز عبور',exact=True).fill('Browser123!');page.get_by_role('button',name='ورود',exact=True).click();page.wait_for_url(BASE+'/admin/products')
 page.get_by_role('link',name='محصول جدید',exact=True).click()
 page.get_by_label('عنوان',exact=True).fill('محصول آزمایشی مرورگر');page.get_by_label('نامک (خالی برای ساخت خودکار)').fill('browser-product');page.get_by_label('قیمت فروش (تومان)',exact=True).fill('۱۰۰۰۰۰');page.get_by_label('قیمت قبلی (تومان)',exact=True).fill('۱۵۰۰۰۰');page.get_by_label('شناسهٔ کالا',exact=True).fill('BROWSER-SKU');page.get_by_label('موجودی',exact=True).fill('۳');page.get_by_label('توضیحات',exact=True).fill('توضیحات محصول مرورگر');page.locator('select[name=category]').select_option(label='دسته آزمایشی');page.locator('input[name=images]').fill('/images/products/side-by-side.png')
 page.get_by_role('button',name='افزودن تصویر',exact=True).click();page.locator('input[name=images]').nth(1).fill('/images/products/compact.png');page.get_by_role('button',name='بالاتر',exact=True).nth(1).click();assert page.locator('input[name=images]').first.input_value()=='/images/products/compact.png'
 page.get_by_role('button',name='افزودن مشخصه',exact=True).click();page.get_by_label('کلید مشخصه',exact=True).fill('ظرفیت');page.get_by_label('مقدار مشخصه',exact=True).fill('بزرگ')
 for width in [360,768,1440]:
  page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.get_by_role('button',name='ذخیره محصول',exact=True).click();expect(page.get_by_role('status')).to_contain_text('محصول ذخیره شد')
 page.set_viewport_size({'width':360,'height':900})
 page.goto(BASE+'/products/browser-product');expect(page.get_by_role('heading',name='محصول آزمایشی مرورگر')).to_be_visible()
 page.goto(BASE+'/admin/products');page.get_by_role('link',name='ویرایش',exact=True).click();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.get_by_label('قیمت قبلی (تومان)',exact=True).fill('');page.get_by_label('شناسهٔ کالا',exact=True).fill('');page.get_by_role('button',name='حذف تصویر',exact=True).nth(1).click();page.get_by_role('button',name='حذف مشخصه',exact=True).click();page.get_by_role('button',name='ذخیره محصول',exact=True).click();expect(page.get_by_role('status')).to_contain_text('محصول ذخیره شد')
 page.goto(BASE+'/admin/products');page.get_by_role('button',name='غیرفعال کردن',exact=True).click();expect(page.get_by_role('button',name='فعال کردن',exact=True)).to_be_visible();page.goto(BASE+'/products/browser-product');expect(page.get_by_text('صفحه یا مورد موردنظر پیدا نشد',exact=False).first).to_be_visible()
 page.goto(BASE+'/admin/products');page.get_by_role('button',name='فعال کردن',exact=True).click();expect(page.get_by_role('button',name='غیرفعال کردن',exact=True)).to_be_visible()
 page.get_by_label('جستجوی محصول').fill('ناپیدا');page.get_by_role('button',name='جستجو',exact=True).click();expect(page.get_by_text('محصولی با این عبارت جستجو پیدا نشد؛ عبارت دیگری را امتحان کنید.',exact=True)).to_be_visible()
 page.goto(BASE+'/admin/products');page.once('dialog',lambda dialog:dialog.dismiss());page.get_by_role('button',name='حذف محصول',exact=True).click();expect(page.get_by_role('link',name='ویرایش',exact=True)).to_be_visible();page.once('dialog',lambda dialog:dialog.accept());page.get_by_role('button',name='حذف محصول',exact=True).click();expect(page.get_by_text('محصولی در این صفحه برای نمایش وجود ندارد. برای افزودن محصول، «محصول جدید» را انتخاب کنید.',exact=True)).to_be_visible()
 database("const c=await db.collection('categories').findOne();await db.collection('products').insertMany(Array.from({length:13},(_,i)=>({title:'Pagination '+i,slug:'pagination-'+i,description:'Browser test',price:1000,stock:1,images:['/images/products/side-by-side.png'],category:c._id,isActive:true,isFeatured:false,attributes:[],soldCount:0,createdAt:new Date(),updatedAt:new Date()})))")
 page.reload();expect(page.locator('tbody tr')).to_have_count(12);page.get_by_role('link',name='صفحه بعدی').click();expect(page.locator('tbody tr')).to_have_count(1)
 page.set_viewport_size({'width':360,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
 browser.close()
print('PASS: product creation/storefront, editing, images ordering/removal, attributes, optional clearing, active toggle, search, pagination, confirmation and mobile overflow.')
