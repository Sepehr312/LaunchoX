# لانچ‌اوکس

فروشگاه آنلاین تک‌فروشنده، فارسی و راست‌به‌چپ با Next.js App Router، TypeScript، MongoDB/Mongoose، Auth.js v5، Tailwind CSS v4 و Zod. فروشگاه، حساب مشتری و پنل ادمین در یک برنامه قرار دارند. کاتالوگ نمونهٔ فعلی برای محصولات سرمایشی است؛ سبد مهمان و مشتری، تسویه‌حساب و پرداخت آزمایشی، مدیریت پروفایل و آدرس‌ها و سفارش‌ها، و مدیریت محصولات، دسته‌ها، سفارش‌ها و کاربران پیاده‌سازی شده‌اند.

قوانین توسعه در [AGENTS.md](AGENTS.md) و مشخصات در [docs/SPEC.md](docs/SPEC.md) هستند. نهایی‌سازی README به‌تنهایی به معنی تأیید تست نهایی کل پروژه نیست.

## پیش‌نیازها

- Node.js نسخهٔ 24 و npm برای اجرای همهٔ ابزارهای فعلی پروژه توصیه می‌شود. حداقل اعلام‌شده در `package.json` و SPEC برابر `20.19` است، اما Vitest نصب‌شده به `^22.12.0 || ^24.0.0 || >=26.0.0` نیاز دارد؛ Node.js 20 برای مجموعهٔ کامل ابزارها کافی نیست.
- Docker Desktop با موتور کانتینرهای Linux و Docker Compose برای MongoDB محلی؛ هنگام `db:up` باید روشن باشد و پورت ۲۷۰۱۷ آزاد باشد.
- دسترسی به اینترنت برای نصب وابستگی‌ها و دریافت اولیهٔ image دیتابیس.

## نصب و راه‌اندازی

دستورها را در ریشهٔ پروژه اجرا کنید:

```sh
npm install
```

از `.env.example` یک فایل `.env.local` بسازید. در PowerShell، اگر فایل از قبل وجود ندارد:

```powershell
Copy-Item .env.example .env.local
```

فایل موجود را بازنویسی نکنید؛ کلیدهای گمشده را از نمونه اضافه کنید. در `.env.local` مقدار نمونهٔ `AUTH_SECRET` را با یک مقدار تصادفی امن و `SEED_ADMIN_PASSWORD` را با رمز انتخابی خود جایگزین کنید. برای تولید مقدار تصادفی می‌توانید از این دستور استفاده کنید و خروجی را فقط در فایل محلی قرار دهید:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

تنظیمات توسط `src/lib/env.ts` با Zod بررسی می‌شوند. `MONGODB_URI` اتصال دیتابیس، `NEXT_PUBLIC_SITE_URL` نشانی عمومی برنامه، `NEXT_PUBLIC_SITE_NAME` نام فروشگاه و `AUTH_SECRET` کلید احراز هویت هستند. `AUTH_URL` در production الزامی است. برای توسعهٔ پیش‌فرض، نشانی‌های نمونه روی `http://localhost:3000` قرار دارند. `PAYMENT_PROVIDER` فعلاً فقط `fake` را می‌پذیرد. `SHIPPING_FLAT_FEE` و `FREE_SHIPPING_THRESHOLD` عدد صحیح به تومان هستند. ایمیل و رمز seed برای اجرای برنامه اختیاری، ولی برای اجرای seed الزامی‌اند.

```sh
npm run db:up
npm run seed
npm run dev
```

فروشگاه در <http://localhost:3000>، ورود در `/login`، حساب مشتری در `/account` و پنل ادمین در `/admin` در دسترس‌اند. مهمان برای ورود به مسیرهای محافظت‌شده به صفحهٔ ورود هدایت می‌شود؛ مشتری روی پنل ادمین پاسخ ۴۰۴ می‌گیرد.

در PowerShell با محدودیت اجرای اسکریپت، از `npm.cmd` به‌جای `npm` استفاده کنید.

## MongoDB محلی و Atlas

