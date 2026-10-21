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

تست تصاویر در `tests/admin-catalog-fixes-browser.mjs` با Node.js 24 و Edge اجرا می‌شود. Playwright را با `npm install --prefix <temporary-tools-directory> playwright` بیرون پروژه نصب و متغیر `LAUNCHO_PLAYWRIGHT_PATH` را روی مسیر `node_modules/playwright` همان پوشه تنظیم کنید. پس از build، دستور `node --import tsx tests/admin-catalog-fixes-browser.mjs` را اجرا کنید. تست از PNG معتبر تولیدشده با Sharp، MongoDB replica set ایزوله و کانتینر موقت جایگزین استفاده می‌کند؛ به دیتابیس برنامه متصل نمی‌شود و screenshotها را در پوشهٔ موقت سیستم می‌نویسد. آپلود، جایگزینی، reload، بایت‌های تصویر و نمایش محصول در فروشگاه بررسی می‌شوند.

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

PNG متحرک (APNG) حتی با یک فریم پشتیبانی نمی‌شود. پیش از Sharp، chunkهای PNG با طول و مرزبندی واقعی خوانده می‌شوند؛ وجود `acTL`، `fcTL` یا `fdAT` در محل chunk رد می‌شود و رشتهٔ مشابه داخل دادهٔ معمولی باعث ردشدن نمی‌شود. PNG ناقص نیز رد می‌شود. عبارت «همهٔ فریم‌ها» در ادامه فقط دربارهٔ قالب‌های پشتیبانی‌شدهٔ GIF و WebP است.

نشانی نسبی `/api/images/{id}` داخلی است. نشانی مطلق فقط وقتی داخلی است که origin آن (پروتکل، دامنه و پورت) با `NEXT_PUBLIC_SITE_URL` یا فهرست صریح `IMAGE_INTERNAL_ORIGINS` مطابقت داشته باشد. برای دامنه‌های تاریخی، مثلاً `IMAGE_INTERNAL_ORIGINS=https://old.example.com,http://legacy.example.com:8080` تنظیم کنید؛ مسیر، wildcard و اطلاعات کاربری مجاز نیستند. این تنظیم از Zod عبور می‌کند و Host Header استفاده نمی‌شود. URL خارجی با مسیر مشابه قابل ذخیره است و سند محلی لازم ندارد. هنگام پاک‌سازی، origin تاریخی ناشناخته یا دادهٔ خراب مرتبط با همان شناسه، `ambiguous` گزارش می‌شود و مانع حذف است؛ alias را پس از بررسی اپراتور به تنظیم اضافه کنید.

آپلود از کادر پیش‌نمایش فرم محصول، دسته‌بندی و برند قابلیت تأییدشدهٔ پنل است. ظاهر و قرارداد `POST /api/admin/images` (یک فیلد multipart به نام `image`، پاسخ `{ data: { url } }`) حفظ شده است. ورود دستی نشانی داخلی یا اینترنتی نیز موجود است؛ عبارت قدیمی «تصاویر فقط URL هستند» صرفاً شکل ارجاع موجودیت‌ها را توصیف می‌کند، نه محل نگه‌داری باینری.

فایل PNG، JPEG، WebP یا GIF حداکثر ۵ MiB پذیرفته می‌شود. حداکثر بدنهٔ multipart برابر ۶ MiB است تا فضای سربار باقی بماند. `src/validations/image-policy.ts` مرجع مشترک محدودیت‌های کلاینت و سرور است. پیش از پارس multipart، بایت‌های واقعی جریان تا سقف تعیین‌شده خوانده می‌شوند؛ Content-Length صرفاً رد اولیه است. فایل بزرگ پاسخ ۴۱۳ و دادهٔ خراب پاسخ ۴۰۰ می‌گیرد. فقط یک فیلد تصویر مجاز است. این روش parser اختصاصی تازه‌ای اضافه نمی‌کند و حافظهٔ بدنه را محدود نگه می‌دارد، اما چند کپی محدود هنگام پارس و تبدیل فایل وجود دارد.