`npm run db:up` دستور `docker compose up -d` را اجرا می‌کند. فایل `docker-compose.yml` یک MongoDB با image `mongo:7`، نام کانتینر `launchox-mongo` و پورت `27017:27017` ایجاد می‌کند. داده‌ها در volume نام‌دار `mongo_data` نگه‌داری می‌شوند. اتصال نمونهٔ محلی:

```dotenv
MONGODB_URI=mongodb://localhost:27017/launchox
```

برای استفاده از MongoDB Atlas، مقدار `MONGODB_URI` در `.env.local` را با URI کلاستر خود جایگزین کنید و دسترسی شبکه و کاربر دیتابیس را در Atlas تنظیم کنید. در این حالت اجرای `db:up` لازم نیست. برنامه و seed هر دو از همین URI استفاده می‌کنند؛ پیش از seed، به‌خصوص reset، دیتابیس مقصد را بررسی کنید. URI حاوی رمز را در README یا Git قرار ندهید. مسیر `/api/health` اتصال واقعی دیتابیس را با ping بررسی می‌کند.

## دادهٔ نمونه و اطلاعات ورود

`npm run seed` در دیتابیس خالی دو حساب، پنج دستهٔ محصولات سرمایشی و ۲۴ محصول با تصاویر محلی می‌سازد. مشتری نمونه هنگام ساخت اولیه یک آدرس پیش‌فرض در تهران دارد.

| حساب | ایمیل ورود | رمز ورود |
| --- | --- | --- |
| ادمین | مقدار `SEED_ADMIN_EMAIL` در `.env.local`؛ نمونهٔ فایل: `admin@launchox.local` | مقدار انتخابی `SEED_ADMIN_PASSWORD` در `.env.local` |
| مشتری نمونه | `customer@launchox.local` | `Customer123!` |

رمز مشتری بالا یک مقدار عمومی و ثابت در کد seed برای توسعه است. هیچ رمز واقعی ادمین یا کلید محیطی در این مستند درج نشده است. رمز ادمین seed باید حداقل ۸ کاراکتر و حداکثر ۷۲ بایت باشد و ایمیل آن با ایمیل مشتری نمونه متفاوت باشد. seed در پایان خلاصهٔ تعدادها و اطلاعات ورود ادمین را چاپ می‌کند؛ خروجی شامل رمز انتخابی شماست و نباید منتشر شود.

اجرای مجدد seed کاربران را با ایمیل و دسته‌ها و محصولات را با نامک به‌روزرسانی می‌کند. شناسهٔ کاربران و آدرس‌های موجود حفظ می‌شوند؛ نام، نقش، وضعیت فعال و رمز دو حساب نمونه مطابق seed تنظیم می‌شوند. هش منطبق دوباره تولید نمی‌شود. seed داده‌های نمونهٔ کاتالوگ را نیز به‌روزرسانی می‌کند و رکوردهای اضافی را در اجرای عادی حذف نمی‌کند.

برای پاک‌سازی و ساخت دوبارهٔ دادهٔ نمونه:

```sh
npm run seed -- --reset
```

این دستور تمام محصولات، دسته‌ها، سبدها، سفارش‌ها و شمارنده‌ها را در دیتابیس مقصد پاک می‌کند و کاتالوگ نمونه را دوباره می‌سازد. کاربران حذف نمی‌شوند، ولی دو حساب نمونه طبق رفتار بالا به‌روزرسانی می‌شوند. پیش از reset دادهٔ مهم را پشتیبان بگیرید. در محیط `production` اجرای seed بدون `--force` رد می‌شود؛ این پرچم محافظ محیط را کنار می‌زند.

## دستورهای موجود

| دستور | کاربرد |
| --- | --- |
| `npm run dev` | اجرای توسعه با Turbopack |
| `npm run build` | ساخت نسخهٔ production |
| `npm start` | اجرای نسخهٔ ساخته‌شده پس از build |
| `npm run lint` | بررسی ESLint |
| `npm run typecheck` | بررسی TypeScript |
| `npm run test` | اجرای تست‌های Vitest |
| `npm run format` | فرمت کل پروژه با Prettier و مرتب‌سازی کلاس‌های Tailwind |
| `npm run db:up` | اجرای MongoDB محلی با Docker Compose |
| `npm run seed` | ساخت یا به‌روزرسانی دادهٔ نمونه |
| `npm run seed -- --reset` | پاک‌سازی محدود مجموعه‌ها و ساخت دوبارهٔ دادهٔ نمونه |