امضای فایل، نوع واقعی و decode کامل همهٔ فریم‌ها بررسی می‌شوند. ضلع تصویر حداکثر ۸۱۹۲، مجموع پیکسل‌های همهٔ فریم‌ها حداکثر ۱۶ میلیون، تعداد فریم‌ها حداکثر ۶۰ و مهلت پردازش تصویر ۱۰ ثانیه است. SVG، فایل اجرایی با پسوند تصویر و فایل ناقص رد می‌شوند. نام فایل ذخیره نمی‌شود؛ MongoDB شناسهٔ ObjectId تولید می‌کند. ذخیره تنها پس از اعتبارسنجی انجام می‌شود و یک درج اتمیک است. باینری در مجموعهٔ `uploadedimages` با `data: select false` نگه‌داری می‌شود. محصول (`images`)، دسته (`image`)، برند (`logo`) و تصویر تاریخی سفارش (`items.image`) نشانی را نگه می‌دارند. `GET /api/images/[id]` عمومی است و بایت‌های اصلی را با نوع ثابت تصویر، nosniff، CSP sandbox و کش immutable یک‌ساله برمی‌گرداند؛ محتوای URL موجود تغییر نمی‌کند. تصاویر عمومی را محرمانه فرض نکنید؛ حذف دیتابیس کش مرورگر/CDN را باطل نمی‌کند.

### پاک‌سازی تصاویر بلااستفاده

پاک‌سازی خودکار هنگام ذخیره یا حذف محصول انجام نمی‌شود؛ حذف/جایگزینی ارجاع، تصویر قبلی را برای بررسی بعدی سرویس آزاد می‌کند. اپراتور سرور می‌تواند job را زمان‌بندی کند. هیچ job یا حذف واقعی در این اصلاح اجرا نشده است.

```sh
npm run images:cleanup -- --limit 50
```

این دستور فقط پیش‌نمایش می‌دهد. پس از بررسی گزارش، حذف همان دسته با کنترل دوبارهٔ ارجاع‌ها:

```sh
npm run images:cleanup -- --apply --limit 50
```

حداکثر اندازهٔ دسته ۱۰۰ است. گزارش JSON شامل `scanned`، نتیجهٔ هر شناسه (`orphan`، `referenced`، `deleted`، `missing` یا `failed`) و `nextAfter` است. اگر `nextAfter` مقدار داشت، برای ادامهٔ مرور همان مقدار را با `--after <id>` بدهید؛ این cursor از توقف روی تصاویر استفاده‌شده جلوگیری می‌کند. خطای حذف گزارش می‌شود، exit code ناموفق است و در اجرای بعد قابل تکرار است. رکوردهای بدون createdAt معتبر حذف نمی‌شوند و نیازمند بررسی دستی هستند.

فقط تصاویر قدیمی‌تر از ۲۴ ساعت بررسی می‌شوند. تمام محصولات حتی غیرفعال، دسته‌ها، برندها و سفارش‌های تاریخی محافظت می‌شوند؛ URLهای مطلق، query و مسیرهای کدشده نیز محافظه‌کارانه بررسی می‌شوند. اشتراک تصویر میان موجودیت‌ها مانع حذف آن است. فرم بازِ بیش از مهلت تضمین نگه‌داری ندارد؛ اگر پاک‌سازی زودتر انجام شود، ذخیرهٔ تصویر حذف‌شده رد می‌شود و باید دوباره بارگذاری شود.

ذخیرهٔ ارجاع تصویر و حذف آن در تراکنش snapshot/majority روی همان سند تصویر write انجام می‌دهند؛ رقابت با retry تراکنش حل می‌شود و ارجاع به تصویر حذف‌شده ثبت نمی‌شود. **MongoDB replica set (از جمله Atlas) الزامی است**؛ standalone برای اتصال تصاویر آپلودشده یا حذف واقعی پشتیبانی نمی‌شود. تصاویر URL دستی قبلی به تراکنش تصویر نیاز ندارند. همهٔ نویسندگان جدید باید از `withImageReferences` با همان session استفاده کنند. seed/ویرایش مستقیم دیتابیس فقط در زمان توقف job مجاز است. افزودن محل جدید استفاده از تصویر باید با گسترش بررسی ارجاع‌ها همراه باشد. CLI فقط برای اپراتور دارای دسترسی سرور/دیتابیس است؛ مسیر عمومی برای حذف اضافه نشده است.

### ملاحظات اجرای آپلود