تست‌های دیتابیس از MongoDB مستقل با `mongodb-memory-server` استفاده می‌کنند. اگر باینری قابل دریافت یا اجرا نباشد، `tests/mongo-server.ts` به کانتینر موقت `mongo:7` با پورت تصادفی روی localhost و داده‌های tmpfs برمی‌گردد و آن را در پایان حذف می‌کند؛ این مسیر به Docker روشن نیاز دارد. این تست‌ها از `MONGODB_URI` برنامه استفاده نمی‌کنند. دریافت اولیهٔ باینری یا image ممکن است به اینترنت نیاز داشته باشد.

اسکریپت‌های پذیرش مرورگری در `tests/*-browser.py` موجودند و به Python، Playwright و مرورگر Edge نیاز دارند؛ این ابزارها وابستگی npm برنامه نیستند. پیش‌نیازها و تنظیمات هر اسکریپت را پیش از اجرای آن بخوانید؛ آزمون‌های دارای fixture و reset باید روی دیتابیس مستقل خود اجرا شوند.

## ساختار پوشه‌های اصلی

| مسیر | مسئولیت |
| --- | --- |
| `src/app/` | مسیرها، layout، metadata و حالت‌های loading، empty، error و ۴۰۴؛ گروه‌های `(shop)` و `(auth)`، حساب مشتری، پنل `admin` و Route Handlerهای `api` |
| `src/components/` | کامپوننت‌های `ui`، فروشگاه، احراز هویت، حساب، checkout و ادمین |
| `src/actions/` | Server Actionهای احراز هویت، سبد، checkout، حساب و مدیریت در `admin/` |
| `src/services/` | منطق احراز هویت، کاربران، کاتالوگ، سبد، سفارش، داشبورد و سلامت؛ لایهٔ پرداخت در `payment/` |
| `src/models/` | مدل‌های Mongoose برای User، Category، Product، Cart، Order و Counter |
| `src/validations/` | اسکیماهای Zod برای فرم‌ها و ورودی‌های مسیر و API |
| `src/types/` | نوع‌های مشترک، DTOها و نوع‌های سشن؛ بدون `passwordHash` در DTO |
| `src/lib/` | تنظیمات محیطی، اتصال دیتابیس، Auth.js، محدودیت تلاش، خطاها، فرمت فارسی و ابزارهای مشترک |
| `src/proxy.ts` | محافظ مسیرها و بررسی‌های دسترسی پیش از رندر |
| `scripts/` | ورودی seed، اجرای seed و کاتالوگ نمونه |
| `tests/` | تست‌های Vitest، دیتابیس مستقل تست و اسکریپت‌های پذیرش مرورگری |
| `public/` | فایل‌های عمومی، تصاویر Hero روشن/تیره و تصاویر محلی محصولات در `images/` |
| `docs/` | مشخصات و مراجع پروژه |
| `docker-compose.yml` | تعریف MongoDB محلی و volume داده |

## نقطه‌های توسعه

### درگاه پرداخت واقعی

قرارداد `PaymentProvider` در `src/services/payment/provider.ts` و انتخاب درگاه در `src/services/payment/index.ts` قرار دارند. `zarinpal.provider.ts` فقط stub است و خطای فارسی «درگاه واقعی هنوز پیاده‌سازی نشده است» می‌دهد. فعال‌سازی درگاه واقعی به پیاده‌سازی `requestPayment` و `verifyPayment`، افزودن انتخاب آن در `index.ts` و گسترش اعتبارسنجی و تنظیمات `src/lib/env.ts` نیاز دارد؛ تغییر مقدار `PAYMENT_PROVIDER` به‌تنهایی آن را فعال نمی‌کند.

مبلغ از سفارش دیتابیس خوانده می‌شود و محاسبات پولی در `order.service.ts` هستند. مبلغ ورودی provider تومان است؛ تبدیل احتمالی به ریال در provider واقعی انجام می‌شود. بازگشت پرداخت در `src/app/api/payment/callback/route.ts` و منطق آن در `payment.service.ts` قرار دارند. درگاه `fake` و صفحهٔ `/checkout/fake-gateway` فقط در توسعه و تست فعال‌اند؛ در production پرداخت آزمایشی پیش از رزرو موجودی رد می‌شود. در وضعیت فعلی خرید با پرداخت واقعی در production فعال نیست.

### ورود OTP

ورود فعلی ایمیل و رمز عبور با Credentials در `src/lib/auth.ts` است؛ تنظیمات سشن در `auth.config.ts`، منطق کاربر در `auth.service.ts` و ورودی‌ها در `validations/auth.ts` قرار دارند. فیلد اختیاری و یکتای `mobile` در مدل User برای توسعهٔ آینده موجود است. ارسال پیامک، تولید و تأیید OTP و provider مخصوص آن پیاده‌سازی نشده‌اند. توسعهٔ OTP از همین لایه‌های احراز هویت و اعتبارسنجی آغاز می‌شود و به سرویس پیامک، انقضای کد و محدودیت تلاش نیاز دارد.

### آپلود تصویر

فرم `src/components/admin/ProductForm.tsx` فعلاً نشانی تصاویر را دریافت و مرتب می‌کند؛ `images` در مدل محصول آرایه‌ای از نشانی‌هاست و با `src/validations/product.ts` بررسی می‌شود. تصاویر seed از `public/images/products/` می‌آیند. endpoint یا سرویس آپلود وجود ندارد. توسعهٔ آینده می‌تواند فایل را در یک سرویس ذخیره‌سازی قرار دهد و نشانی نتیجه را از مسیر action و سرویس محصول موجود ذخیره کند؛ کنترل دسترسی ادمین و اعتبارسنجی نوع و اندازهٔ فایل باید به مسیر آپلود اضافه شوند.

## Decisions

- Admin UI uses the approved light palette scoped to Admin.module.css, preserving shared root layout, global CSS, UI primitives and DTO files. Product administration validates and saves the optional Brand reference while retaining the legacy brand attribute for catalog filters. Images remain URL-based. See [admin UI delivery](docs/ADMIN-UI.md).


 
- Customer pages retain the shared header day/night toggle; the existing header theme changes independently while customer content remains light.

- Login and registration default to `/account` when no valid callback destination is supplied; explicitly requested safe destinations such as checkout remain intact.

- Customer interaction cues use existing order statuses and validation rules. Clipboard copies the original order reference while displayed digits remain Persian. Address editing closes only after a successful existing action; selected-address and cart-saving cues do not change backend behavior.

- Customer content uses a centered 1184px maximum width, 16px mobile gutters and 32px tablet/desktop gutters; profile forms are capped at 640px. Password changes expand beneath personal information. Saved addresses and the new-address form use adjacent RTL desktop columns and stack on mobile.

- Customer routes use a scoped light-only presentation with the existing CSS light palette; shared theme, UI primitives, types, services, and actions remain unchanged. The remember option retains only the email for the browser session. Active orders display the owner-requested approximate delivery estimate of one week; pending statuses use yellow only as requested.

- The shared header omits desktop and mobile theme toggles. All routes use the light ice-to-white background from globals.css, limited to the first 900px without repetition; the catalog wrapper stays transparent while cards and decorative artwork are preserved.


- Vazirmatn is self-hosted with next/font/local and its official OFL license because Google Fonts downloads fail during the product-detail production build. The shared font variable and fallback metrics are preserved.

- Product details use the shared ProductDetails component with real active product data, category peers, existing cart actions, current cart quantity, and the stock/ten-item cap. Missing attributes and feedback remain empty; registered images are preserved. Product URLs validate slugs and return 404 for missing/inactive products, including products created after a build.