این Route Handler روی Node.js اجرا می‌شود؛ محدودیت `serverActions.bodySizeLimit` مربوط به آن نیست. مسیر آپلود در matcher فعلی `proxy.ts` قرار ندارد، بنابراین clone بدنهٔ Proxy روی این مسیر اجرا نمی‌شود. [مستندات Next.js دربارهٔ بافر بدنهٔ Proxy](https://nextjs.org/docs/app/api-reference/config/next-config-js/proxyClientMaxBodySize) نشان می‌دهد این تنظیم جای کنترل واقعی جریان را نمی‌گیرد. در reverse proxy/میزبان سقف درخواست ۶ MiB، timeout دریافت و محدودیت اتصال‌های هم‌زمان متناسب با حافظه تنظیم کنید؛ سقف میزبان اگر کمتر باشد پیش از رسیدن به برنامه درخواست را رد می‌کند. محدودیت‌های اپلیکیشن مصرف تجمعی چند آپلود هم‌زمان یا بافر زیرساخت بالادستی را کنترل نمی‌کنند.

بررسی ارجاع‌ها دیگر از distinct استفاده نمی‌کند. ابتدا وجود URL نسبی استاندارد با Query هدفمند روی ایندکس‌های `Product.images`، `Category.image`، `Brand.logo` و `Order.items.image` بررسی می‌شود. برای URL مطلق/قدیمی/کدشده، Query فقط رکوردهای حاوی شناسهٔ همان کاندید را انتخاب و فیلدهای تصویر را با cursor و batch برابر ۱۶ می‌خواند؛ خواندن پس از یافتن ارجاع معتبر متوقف می‌شود. timeout هر Query برابر ۱۰ ثانیه است؛ شکست خواندن مانع حذف و در گزارش ثبت می‌شود. این مسیر حافظهٔ URLهای یکتای کل مجموعه را مصرف نمی‌کند، اما regex ارجاع‌های قدیمی ممکن است روی ایندکس اسکن کند؛ هزینهٔ آن در کاتالوگ بزرگ باید پایش شود. تعریف ایندکس‌ها روی مدل‌هاست؛ بارگذاری معمول برنامه با autoIndex فعال ممکن است آن‌ها را خودکار ایجاد کند. برای Production زمان ایجاد ایندکس‌ها را با اپراتور هماهنگ کنید. خود اسکریپت Cleanup ایجاد خودکار collection و index را غیرفعال می‌کند؛ وجود ایندکس‌ها در اتصال فعلی به‌صورت فقط‌خواندنی تأیید شده است.

در خروجی Cleanup علاوه بر نتیجهٔ هر شناسه، `counts` تعداد هر وضعیت از جمله `ambiguous` و `failed` را نشان می‌دهد. تراکنش و write مشترک روی سند تصویر حفظ شده‌اند و اجرای هم‌زمان دو job به حذف دوباره منجر نمی‌شود. استفاده از `find` و cursor محدودیت `distinct` روی مجموعهٔ sharded را حذف می‌کند؛ بااین‌حال محیط sharded در این پروژه آزمایش عملی نشده است. پیش از اجرای آن، تراکنش cross-shard، دسترسی‌ها، ایندکس‌های هر shard و timeoutها در staging بررسی شوند؛ replica set بدون sharding محیط تست فعلی است. برای انتقال باینری به S3، `image.service.ts` نقطهٔ اتصال آینده است.

## Decisions

- Task 8: Category is the only runtime source for category names, slugs, images, descriptions, activity and ordering. Inactive categories leave public directories and routes, and explicit category filters return no products. Their active products remain available in general/brand catalogs and detail pages; category breadcrumbs become plain text. Product.category ObjectId references, Brand behavior and transactional image writes are preserved.
- Category routes and incremental loads resolve the current active slug; old or deleted slugs return 404 (or a failed incremental request) without redirect history. Category lists are memoized only within the React server render, and existing admin layout invalidation remains in place. No migration is executed for this change.

- APNG is rejected by structural PNG chunk boundaries before decoding; static PNG and bounded GIF/WebP remain supported. Absolute uploaded-image references trust only the configured site origin and explicit IMAGE_INTERNAL_ORIGINS aliases. Cleanup uses indexed canonical existence queries and bounded per-ID legacy cursors, conservatively retaining ambiguous historical references; no data migration is performed.

- Owner-approved image uploads remain in MongoDB with existing URL fields and API/UI contracts. Central policy keeps 5 MiB files / 6 MiB multipart requests, 24-hour grace and at most 100 cleanup candidates. Cleanup defaults to preview and preserves product/category/brand/order references; per-image transactional writes serialize attachment and deletion. Replica sets are required for these mutations, while existing external/static images retain their previous path.
- Sharp is declared directly (it was already Next.js's transitive image dependency) to fully decode untrusted raster pixels and bound dimensions/frames using its existing native decoder, avoiding handwritten image parsers. See [Sharp input safety options](https://sharp.pixelplumbing.com/api-constructor/). Original validated bytes are retained for compatibility; metadata is not rewritten.

- Product details require database product and related-product DTOs and use the server cart exclusively. Product-specific values come from saved fields and attributes; missing optional information is stated explicitly. Preview fixtures, synthetic colors/specifications, and review/question UI are removed from the production component. Generic store labels and buying guidance remain static.

- Product existence is checked by the product page's request-memoized loader, shared by metadata and rendering; product routes are excluded from the proxy. Missing, deleted, or inactive products use `notFound()`, while database errors propagate to the retry boundary. Next.js may send HTTP 200 when a loading boundary has already started streaming the not-found UI, with noindex metadata; no extra database query is issued to force a pre-stream 404.

- The owner row displays role and activity as plain Persian text instead of disabled editors or restriction notes. Editable role-save buttons use the primary blue background with white text when enabled; the modal password visibility control remains an icon-only borderless button.

- Owner password confirmation opens in an accessible native modal dialog for role changes and admin activity changes. Cancel/Escape sends no mutation, successful changes close the dialog, errors remain inside it and passwords clear on submission or dismissal. Customer activity changes retain their direct action; server authorization, reauthentication and rate limits remain unchanged.

- Vitest runs one test-file worker because database suites start isolated MongoDB instances and use real bcrypt hashes. Security concurrency cases still issue simultaneous operations within each test; the worker limit bounds host resource use without serializing those operations.

- Admin authority belongs to exactly one user ID in the singleton `AdminOwnership` record; changing emails, JWT fields, role forms or legacy `canManageAdmins` flags cannot grant ownership. Ordinary admins may toggle customers only. Role changes and admin activity changes require the current owner's password for each request. Owner role/activity cannot change through the panel. Five failed confirmations block sensitive operations for 15 minutes; failed-attempt accounting is persisted and serialized in MongoDB, including across application instances. Successful confirmations reset the counter; passwords never enter audit records or action results. MFA is a future enhancement.

- All access and ownership changes share a `user-access` lock in snapshot/majority transactions, with current actor authorization and audit insertion in the same transaction. A replica set is required (Atlas supports this); run `npm run db:up`, wait for a healthy container and use the URI from `.env.example` locally. Standalone databases fail closed. Access audits store actor ID/email, target, role/activity before and after and timestamps. Ownership audits store previous/new owner IDs, operator label, reason and the target's previous role. No panel action exposes ownership transfer or audit deletion. User deletion is unsupported. The requested validated role editor remains an exception to AGENTS.md's general no-role-form-input rule.

- Ownership is provisioned explicitly through the trusted server CLI, never inferred from seed credentials. Create a separate owner with `npm run owner -- create owner@example.com "operator-name" "Initial owner provisioning"`. A cryptographically random password is saved once to the ignored `.env.owner-initial` file (never printed); keep it private, store it securely and remove the file afterward. The command refuses to overwrite that file. Bootstrap an existing active account with `npm run owner -- bootstrap <target-id> "operator-name" "Initial owner provisioning"`. For recovery/transfer use `npm run owner -- transfer <target-id> <expected-current-owner-id> "operator-name" "Reason for recovery"`; an active customer target is promoted atomically, while the former owner remains an ordinary admin. To create a replacement owner account, append the expected current owner ID to the `create` command. Verify target identity and access first. Ownership changes and account creation roll back if auditing fails. The operator label identifies the trusted CLI operator; access to the server/database is the authorization boundary. Without a configured owner, sensitive panel operations remain disabled. Seed neither assigns ownership nor resets an existing owner's credentials/access; run catalog maintenance offline.

- The admin menu trigger is hidden at widths of 1024px and above; narrower screens use a borderless icon-only button with a Persian accessible label and a 44px touch target. Its selector overrides the shared admin button display rule.

- The owner-requested user role editor is an admin-only exception to the earlier no-role-form-input rule: guarded actions validate only the target ID and the customer/admin role, preserve unrelated fields and block self-role changes. Public registration/profile forms still cannot assign roles. Admin guards recheck current database role/activity so stale JWT roles cannot retain access. Administrators sort first; email text aligns with its RTL column heading. Role fields remount on confirmed role changes while action feedback is retained, keeping the select synchronized after saves and server refreshes.

- At the user's request, the admin dashboard shows the three latest orders instead of the ten specified in SPEC section 9. Desktop and mobile admin logout controls use a muted text label and outlined exit icon matching the supplied reference.

- Admin order details use the approved two-column concept: products/history in the main column and explicit next-step actions, customer/shipping and payment cards beside it. Mobile shows the action first. Cancellation uses a native confirmation dialog; paid cancellations do not initiate refunds. List filters travel as validated query parameters to preserve the return destination, and history/payment timestamps use Tehran time through the shared formatter.

- Admin orders reuse the approved light admin shell, status totals across all orders, and URL-backed live filters. Search matches literal order references (including Persian digits) or current customer names after a 300ms pause; payment and status changes apply immediately. Date ranges mean the last 7, 30, or 90 rolling days. Filter changes reset pagination and preserve the other selections; no apply/reset buttons are shown.

- Admin product creation/editing now requires a saved brand through a shared admin-only Zod schema and the form select; legacy database products and generic seed/service input remain compatible. Catalog forms place media before their main fields and publication settings below them on narrow screens, while desktop grid areas retain the approved two-column layout.

- Brand and category lists retain the table by default and add the approved responsive card view with real saved logos/images, existing edit/delete actions and shared live search. A validated browser preference remembers the view separately for each list; blocked storage falls back to an in-memory selection. Card styles use dedicated CSS modules, and missing images display an icon.

- Product, brand and category create/edit forms extend step 11 with the approved form mockup: one white page panel, ice-blue section headers, full-width identity fields, a desktop media/publication column, native checkboxes and a shared save footer. The layout stacks on mobile; existing validation, image uploads and save navigation are reused.

- Brand, category and user lists share the approved product-list header, table spacing and compact row actions. All four lists use a shared live search with a 300 ms typing delay, URL state, preserved input focus and a product-page reset on query changes; there are no submit/reset controls or brand status filter. Category search matches name/slug and user search matches name/email across the existing complete DTO lists. Existing edit/delete guards and self-account protection remain in place. Header create links use an accessible 44 px plus-only button below 640 px and retain their full labels on larger screens.

- The approved calm admin dashboard and product-list mockups extend step 11 using the existing light ice/blue palette and live data. Recent orders and low stock share desktop columns and stack on mobile; wide tables scroll inside their own region. Product brands use the existing resolved Brand attribute (with legacy fallback), active switches stay in the status column, and search, numbered pagination, edit and confirmed deletion reuse existing actions. Preview figures are never substituted for database values.

- The requested admin fixes extend step 11 without changing its presentation: selecting an existing image preview uploads PNG/JPEG/WebP/GIF files up to 5 MiB; MongoDB stores the bytes and `/api/images/[id]` serves immutable public URLs, avoiding a new storage provider or ephemeral local files. Successful product/category/brand saves return to their list, and table surfaces support native touch scrolling and mouse dragging. Category deletion also checks legacy string references and never deletes linked products. This explicitly supersedes the earlier image-upload exclusion; unused uploads are retained for now.


- Shared password visibility controls retain input focus during pointer activation, use a minimum 44px touch target and 16px input text, and sit outside field labels to keep mobile taps and keyboard activation consistent across login, registration and password changes.

- Address creation and editing in the account and checkout share Persian-name filtering, numeric phone/postal inputs, dependent province/city selects and a multiline street address. The same name and province/city rules run on the server. Address DTO lists place the default first while preserving the order of other addresses. Province/city options are an offline snapshot of [MJavadSF/Iran_provinces_cities](https://github.com/MJavadSF/Iran_provinces_cities), normalized for Persian characters, with the upstream [MIT license](docs/iran-locations-LICENSE.txt); no runtime API or extra dependency is required.
- Product detail routes decode URL-encoded slugs once before validation and lookup, using the same validation in the page and proxy so Persian admin-created slugs remain accessible.

- The homepage hero enables automatic slide rotation on desktop and mobile using the existing six-second interval, with the existing hover, focus, visibility, and reduced-motion pauses.

- Retired QA scripts, home reference images and duplicate product/night-footer assets are removed. Footer backgrounds and browser fixtures reuse the retained category and desktop/mobile landscape images. Local test routes and their test-only fixtures are removed.

- The homepage category shortcut shows “view all” from eight active categories onward. It offers the first eight in admin order on compact screens, then admits additional cards only when the existing 1560px section can fit readable 135px cards plus a preferred 16px gap; remaining categories stay in `/categories`. The section width stays unchanged, card gaps remain capped and short rows centered.

- Homepage category cards share spare row width through a gap capped at 16px, then remain centered on wider displays; their existing size cap and mobile carousel behavior are preserved.

- Category product pages hide the category switcher on desktop and mobile; the general and brand catalogs retain their category filters, while sorting and other filters stay available within a selected category.

- The shared desktop and mobile header links to `/categories` between brands and comparison. This directory reuses the brands page visual style, lists active database categories with active product counts (including out-of-stock products), uses admin-saved category images with a neutral icon when absent, and links to the existing filtered category pages. Buying guides link to the full product catalog because Category has no buying-guide mapping field.

- The `/services` page extends the step 7 storefront with static buying, delivery, authorized installation and warranty guides, native expandable FAQs, order-account links and the existing footer contact details. No unverified service hours, installation commitments or request form are introduced; the shared header and after-sales footer link point to this page.

- `/compare` is the approved live comparison page under the shared shop layout, with entry links on product cards, product details, and desktop/mobile navigation. Validated browser storage remembers selections across product pages; an explicit `products` URL, including an empty selection, takes priority. Database errors use the normal retry boundary. The picker scrollbar is hidden while scrolling stays enabled.


- The public `/about` page reuses the shop layout, existing light tokens, product assets, section heading and navigation styles; desktop and mobile header links point to it. Its specification CTA opens `/products`; contact links to the existing footer contact section. Scroll reveals honor reduced motion and keep content visible by default.



- Admin UI uses the approved light palette scoped to Admin.module.css, preserving shared root layout, global CSS, UI primitives and DTO files. Product administration validates and saves the optional Brand reference without persisting independent brand attributes; existing historical attributes remain audit data. Images remain URL-based. See [admin UI delivery](docs/ADMIN-UI.md).



 

- JWTs identify users, while `getCurrentUser()` reads current role and activity from the database for server guards and navigation. The proxy performs only session-presence checks for authentication; role redirects run in the auth layout and account index page. Active administrators go to `/admin`, demoted administrators retain `/account` access with the same JWT, and inactive or deleted accounts can reach the login form without redirect loops. Explicit checkout and account subpage destinations remain intact.

- Customer interaction cues use existing order statuses and validation rules. Clipboard copies the original order reference while displayed digits remain Persian. Address editing closes only after a successful existing action; selected-address and cart-saving cues do not change backend behavior.

- Customer content uses a centered 1184px maximum width, 16px mobile gutters and 32px tablet/desktop gutters; profile forms are capped at 640px. Password changes expand beneath personal information. Saved addresses and the new-address form use adjacent RTL desktop columns and stack on mobile.

- Customer routes reuse the shared light palette and page background from `globals.css`. The login checkbox stores only the email in sessionStorage until the tab closes. Delivery estimates appear only for paid orders that have not been delivered or cancelled; pending badges retain their existing yellow treatment.

- The shared header omits desktop and mobile theme toggles. All routes use the light ice-to-white background from globals.css, limited to the first 900px without repetition; the catalog wrapper stays transparent while cards and decorative artwork are preserved.


- Vazirmatn is self-hosted with next/font/local and its official OFL license because Google Fonts downloads fail during the product-detail production build. The shared font variable and fallback metrics are preserved.

- Product details use the shared ProductDetails component with real active product data, category peers, existing cart actions, current cart quantity, and the stock/ten-item cap. Missing attributes and feedback remain empty; registered images are preserved. Product URLs validate slugs and return 404 for missing/inactive products, including products created after a build.


- Homepage category links use `/categories/[slug]` with the shared `ProductsCatalog` desktop and mobile filter panels. Category scope survives reset, history, sorting, and incremental loading. The historical sample definitions live in scripts/catalog-categories.ts and are used only by seed/migration scripts; the category migration backs up existing data and splits the combined refrigerator category without deleting products or changing product URLs. Run `npx tsx --conditions=react-server --env-file=.env.local scripts/update-catalog-categories.ts` to preview, then add `--apply` to migrate. Existing category slugs are retained for compatibility; a new twin category stays empty until real products are added.


- The approved Arctic footer is shared by the storefront and `/test`; informational destinations use accessible local dialogs, the storefront buying guide links to the homepage section.

- Brand, price, capacity, and energy filters use independent native disclosures, initially collapsed in desktop and mobile panels; collapsing a section preserves its selected filters and supports keyboard controls. Product status switches always remain visible.

- As requested, `/products` replaces numbered pagination with automatic incremental loading from the paginated API; filter and sort changes restart the list, and the desktop filter panel stays sticky with its own scroll area and hidden scrollbar. Scrolling past either end of the desktop panel continues scrolling the page. The mobile filter dialog keeps its apply button.

- Product catalog filters apply on each change; URL navigation preserves scroll and keeps the mobile filter drawer open for multiple selections. The apply button remains in the mobile drawer to close it and reveal results; desktop filters have no apply button.

- Catalog filter changes fetch only the paginated public product API instead of rendering the whole route again; superseded requests are canceled, and browser history and reload retain the selected filters.

- Catalog and seed images reuse the approved category PNG assets; top-freezer, bottom-freezer, and twin products use their matching images within the combined refrigerator category. The image-only migration in `scripts/update-catalog-images.ts` defaults to a dry run, backs up the catalog before `--apply`, and verifies that other fields remain unchanged.

- The `/products` showroom uses real server-paginated data with URL filters for category, price, stock, brands, capacity in liters, energy, and discounts. Brand options come from active Brand references on active products, and energy options come from active product attributes; capacity accepts Persian, Arabic, and ASCII digits. Discount order uses the percentage derived from price and compareAtPrice.


- Storefront product grids reuse the approved Arctic preview card layout with real product attributes, links, stock, discounts, and cart actions; the homepage glass panel shows four active products ordered by soldCount. Product likes are stored in this browser, shared across cards and tabs, without an account favorites page or backend.

- The homepage Arctic carousel reads active categories from the database in admin-defined order, using their current names and slugs. Category images use only the admin-saved image, with a neutral icon when absent; no runtime slug-to-artwork list remains; deletion, activation, creation and edits use the existing admin cache invalidation. Empty and single-category layouts are supported.

- Preview category rows size cards to show a whole number of items at rest and snap to complete cards after scrolling; glass edge buttons advance by one visible group. Touch, trackpad, and mouse wheel remain supported, and vertical wheel input scrolls the page again at the row boundaries.



- Catalog seed data includes 11 sample brands and links all 24 sample products through `Product.brand` without adding independent legacy brand attributes. Repeated seeding preserves existing brand identities and settings; `seed -- --reset` also deletes and recreates brands.

- Existing catalogs use the dry-run-first migration in [docs/BRAND-MIGRATION.md](docs/BRAND-MIGRATION.md). The historical linking command delegates to this migration and never creates brands.

- Brand administration follows category full-form edits: omitted optional text fields are cleared, omitted slugs are generated from the name, and the management list includes inactive brands sorted by order and name. Linked products prevent deletion, while deactivation remains available without changing product visibility.




- راهنمای مشترک طراحی صفحات فروشگاه یخچال خانگی در [docs/UI-GUIDE.md](docs/UI-GUIDE.md) ثبت شده است؛ پس‌زمینه‌های روز/شب تأییدشده و عکس منتخب یخچال در `docs/assets/` نگه‌داری می‌شوند. ذخیرهٔ این مراجع به معنی پیاده‌سازی در سایت نیست.

- The previous `/test` experiments were removed at the user's request. A new standalone `/test` page is reserved for design previews; approved designs are promoted to the relevant project pages only upon the user's request.

- حداقل Node در SPEC و `package.json` برابر 20.19 باقی مانده است؛ برای سازگاری با Vitest فعلی، راه‌اندازی با Node.js 24 توصیه می‌شود.
- کاتالوگ seed با حفظ نامک‌ها و قرارداد پنج دسته/۲۴ محصول به فروشگاه سرمایشی تبدیل شده است. تصاویر محلی و Hero روشن/تیره در `public/images` نگه‌داری می‌شوند؛ Hero دادهٔ نمایشی داخل کامپوننت است و مدل مدیریتی مستقل ندارد.
- نمایش قیمت و عدد و تاریخ با ابزارهای فارسی و تاریخ شمسی در `src/lib/format.ts` انجام می‌شود؛ مرز روز و ماه گزارش‌ها بر اساس `Asia/Tehran` است.
- فایل مدل‌ها برای رعایت AGENTS.md با حروف کوچک نام‌گذاری شده‌اند، برخلاف نمونهٔ نام‌گذاری SPEC. لایه‌های سرور با `server-only` محافظت می‌شوند و seed با شرط `react-server` اجرا می‌شود.
- تنظیمات محیطی هنگام استفاده با `getEnv()` بررسی می‌شوند؛ build به اتصال دیتابیس وابسته نیست. DTOها شناسه و تاریخ رشته‌ای دارند و `passwordHash` و `__v` را حذف می‌کنند.
- رمزها با bcrypt و cost 12 ذخیره می‌شوند. رمز ثبت‌نام حداکثر ۷۲ بایت است و trim یا نرمال‌سازی نمی‌شود. نقش و مبلغ و مالک سفارش از ورودی فرم پذیرفته نمی‌شوند.
- محدودیت ورود و ثبت‌نام برای هر IP پنج درخواست در پانزده دقیقه و در حافظهٔ همان سرور است. اجرای چند نمونهٔ سرور نیازمند store مشترک است؛ هدرهای IP باید توسط reverse proxy معتبر بازنویسی شوند.
- ادغام سبد مهمان بعد از ورود و ثبت‌نام انجام می‌شود. شمارندهٔ هدر مجموع تعداد واحدهای قابل‌خرید است؛ اقلام نامعتبر و کاهش موجودی هنگام خواندن سبد کنترل می‌شوند.
- سفارش با تصاویر URL دستی روی MongoDB مستقل نیز کار می‌کند؛ اتصال تصویر آپلودشده به replica set نیاز دارد. رزرو موجودی اتمیک و شکست‌ها با بازگرداندن موجودی جبران می‌شوند. قفل سبد checkout تکراری را محدود می‌کند و callback تکراری دوباره موجودی یا فروش را تغییر نمی‌دهد. سفارش‌های پرداخت‌نشدهٔ منقضی هنگام ثبت سفارش و فهرست سفارش‌های ادمین بررسی می‌شوند؛ cron مستقل وجود ندارد.
- مالکیت سفارش در proxy و مجدداً در صفحه و سرویس بررسی می‌شود. انتخاب آدرس پیش‌فرض اتمیک است؛ حذف آدرس پیش‌فرض تا انتخاب مجدد، حساب را بدون آدرس پیش‌فرض می‌گذارد.
- پنل ادمین طبق درخواست مالک، نقش کاربران دیگر را بین مشتری و ادمین تغییر می‌دهد؛ تغییر نقش و غیرفعال‌سازی حساب خود ادمین در سرویس رد می‌شود. حذف دستهٔ دارای محصول یا فرزند رد می‌شود؛ شناسه، timestamps و soldCount محصول در فرم قابل ویرایش نیستند.
- پرداخت واقعی و OTP قابلیت فعال فعلی نیستند؛ بخش نقطه‌های توسعه، محل اتصال آیندهٔ آن‌ها را مشخص می‌کند. آپلود تصویر اکنون در فرم‌های محصول، دسته‌بندی و برند از کادر پیش‌نمایش انجام می‌شود.
- The `/brands` directory reuses the shop shell and Brand source, exposes only public fields, and counts active products by `Product.brand`. Card links open `/brands/[slug]`, resolved to the current active Brand ID; name filters resolve current Brand references only. Search uses the existing name and slug (the model has no separate English name). Inactive brands cannot receive new product assignments, but existing assignments can be retained on edits. Products with only legacy attributes require the reviewed migration before the reference-only version is deployed.

- `/brands/[slug]` reuses ProductsCatalog and its incremental loading through a server action whose route slug is captured by Next.js; query brand selectors are ignored and the active Brand is revalidated for each load. Categories, prices, energy options and counts use real linked products. The Brand model has no English-name field, so no English name is inferred. Reference-backed brand names override legacy attributes in storefront DTOs and filters; unassigned legacy products require migration before deployment. No migration is run against the current database.

- The approved brand directory and brand product pages are published at `/brands` and `/brands/[slug]`, with shared desktop/mobile header navigation, production card and breadcrumb links, and indexable metadata. Data access and filtering use the existing services; the former preview routes have been removed.

- Brand directory cards use subtle translucent surfaces, 12px backdrop blur, fine borders and soft shadows over a faint ice backdrop; browsers without backdrop-filter retain an opaque readable surface, and reduced-motion preferences disable hover movement.

- Standard storefront product cards place a compact icon-only comparison link below the like button, retaining a Persian accessible label and tooltip; compact cards and product-detail comparison links retain their existing presentation.

- Product details place the icon-only comparison link between like and share in the gallery toolbar, matching the adjacent controls and retaining its Persian accessible label.

- Product.brand is the sole brand source for storefront display, comparison, search and filters. Historical brand attributes are retained only as audit data; new writes reject independent brand attributes. Admin forms still require a brand, while service-level unbranded products remain supported. The old linking command now uses the safe migration without creating brands. See [brand migration and required deployment order](docs/BRAND-MIGRATION.md); complete the migration and data review before deploying the reference-only readers.