- Homepage category links use `/categories/[slug]` with the shared `ProductsCatalog` desktop and mobile filter panels. Category scope survives reset, history, sorting, and incremental loading. The eight homepage types share one definition; the category migration backs up existing data and splits the combined refrigerator category without deleting products or changing product URLs. Run `npx tsx --conditions=react-server --env-file=.env.local scripts/update-catalog-categories.ts` to preview, then add `--apply` to migrate. Existing category slugs are retained for compatibility; a new twin category stays empty until real products are added.


- The approved Arctic footer is shared by the storefront and `/test`; informational destinations use accessible local dialogs, separate mobile/desktop day/night landscapes follow the shared header theme, and the storefront buying guide links to the homepage section.

- Brand, price, capacity, and energy filters use independent native disclosures, initially collapsed in desktop and mobile panels; collapsing a section preserves its selected filters and supports keyboard controls. Product status switches always remain visible.

- As requested, `/products` replaces numbered pagination with automatic incremental loading from the paginated API; filter and sort changes restart the list, and the desktop filter panel stays sticky with its own scroll area and hidden scrollbar. Scrolling past either end of the desktop panel continues scrolling the page. The mobile filter dialog keeps its apply button.

- Product catalog filters apply on each change; URL navigation preserves scroll and keeps the mobile filter drawer open for multiple selections. The apply button remains in the mobile drawer to close it and reveal results; desktop filters have no apply button.

- Catalog filter changes fetch only the paginated public product API instead of rendering the whole route again; superseded requests are canceled, and browser history and reload retain the selected filters.

- Catalog and seed images reuse the approved category PNG assets; top-freezer, bottom-freezer, and twin products use their matching images within the combined refrigerator category. The image-only migration in `scripts/update-catalog-images.ts` defaults to a dry run, backs up the catalog before `--apply`, and verifies that other fields remain unchanged.

- The `/products` showroom uses real server-paginated data with URL filters for category, price, stock, brands, capacity in liters, energy, and discounts. Brand and energy options come from active product attributes; capacity accepts Persian, Arabic, and ASCII digits. Discount order uses the percentage derived from price and compareAtPrice.

- The header theme preference applies to the document root on every route, including page backgrounds, text, forms, and footer. An early script restores it before paint; system appearance remains the default until a manual choice is saved.

- Storefront product grids reuse the approved Arctic preview card layout with real product attributes, links, stock, discounts, and cart actions; the homepage glass panel shows four active products ordered by soldCount. Product likes are stored in this browser, shared across cards and tabs, without an account favorites page or backend.

- The homepage reuses the approved Arctic category carousel below the Benefits Bar, with the same eight visual shortcuts and shared header theme as `/test`; catalog data and category management remain unchanged.

- Preview category rows size cards to show a whole number of items at rest and snap to complete cards after scrolling; glass edge buttons advance by one visible group. Touch, trackpad, and mouse wheel remain supported, and vertical wheel input scrolls the page again at the row boundaries.

- The homepage reuses the approved three-slide Frostic preview with mobile playback and swipe; its theme follows the shared header toggle, and its buying-guide link targets the existing homepage FAQ.

- All storefront routes reuse the approved `/test` glass header with live cart and authentication props; its appearance toggle controls the header and homepage hero.

- Catalog seed data includes 11 sample brands and links all 24 sample products through `Product.brand` while preserving legacy brand attributes. Repeated seeding preserves existing brand identities and settings; `seed -- --reset` also deletes and recreates brands.

- For an existing local development catalog, `npx tsx --conditions=react-server --env-file=.env.local scripts/link-product-brands.ts` previews missing brand links from legacy attributes; add `--apply` to back up the catalog and brands, create missing brands, and fill only unassigned `Product.brand` references. Existing product fields and assigned brands are preserved.

- Brand administration follows category full-form edits: omitted optional text fields are cleared, omitted slugs are generated from the name, and the management list includes inactive brands sorted by order and name. Linked products prevent deletion, while deactivation remains available without changing product visibility.


- All storefront routes reuse the approved `/test` glass header with live cart and authentication props; its appearance toggle remains scoped to the header.


- راهنمای مشترک طراحی صفحات فروشگاه یخچال خانگی در [docs/UI-GUIDE.md](docs/UI-GUIDE.md) ثبت شده است؛ پس‌زمینه‌های روز/شب تأییدشده و عکس منتخب یخچال در `docs/assets/` نگه‌داری می‌شوند. ذخیرهٔ این مراجع به معنی پیاده‌سازی در سایت نیست.

- The previous `/test` experiments were removed at the user's request. A new standalone `/test` page is reserved for design previews; approved designs are promoted to the relevant project pages only upon the user's request.

- حداقل Node در SPEC و `package.json` برابر 20.19 باقی مانده است؛ برای سازگاری با Vitest فعلی، راه‌اندازی با Node.js 24 توصیه می‌شود.
- کاتالوگ seed با حفظ نامک‌ها و قرارداد پنج دسته/۲۴ محصول به فروشگاه سرمایشی تبدیل شده است. تصاویر محلی و Hero روشن/تیره در `public/images` نگه‌داری می‌شوند؛ Hero دادهٔ نمایشی داخل کامپوننت است و مدل مدیریتی مستقل ندارد.
- تم از ترجیح سیستم پیروی می‌کند. نمایش قیمت و عدد و تاریخ با ابزارهای فارسی و تاریخ شمسی در `src/lib/format.ts` انجام می‌شود؛ مرز روز و ماه گزارش‌ها بر اساس `Asia/Tehran` است.
- فایل مدل‌ها برای رعایت AGENTS.md با حروف کوچک نام‌گذاری شده‌اند، برخلاف نمونهٔ نام‌گذاری SPEC. لایه‌های سرور با `server-only` محافظت می‌شوند و seed با شرط `react-server` اجرا می‌شود.
- تنظیمات محیطی هنگام استفاده با `getEnv()` بررسی می‌شوند؛ build به اتصال دیتابیس وابسته نیست. DTOها شناسه و تاریخ رشته‌ای دارند و `passwordHash` و `__v` را حذف می‌کنند.
- رمزها با bcrypt و cost 12 ذخیره می‌شوند. رمز ثبت‌نام حداکثر ۷۲ بایت است و trim یا نرمال‌سازی نمی‌شود. نقش و مبلغ و مالک سفارش از ورودی فرم پذیرفته نمی‌شوند.
- محدودیت ورود و ثبت‌نام برای هر IP پنج درخواست در پانزده دقیقه و در حافظهٔ همان سرور است. اجرای چند نمونهٔ سرور نیازمند store مشترک است؛ هدرهای IP باید توسط reverse proxy معتبر بازنویسی شوند.
- ادغام سبد مهمان بعد از ورود و ثبت‌نام انجام می‌شود. شمارندهٔ هدر مجموع تعداد واحدهای قابل‌خرید است؛ اقلام نامعتبر و کاهش موجودی هنگام خواندن سبد کنترل می‌شوند.
- سفارش روی MongoDB مستقل نیز کار می‌کند؛ رزرو موجودی اتمیک و شکست‌ها با بازگرداندن موجودی جبران می‌شوند. قفل سبد checkout تکراری را محدود می‌کند و callback تکراری دوباره موجودی یا فروش را تغییر نمی‌دهد. سفارش‌های پرداخت‌نشدهٔ منقضی هنگام ثبت سفارش و فهرست سفارش‌های ادمین بررسی می‌شوند؛ cron مستقل وجود ندارد.
- مالکیت سفارش در proxy و مجدداً در صفحه و سرویس بررسی می‌شود. انتخاب آدرس پیش‌فرض اتمیک است؛ حذف آدرس پیش‌فرض تا انتخاب مجدد، حساب را بدون آدرس پیش‌فرض می‌گذارد.
- پنل ادمین نقش کاربران را فقط نمایش می‌دهد و غیرفعال‌سازی حساب خود ادمین را در سرویس رد می‌کند. حذف دستهٔ دارای محصول یا فرزند رد می‌شود؛ شناسه، timestamps و soldCount محصول در فرم قابل ویرایش نیستند.
- پرداخت واقعی، OTP و آپلود تصویر قابلیت فعال فعلی نیستند؛ بخش نقطه‌های توسعه، محل اتصال آیندهٔ آن‌ها را مشخص می‌کند.
