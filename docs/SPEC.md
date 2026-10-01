# لانچ‌اوکس — مشخصات ساخت فروشگاه آنلاین

نسخه: ۱۴۰۵/۰۷/۰۹ (2026-10-01)

این سند مشخص می‌کند Codex چه چیزی بسازد. قوانین کار، سبک کد و امنیت در [AGENTS.md](../AGENTS.md) آمده و در اینجا تکرار نمی‌شود.

## فهرست

1. [معیار اتمام](#۱-معیار-اتمام-این-فاز)
2. [معرفی، محدوده و پیش‌فرض‌ها](#۲-معرفی-محدوده-و-پیشفرضها)
3. [تکنولوژی‌ها](#۳-تکنولوژیها)
4. [ساختار پوشه‌ها](#۴-ساختار-پوشهها)
5. [متغیرهای محیطی و تنظیمات](#۵-متغیرهای-محیطی-و-تنظیمات)
6. [لایهٔ دیتابیس و مدل‌ها](#۶-لایهٔ-دیتابیس-و-مدلها)
7. [احراز هویت و سطح دسترسی](#۷-احراز-هویت-و-سطح-دسترسی)
8. [اعتبارسنجی، سرویس‌ها، Server Actionها و API](#۸-اعتبارسنجی-سرویسها-server-actionها-و-api)
9. [صفحات و رابط کاربری](#۹-صفحات-و-رابط-کاربری)
10. [سبد خرید، تسویه، سفارش و پرداخت](#۱۰-سبد-خرید-تسویه-سفارش-و-پرداخت)
11. [دادهٔ نمونه، اسکریپت‌ها و تست](#۱۱-دادهٔ-نمونه-اسکریپتها-و-تست)
12. [مراحل پیاده‌سازی](#۱۲-مراحل-پیادهسازی)

---

## ۱. معیار اتمام این فاز

این فاز وقتی تمام است که همهٔ موارد زیر درست باشند:

- `npm run dev` بدون خطا اجرا می‌شود و صفحهٔ اصلی راست‌به‌چپ و با فونت فارسی نمایش داده می‌شود.
- `npm run seed` یک دیتابیس خالی را با دسته‌بندی‌ها، محصولات و یک کاربر ادمین پر می‌کند.
- بازدیدکننده می‌تواند محصولات را ببیند، به سبد اضافه کند، ثبت‌نام کند، وارد شود و سفارش ثبت کند و با درگاه آزمایشی پرداخت کند.
- ادمین می‌تواند وارد `/admin` شود، محصول و دسته‌بندی بسازد، ویرایش و حذف کند و وضعیت سفارش را تغییر دهد.
- مشتری به هیچ صفحهٔ `/admin` و هیچ action ادمین دسترسی ندارد.
- `npm run lint`، `npm run typecheck`، `npm run test` و `npm run build` همه بدون خطا اجرا می‌شوند.

## ۲. معرفی، محدوده و پیش‌فرض‌ها

لانچ‌اوکس یک فروشگاه آنلاین تک‌فروشنده برای مشتریان ایرانی است: ویترین فروشگاه، حساب کاربری، سبد خرید، تسویه‌حساب و پنل ادمین، همه در یک اپلیکیشن Next.js با دیتابیس MongoDB.

**در محدودهٔ این فاز**

- راه‌اندازی پروژه، ابزارها، اتصال دیتابیس و همهٔ مدل‌ها.
- احراز هویت با دو نقش `customer` و `admin`.
- ویترین: صفحهٔ اصلی، فهرست محصولات با فیلتر، جزئیات محصول، صفحهٔ دسته‌بندی، جستجو.
- سبد خرید برای مهمان و کاربر واردشده، تسویه‌حساب، ثبت سفارش.
- حساب کاربری: پروفایل، آدرس‌ها، تاریخچهٔ سفارش‌ها.
- پنل ادمین: داشبورد، مدیریت محصولات، دسته‌بندی‌ها، سفارش‌ها و کاربران.
- پرداخت از طریق یک interface، فقط با درگاه آزمایشی (بخش ۱۰).

**خارج از محدوده (الان ساخته نشود)**

درگاه پرداخت واقعی، ورود با پیامک/OTP، ارسال ایمیل، کد تخفیف، نظرات محصول، علاقه‌مندی‌ها، چندزبانه، تنوع محصول (رنگ/سایز)، آپلود تصویر. فقط نقطهٔ توسعهٔ پرداخت و OTP آماده شود.

**پیش‌فرض‌ها (مالک پروژه ممکن است تغییرشان دهد)**

| موضوع | تصمیم |
| --- | --- |
| دیتابیس | MongoDB Atlas در production؛ MongoDB محلی با Docker Compose برای توسعه |
| ورود | ایمیل + رمز عبور (بعداً ممکن است موبایل + OTP جایگزین شود) |
| زبان | فقط فارسی، `lang="fa"`، `dir="rtl"` |
| واحد پول | تومان، ذخیره به‌صورت عدد صحیح |
| تاریخ | نمایش شمسی، ذخیره به‌صورت `Date` با UTC |
| اعداد | نمایش با ارقام فارسی و جداکنندهٔ هزارگان |
| پنل ادمین | در همین اپلیکیشن زیر `/admin` |
| تصاویر | به‌صورت URL ذخیره می‌شوند؛ فعلاً ادمین آدرس تصویر را وارد می‌کند |

## ۳. تکنولوژی‌ها

آخرین نسخهٔ پایدار هر پکیج را هنگام نصب بگیر و `package-lock.json` را commit کن. Node.js نسخهٔ 20.19 یا بالاتر لازم است؛ در `package.json` بنویس `"engines": {"node": ">=20.19"}`.

| بخش | پکیج | توضیح |
| --- | --- | --- |
| فریم‌ورک | `next`، `react`، `react-dom` | فقط App Router، بدون پوشهٔ `pages/`. Turbopack برای dev |
| زبان | `typescript` | `strict: true`، مسیر مستعار `@/*` → `src/*` |
| دیتابیس | `mongoose` | یک اتصال کش‌شده (بخش ۶) |
| احراز هویت | `next-auth` (Auth.js v5)، `bcryptjs` | Credentials provider، سشن JWT |
| اعتبارسنجی | `zod` | مشترک بین فرم‌ها، actionها و API |
| استایل | `tailwindcss` (v4)، `@tailwindcss/postcss` | کلاس‌های منطقی برای RTL |
| ابزارهای UI | `clsx`، `tailwind-merge`، `lucide-react` | تابع `cn()` در `src/lib/utils.ts` |
| فونت | `next/font/google` → Vazirmatn | subsetهای `arabic` و `latin` |
| اعلان | `sonner` | toast برای نتیجهٔ فرم‌ها |
| محافظ سرور | `server-only` | بالای فایل‌های `services/`، `models/`، `lib/db.ts` |
| تست | `vitest`، `mongodb-memory-server`، `@testing-library/react` | تست واحد سرویس‌ها و اعتبارسنجی |
| lint و فرمت | `eslint` (تنظیمات Next)، `prettier`، `prettier-plugin-tailwindcss` | |
| اجرای seed | `tsx` | اجرای `scripts/seed.ts` |

**نکته‌های نسخهٔ Next.js**

- `params` و `searchParams` در مسیرها Promise هستند؛ همیشه `await` شوند.
- اگر Next.js نصب‌شده نسخهٔ ۱۶ یا بالاتر است، فایل رهگیری درخواست `src/proxy.ts` است؛ در نسخهٔ ۱۵ `src/middleware.ts`. نسخهٔ نصب‌شده را بررسی کن و فایل درست را بساز.
- تاریخ و عدد فارسی با API داخلی `Intl` (`fa-IR`، `calendar: "persian"`) ساخته می‌شود؛ کتابخانهٔ تاریخ اضافه نکن.

## ۴. ساختار پوشه‌ها

این ساختار را بساز. route groupهای داخل پرانتز در URL دیده نمی‌شوند.

```
launchox/
├─ AGENTS.md                     # قوانین Codex (موجود است)
├─ docs/SPEC.md                  # همین سند (موجود است)
├─ scripts/
│  └─ seed.ts                    # پر کردن دیتابیس با دادهٔ نمونه
├─ public/
│  └─ images/placeholder.png
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx               # <html lang="fa" dir="rtl">، فونت، Toaster، SessionProvider
│  │  ├─ globals.css              # import Tailwind + توکن‌های رنگ
│  │  ├─ not-found.tsx
│  │  ├─ error.tsx
│  │  ├─ (shop)/
│  │  │  ├─ layout.tsx            # هدر و فوتر
│  │  │  ├─ page.tsx              # صفحهٔ اصلی
│  │  │  ├─ products/page.tsx
│  │  │  ├─ products/[slug]/page.tsx
│  │  │  ├─ categories/[slug]/page.tsx
│  │  │  ├─ search/page.tsx
│  │  │  ├─ cart/page.tsx
│  │  │  ├─ checkout/page.tsx
│  │  │  ├─ checkout/result/page.tsx
│  │  │  ├─ checkout/fake-gateway/page.tsx   # فقط در توسعه، بخش ۱۰
│  │  │  └─ account/
│  │  │     ├─ page.tsx           # پروفایل
│  │  │     ├─ addresses/page.tsx
│  │  │     └─ orders/[[...id]]/page.tsx
│  │  ├─ (auth)/
│  │  │  ├─ login/page.tsx
│  │  │  └─ register/page.tsx
│  │  ├─ admin/
│  │  │  ├─ layout.tsx            # سایدبار، بررسی نقش admin
│  │  │  ├─ page.tsx              # داشبورد
│  │  │  ├─ products/             # فهرست، new، [id]/edit
│  │  │  ├─ categories/           # فهرست، new، [id]/edit
│  │  │  ├─ orders/               # فهرست، [id]
│  │  │  └─ users/                # فهرست
│  │  └─ api/
│  │     ├─ auth/[...nextauth]/route.ts
│  │     ├─ health/route.ts
│  │     ├─ products/route.ts
│  │     └─ payment/callback/route.ts
│  ├─ actions/                    # Server Actionها، یک فایل برای هر حوزه
│  ├─ components/
│  │  ├─ ui/                      # Button، Input، Card، Badge، Modal، Pagination و ...
│  │  ├─ shop/                    # ProductCard، ProductGrid، CartItem، PriceTag و ...
│  │  ├─ admin/                   # DataTable، ProductForm، OrderStatusSelect و ...
│  │  └─ layout/                  # Header، Footer، AdminSidebar
│  ├─ lib/
│  │  ├─ db.ts                    # اتصال Mongoose
│  │  ├─ env.ts                   # متغیرهای محیطی اعتبارسنجی‌شده
│  │  ├─ auth.config.ts           # تنظیمات Auth.js بدون وابستگی به دیتابیس
│  │  ├─ auth.ts                  # Auth.js کامل و توابع کمکی
│  │  ├─ rate-limit.ts
│  │  ├─ format.ts                # فرمت قیمت، تاریخ و عدد (fa-IR)
│  │  ├─ slug.ts                  # ساخت slug با حروف فارسی
│  │  ├─ errors.ts                # AppError و نوع ActionResult
│  │  └─ utils.ts                 # cn()
│  ├─ models/                     # مدل‌های Mongoose
│  ├─ services/                   # منطق کسب‌وکار
│  │  └─ payment/                 # interface درگاه + درگاه آزمایشی
│  ├─ validations/                # اسکیماهای Zod
│  ├─ types/                      # نوع‌های مشترک، next-auth.d.ts
│  └─ proxy.ts                    # یا middleware.ts در Next.js 15
├─ tests/                         # تست‌های Vitest
├─ docker-compose.yml             # MongoDB محلی
├─ .env.example
└─ README.md
```

قوانین import بین لایه‌ها در `AGENTS.md` آمده است.

## ۵. متغیرهای محیطی و تنظیمات

همهٔ متغیرهای محیطی از `src/lib/env.ts` خوانده می‌شوند. این فایل `process.env` را با Zod بررسی می‌کند و اگر متغیری نباشد، هنگام اجرا خطای واضح می‌دهد.

| متغیر | اجباری | نمونه | کاربرد |
| --- | --- | --- | --- |
| `MONGODB_URI` | بله | `mongodb://localhost:27017/launchox` | آدرس اتصال دیتابیس (در production آدرس Atlas) |
| `AUTH_SECRET` | بله | خروجی `npx auth secret` | امضای توکن‌های سشن |
| `AUTH_URL` | فقط production | `https://launchox.ir` | آدرس عمومی برای Auth.js |
| `NEXT_PUBLIC_SITE_URL` | بله | `http://localhost:3000` | لینک‌های مطلق و آدرس بازگشت از درگاه |
| `NEXT_PUBLIC_SITE_NAME` | بله | `لانچ‌اوکس` | نام فروشگاه در هدر و metadata |
| `PAYMENT_PROVIDER` | بله | `fake` | درگاه پرداخت (فعلاً فقط `fake`) |
| `SEED_ADMIN_EMAIL` | برای seed | `admin@launchox.local` | ایمیل ادمینی که seed می‌سازد |
| `SEED_ADMIN_PASSWORD` | برای seed | `ChangeMe123!` | رمز آن؛ حداقل ۸ کاراکتر |
| `SHIPPING_FLAT_FEE` | بله | `50000` | هزینهٔ ثابت ارسال به تومان |
| `FREE_SHIPPING_THRESHOLD` | بله | `1000000` | مبلغ سفارشی (تومان) که بالاتر از آن ارسال رایگان است |

- فایل `.env.example` را با همین کلیدها و مقدارهای نمونهٔ بی‌خطر commit کن.
- **دیتابیس محلی:** `docker-compose.yml` با یک سرویس `mongo:7` روی پورت 27017 و یک volume نام‌دار. در `README.md` بنویس که با تغییر `MONGODB_URI` می‌توان از Atlas استفاده کرد.
- **`next.config.ts`:** تصاویر راه دور `https` را با `images.remotePatterns` مجاز کن (فعلاً `"**"` با یک TODO برای محدود کردن در آینده).

## ۶. لایهٔ دیتابیس و مدل‌ها

یک اتصال کش‌شدهٔ Mongoose برای کل اپلیکیشن و پنج مدل اصلی.

**اتصال (`src/lib/db.ts`)**

- تابع `async function connectDB(): Promise<typeof mongoose>` را export کن.
- promise اتصال را روی `globalThis` کش کن تا hot reload در dev اتصال تازه باز نکند.
- تنظیمات: `bufferCommands: false`، `maxPoolSize: 10`.
- هر تابع سرویس اول `await connectDB()` را صدا می‌زند.
- هر مدل به شکل `models.X ?? model<IX>("X", schema)` تعریف شود تا در hot reload خطای `OverwriteModelError` نگیریم.
- همهٔ اسکیماها `{ timestamps: true }` دارند. برای هر مدل یک interface تایپ‌اسکریپت export کن و یک تبدیل `toJSON` که `_id` را به `id` رشته‌ای تبدیل کند و `__v` و `passwordHash` را حذف کند.
- سند Mongoose هیچ‌وقت به Client Component نمی‌رسد. سرویس‌ها شیء ساده برمی‌گردانند (`.lean()` و تبدیل به نوع‌های DTO در `src/types/`).

### User (`models/User.ts`)

| فیلد | نوع | قواعد |
| --- | --- | --- |
| `name` | string | اجباری، ۲ تا ۶۰ کاراکتر |
| `email` | string | اجباری، یکتا، حروف کوچک، trim |
| `mobile` | string | اختیاری، یکتا (sparse)، قالب `09xxxxxxxxx` (برای OTP آینده) |
| `passwordHash` | string | اجباری، `select: false`، bcrypt با cost 12 |
| `role` | enum `customer` \| `admin` | پیش‌فرض `customer` |
| `addresses` | Address[] (زیرسند) | حداکثر ۵ |
| `isActive` | boolean | پیش‌فرض `true`؛ کاربر غیرفعال نمی‌تواند وارد شود |

زیرسند Address: `title`، `recipientName`، `mobile`، `province`، `city`، `postalCode` (۱۰ رقم)، `addressLine`، `isDefault`.

### Category (`models/Category.ts`)

| فیلد | نوع | قواعد |
| --- | --- | --- |
| `name` | string | اجباری، یکتا |
| `slug` | string | اجباری، یکتا، ایندکس‌دار |
| `parent` | ObjectId → Category | اختیاری؛ یک سطح تودرتو کافی است |
| `description` | string | اختیاری |
| `image` | string (URL) | اختیاری |
| `order` | number | پیش‌فرض ۰، برای ترتیب منو |
| `isActive` | boolean | پیش‌فرض `true` |

دسته‌بندی‌ای که محصول یا زیردسته دارد حذف نمی‌شود؛ سرویس به‌جای حذف، پیام خطا برمی‌گرداند.

### Product (`models/Product.ts`)

| فیلد | نوع | قواعد |
| --- | --- | --- |
| `title` | string | اجباری، ۳ تا ۱۵۰ کاراکتر |
| `slug` | string | اجباری، یکتا، ایندکس‌دار |
| `description` | string | اجباری؛ فعلاً متن ساده با شکست خط |
| `price` | number (صحیح، تومان) | اجباری، ≥ ۰ |
| `compareAtPrice` | number (صحیح، تومان) | اختیاری، باید بیشتر از `price` باشد؛ خط‌خورده نمایش داده می‌شود |
| `stock` | number (صحیح) | اجباری، ≥ ۰ |
| `sku` | string | اختیاری، یکتا (sparse) |
| `images` | string[] (URL) | حداقل ۱، حداکثر ۸؛ اولی تصویر اصلی است |
| `category` | ObjectId → Category | اجباری، ایندکس‌دار |
| `attributes` | `{ key: string, value: string }[]` | اختیاری، جدول مشخصات (مثلاً رنگ: مشکی) |
| `isActive` | boolean | پیش‌فرض `true`؛ محصول غیرفعال در فروشگاه دیده نمی‌شود |
| `isFeatured` | boolean | پیش‌فرض `false`؛ در صفحهٔ اصلی نمایش داده می‌شود |
| `soldCount` | number | پیش‌فرض ۰؛ با پرداخت سفارش افزایش می‌یابد |

ایندکس‌ها: text index روی `title` و `description` (برای جستجو)؛ ترکیبی `{ category: 1, isActive: 1, createdAt: -1 }`؛ `{ isFeatured: 1, isActive: 1 }`.

### Cart (`models/Cart.ts`)

| فیلد | نوع | قواعد |
| --- | --- | --- |
| `user` | ObjectId → User | اختیاری، یکتا (sparse) |
| `guestId` | string (UUID) | اختیاری، یکتا (sparse)؛ از کوکی `cart_id` |
| `items` | `{ product: ObjectId, quantity: number }[]` | تعداد ۱ تا ۱۰ و حداکثر برابر موجودی |

- دقیقاً یکی از `user` یا `guestId` مقدار دارد.
- یک TTL index بساز که سبدهای مهمان را ۳۰ روز بعد از `updatedAt` حذف کند (با `partialFilterExpression: { guestId: { $exists: true } }` تا سبد کاربران حذف نشود).
- قیمت در سبد ذخیره نمی‌شود؛ هر بار از محصول خوانده می‌شود.

### Order (`models/Order.ts`)

| فیلد | نوع | قواعد |
| --- | --- | --- |
| `orderNumber` | string | یکتا، خوانا، مثل `LX-100001` |
| `user` | ObjectId → User | اجباری، ایندکس‌دار |
| `items` | `{ product, title, slug, image, price, quantity }[]` | عکس‌برداری در لحظهٔ سفارش؛ قیمت بعداً دوباره خوانده نمی‌شود |
| `subtotal` | number | جمع `price × quantity` |
| `shippingFee` | number | طبق قواعد بخش ۵ |
| `total` | number | `subtotal + shippingFee` |
| `shippingAddress` | Address (کپی، نه ارجاع) | اجباری |
| `status` | enum | `pending`، `processing`، `shipped`، `delivered`، `cancelled`؛ پیش‌فرض `pending` |
| `payment` | object | `{ status: unpaid \| paid \| failed \| refunded, provider, authority, refId, paidAt }` |
| `note` | string | یادداشت اختیاری مشتری، حداکثر ۵۰۰ کاراکتر |
| `statusHistory` | `{ status, changedAt, changedBy }[]` | با هر تغییر وضعیت اضافه می‌شود |

ایندکس‌ها: `{ user: 1, createdAt: -1 }`، `{ status: 1, createdAt: -1 }`، `{ "payment.authority": 1 }`.

### Counter (`models/Counter.ts`)

`{ _id: string, seq: number }` برای ساخت شمارهٔ سفارش ترتیبی (بخش ۱۰).

## ۷. احراز هویت و سطح دسترسی

Auth.js v5 با Credentials provider و سشن JWT. نقش کاربر در توکن ذخیره می‌شود و برای هر صفحه و action محافظت‌شده روی سرور بررسی می‌شود.

**تنظیم (`src/lib/auth.ts`)**

- `{ handlers, auth, signIn, signOut }` را از `NextAuth({...})` export کن. مسیر `app/api/auth/[...nextauth]/route.ts` فقط `handlers.GET` و `handlers.POST` را export می‌کند.
- `session: { strategy: "jwt", maxAge: 30 روز }`. صفحهٔ سفارشی: `signIn: "/login"`.
- `authorize()` ورودی را با `loginSchema` بررسی می‌کند، کاربر را با `+passwordHash` می‌خواند، با bcrypt مقایسه می‌کند، کاربر غیرفعال را رد می‌کند و `{ id, name, email, role }` برمی‌گرداند.
- callbackهای `jwt` و `session` مقدار `id` و `role` را در توکن و `session.user` قرار می‌دهند. نوع‌ها را در `src/types/next-auth.d.ts` گسترش بده.
- برای ایمیل اشتباه و رمز اشتباه یک پیام یکسان برگردان: «ایمیل یا رمز عبور اشتباه است».

**جداسازی برای Edge:** تنظیمات بدون provider (pages، callbacks، session) در `src/lib/auth.config.ts` باشد و `proxy.ts`/`middleware.ts` فقط همین فایل را import کند. Credentials provider، bcrypt و Mongoose در `src/lib/auth.ts` می‌مانند تا کد دیتابیس وارد interceptor نشود.

**توابع کمکی (در `src/lib/auth.ts`)**

- `getCurrentUser()`: کاربر سشن یا `null`.
- `requireUser()`: اگر سشن نباشد به `/login?callbackUrl=<مسیر فعلی>` هدایت می‌کند.
- `requireAdmin()`: اول `requireUser()` را صدا می‌زند و اگر نقش `admin` نبود `notFound()` (وجود پنل ادمین لو نرود).

**محل بررسی‌ها**

| لایه | بررسی |
| --- | --- |
| `proxy.ts` / `middleware.ts` | فقط هدایت سریع: بدون سشن روی `/account/*`، `/checkout` یا `/admin/*` → `/login`؛ کاربر واردشده روی `/login` یا `/register` → `/`. اینجا به دیتابیس query نزن |
| `app/admin/layout.tsx` | `await requireAdmin()` |
| `app/(shop)/account/*` و `checkout` | `await requireUser()` |
| هر Server Action و API ادمین | `await requireAdmin()` در خط اول |
| actionهای مشتری روی سفارش و آدرس | خواندن رکورد با فیلتر `user: session.user.id` |

**ثبت‌نام**

- فیلدها: نام، ایمیل، رمز عبور، تکرار رمز. رمز حداقل ۸ کاراکتر، دست‌کم یک حرف و یک رقم.
- کاربر جدید همیشه نقش `customer` می‌گیرد.
- بعد از ثبت‌نام، کاربر وارد می‌شود و سبد مهمانش ادغام می‌شود (بخش ۱۰).

**محدودیت تلاش:** در `src/lib/rate-limit.ts` یک محدودکنندهٔ ساده در حافظه برای ورود و ثبت‌نام بساز (۵ تلاش برای هر IP در ۱۵ دقیقه)، با یک TODO که قبل از اجرای بیش از یک نمونهٔ سرور باید به یک store مشترک منتقل شود.

## ۸. اعتبارسنجی، سرویس‌ها، Server Actionها و API

تغییرات از UI از طریق Server Action انجام می‌شود. Route Handler فقط برای چیزهایی است که URL لازم دارند (auth، health، بازگشت از درگاه، فهرست عمومی محصولات).

**اعتبارسنجی (`src/validations/`)**

- فایل‌ها: `auth.ts`، `product.ts`، `category.ts`، `address.ts`، `cart.ts`، `order.ts`، `common.ts` (ObjectId رشته‌ای، صفحه‌بندی، موبایل ایران، کد پستی).
- پیام‌های خطا فارسی باشند (مثلاً «این فیلد الزامی است»).
- ارقام فارسی و عربی در ورودی‌های عددی قبل از بررسی به انگلیسی تبدیل شوند (تابع `normalizeDigits` در `lib/format.ts`).
- نوع‌های استنتاجی export شوند: `export type ProductInput = z.infer<typeof productSchema>`.

**نوع نتیجه (`src/lib/errors.ts`)**

```ts
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export class AppError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "VALIDATION" | "OUT_OF_STOCK",
  ) {
    super(message);
  }
}
```

سرویس‌ها `AppError` با پیام فارسی throw می‌کنند. actionها آن را می‌گیرند و `{ ok: false, error }` برمی‌گردانند. خطاهای ناشناخته با `console.error` لاگ می‌شوند و پیام عمومی «خطایی رخ داد، دوباره تلاش کنید» برمی‌گردد.

**سرویس‌ها (`src/services/`)**

| فایل | توابع |
| --- | --- |
| `product.service.ts` | `listProducts({ page, limit, category, q, minPrice, maxPrice, sort, inStock })`، `getProductBySlug`، `getFeaturedProducts`، `getRelatedProducts`، `createProduct`، `updateProduct`، `deleteProduct`، `listProductsAdmin` |
| `category.service.ts` | `listCategories`، `getCategoryTree`، `getCategoryBySlug`، `createCategory`، `updateCategory`، `deleteCategory` |
| `user.service.ts` | `registerUser`، `getUserById`، `updateProfile`، `changePassword`، `addAddress`، `updateAddress`، `deleteAddress`، `setDefaultAddress`، `listUsersAdmin`، `setUserActive` |
| `cart.service.ts` | `getCart`، `addToCart`، `updateCartItem`، `removeFromCart`، `clearCart`، `mergeGuestCart` |
| `order.service.ts` | `createOrderFromCart`، `getOrderForUser`، `listOrdersForUser`، `listOrdersAdmin`، `getOrderAdmin`، `updateOrderStatus`، `cancelOrder`، `markOrderPaid`، `markPaymentFailed`، `expireStaleOrders`، `calculateShipping` |
| `dashboard.service.ts` | `getDashboardStats` (سفارش‌های امروز، درآمد این ماه، سفارش‌های در انتظار، محصولات با موجودی کمتر از ۵) |
| `payment/` | بخش ۱۰ |

- صفحه‌بندی پیش‌فرض `page=1`، `limit=12`، حداکثر `limit=48`.
- مرتب‌سازی: `newest`، `price_asc`، `price_desc`، `bestselling`.
- slug از عنوان با `lib/slug.ts` ساخته می‌شود (حروف فارسی حفظ، فاصله به `-`، بقیهٔ نمادها حذف) و با افزودن `-2`، `-3` و ... یکتا می‌شود.

**Server Actionها (`src/actions/`)**

- فایل‌ها: `auth.actions.ts`، `cart.actions.ts`، `checkout.actions.ts`، `account.actions.ts`، `admin/product.actions.ts`، `admin/category.actions.ts`، `admin/order.actions.ts`، `admin/user.actions.ts`.
- هر فایل با `"use server"` شروع می‌شود. هر action: بررسی دسترسی ← بررسی ورودی با Zod ← صدا زدن سرویس ← `revalidatePath`/`revalidateTag` برای صفحات متأثر ← برگرداندن `ActionResult`.
- فرم‌ها از `useActionState` استفاده می‌کنند؛ `fieldErrors` زیر فیلدها و `error` به‌صورت toast نمایش داده می‌شود.

**Route Handlerها (`src/app/api/`)**

| مسیر | متد | کاربرد |
| --- | --- | --- |
| `/api/auth/[...nextauth]` | GET، POST | Auth.js |
| `/api/health` | GET | `{ status: "ok", db: "up" \| "down" }`؛ MongoDB را ping می‌کند |
| `/api/products` | GET | فهرست عمومی صفحه‌بندی‌شدهٔ محصولات با همان فیلترهای فروشگاه؛ query با Zod بررسی می‌شود |
| `/api/payment/callback` | GET | آدرس بازگشت از درگاه (بخش ۱۰) |

همهٔ handlerها در موفقیت `{ data }` و در خطا `{ error }` با کد HTTP درست (400، 401، 403، 404، 409، 500) برمی‌گردانند.

## ۹. صفحات و رابط کاربری

رابط کاربری راست‌به‌چپ، فارسی، اول‌موبایل و سمت سرور رندر می‌شود. Client Component فقط برای بخش‌های تعاملی (دکمه‌های سبد، فرم‌ها، فیلترها، گالری تصویر).

**چیدمان و ظاهر کلی**

- وزیرمتن تنها فونت، از طریق یک متغیر CSS.
- توکن‌های رنگ در `globals.css` با `@theme` در Tailwind v4: `primary` (یک رنگ برند، مثلاً فیروزه‌ای)، `surface`، `muted`، `border`، `danger`، `success`. حالت تاریک با `prefers-color-scheme`.
- آیکون‌های جهت‌دار (فلش، chevron) در RTL قرینه می‌شوند.
- ستون‌های محصول: ۱ ستون زیر ۶۴۰ پیکسل، ۲ در `sm`، ۳ در `md`، ۴ در `lg`. حاشیهٔ کناری ۱۶ پیکسل در موبایل.
- هر صفحه `metadata` یا `generateMetadata` با عنوان فارسی به شکل `<صفحه> | <نام فروشگاه>` دارد.

**فرمت‌کردن (`src/lib/format.ts`)**

- `formatPrice(1250000)` ← «۱٬۲۵۰٬۰۰۰ تومان» با `Intl.NumberFormat("fa-IR")`.
- `formatDate(date)` ← تاریخ شمسی با `Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium" })`.
- `toPersianDigits` و `normalizeDigits` (فارسی/عربی ← انگلیسی).

**صفحات فروشگاه**

| مسیر | محتوا | نوع رندر |
| --- | --- | --- |
| `/` | بنر اصلی، میان‌بر دسته‌بندی‌ها، محصولات ویژه، جدیدترین محصولات | استاتیک با `revalidate = 300` |
| `/products` | شبکهٔ محصولات با فیلتر (دسته، بازهٔ قیمت، موجود) و مرتب‌سازی؛ فیلترها در `searchParams`؛ صفحه‌بندی | پویا |
| `/products/[slug]` | گالری تصویر، عنوان، قیمت (با `compareAtPrice` خط‌خورده و درصد تخفیف)، وضعیت موجودی، انتخاب تعداد، افزودن به سبد، توضیحات، جدول مشخصات، محصولات مرتبط | ISR با `revalidate = 300` و revalidate هنگام ویرایش محصول؛ `notFound()` برای محصول ناموجود یا غیرفعال |
| `/categories/[slug]` | نام دسته و شبکهٔ محصولاتش (همان فیلترهای `/products`) | پویا |
| `/search?q=` | نتایج جستجوی متنی | پویا |
| `/cart` | اقلام، تغییر تعداد، حذف، جمع جزء، هزینهٔ ارسال، جمع کل، دکمهٔ «ادامه فرآیند خرید» | پویا |
| `/checkout` | انتخاب یا افزودن آدرس، یادداشت اختیاری، خلاصهٔ سفارش، دکمهٔ «پرداخت» | پویا، نیاز به ورود |
| `/checkout/result` | پیام موفقیت (با شمارهٔ سفارش) یا شکست پرداخت | پویا |

- **هدر:** لوگو، منوی دسته‌بندی، جستجو، آیکون سبد با تعداد اقلام، لینک ورود یا منوی حساب. در موبایل منو در یک کشوی کناری باز می‌شود.
- **فوتر:** متن درباره، اطلاعات تماس، لینک‌ها.
- **صفحات ورود:** `/login` و `/register` با کارت وسط صفحه، پشتیبانی از `callbackUrl` و لینک به یکدیگر.

**صفحات حساب کاربری (نیاز به ورود)**

- `/account`: ویرایش نام و موبایل، تغییر رمز.
- `/account/addresses`: فهرست، افزودن، ویرایش، حذف، انتخاب پیش‌فرض (حداکثر ۵).
- `/account/orders`: فهرست با شمارهٔ سفارش، تاریخ، مبلغ و نشان وضعیت. `/account/orders/[id]`: جزئیات کامل، آدرس، تاریخچهٔ وضعیت و دکمهٔ «لغو سفارش» تا وقتی وضعیت `pending` است.

**پنل ادمین (`/admin`، فقط ادمین)**

| مسیر | محتوا |
| --- | --- |
| `/admin` | کارت‌های آمار از `getDashboardStats`، ۱۰ سفارش آخر، فهرست موجودی کم |
| `/admin/products` | جدول: تصویر، عنوان، دسته، قیمت، موجودی، کلید فعال/غیرفعال؛ جستجو با عنوان؛ صفحه‌بندی؛ دکمهٔ «محصول جدید» |
| `/admin/products/new` و `/admin/products/[id]/edit` | `ProductForm`: همهٔ فیلدهای Product، فهرست URL تصاویر با افزودن/حذف/جابه‌جایی، ردیف‌های کلید–مقدار مشخصات |
| `/admin/categories` (+ `new` و `[id]/edit`) | جدول و فرم؛ انتخاب دستهٔ والد |
| `/admin/orders` | جدول با فیلتر وضعیت؛ ستون‌ها: شماره، مشتری، تاریخ، مبلغ، پرداخت، وضعیت |
| `/admin/orders/[id]` | جزئیات سفارش و انتخاب وضعیت که `updateOrderStatus` را صدا می‌زند |
| `/admin/users` | جدول کاربران با نقش و کلید فعال/غیرفعال (ادمین نمی‌تواند خودش را غیرفعال کند) |

دکمه‌های حذف همیشه پنجرهٔ تأیید باز می‌کنند. صفحات ادمین `dynamic = "force-dynamic"` هستند.

## ۱۰. سبد خرید، تسویه، سفارش و پرداخت

موجودی هنگام ثبت سفارش رزرو می‌شود و اگر سفارش لغو شود، پرداخت ناموفق باشد یا ۳۰ دقیقه پرداخت‌نشده بماند، آزاد می‌شود.

**سبد خرید**

- **مهمان:** در اولین افزودن به سبد یک UUID ساخته و در کوکی `cart_id` (`httpOnly`، `sameSite=lax`، ۳۰ روز) ذخیره می‌شود و سبد با `guestId` ذخیره می‌شود.
- **کاربر واردشده:** سبد با `user` شناخته می‌شود.
- `mergeGuestCart(userId, guestId)` بعد از ورود و ثبت‌نام اجرا می‌شود: تعدادهای سبد مهمان به سبد کاربر اضافه می‌شود (محدود به موجودی و ۱۰)، سبد مهمان حذف و کوکی پاک می‌شود.
- `getCart` اقلام را با دادهٔ فعلی محصول برمی‌گرداند و اقلامی که محصولشان حذف یا غیرفعال شده را کنار می‌گذارد. اگر موجودی کمتر از تعداد شده باشد، تعداد را کم می‌کند و فهرست `warnings` فارسی برمی‌گرداند.
- تعداد اقلام هدر از یک تابع سمت سرور می‌آید و بعد از actionهای سبد با `revalidatePath("/", "layout")` به‌روز می‌شود.

**هزینهٔ ارسال:** `subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_FEE`. فقط در `calculateShipping` در `order.service.ts` محاسبه شود و صفحهٔ سبد هم از همان استفاده کند.

**ثبت سفارش (`createOrderFromCart(userId, { addressId, note })`)**

1. `expireStaleOrders()` را صدا بزن.
2. سبد را بخوان؛ سبد خالی رد می‌شود.
3. موجودی هر قلم را به‌صورت اتمیک کم کن: `Product.updateOne({ _id, isActive: true, stock: { $gte: qty } }, { $inc: { stock: -qty } })`. اگر یکی از به‌روزرسانی‌ها به ۰ سند خورد، موجودی‌هایی که قبلاً کم شده را برگردان و `AppError` با کد `OUT_OF_STOCK` و نام محصول در پیام throw کن.
4. سفارش را با عکس اقلام، قیمت از محصولات، آدرس کپی‌شده، `orderNumber`، `status: "pending"`، `payment.status: "unpaid"` و اولین رکورد `statusHistory` بساز.
5. سبد را خالی کن و سفارش را برگردان.

`orderNumber` با مجموعهٔ `counters` ساخته می‌شود (`findOneAndUpdate` با `$inc` و `upsert: true`) تا یکتا و ترتیبی باشد: `LX-100001`، `LX-100002` و ...

**قواعد تغییر وضعیت سفارش**

| از | وضعیت مجاز بعدی | چه کسی |
| --- | --- | --- |
| `pending` | `processing` (فقط بعد از `paid` شدن پرداخت)، `cancelled` | سیستم، ادمین؛ مشتری می‌تواند لغو کند |
| `processing` | `shipped`، `cancelled` | ادمین |
| `shipped` | `delivered` | ادمین |
| `delivered`، `cancelled` | هیچ | — |

- `updateOrderStatus` هر تغییر دیگری را با خطای فارسی رد می‌کند.
- رفتن به `cancelled` موجودی را برمی‌گرداند.
- هر تغییر یک رکورد به `statusHistory` اضافه می‌کند.
- `expireStaleOrders()`: سفارش‌های `pending` + `unpaid` که بیش از ۳۰ دقیقه از ساختشان گذشته را لغو می‌کند و موجودی‌شان را برمی‌گرداند. در شروع ثبت سفارش و فهرست سفارش‌های ادمین صدا زده می‌شود (در این فاز cron لازم نیست).

**لایهٔ پرداخت (`src/services/payment/`)**

```ts
export interface PaymentProvider {
  name: string;
  // Returns the URL to send the customer to and the provider's reference.
  requestPayment(input: {
    orderId: string;
    amount: number;
    description: string;
    callbackUrl: string;
    mobile?: string;
    email?: string;
  }): Promise<{ redirectUrl: string; authority: string }>;
  // Called from the callback route with the raw query params.
  verifyPayment(input: {
    authority: string;
    amount: number;
    params: Record<string, string>;
  }): Promise<{ success: boolean; refId?: string; message?: string }>;
}
```

- `index.ts` تابع `getPaymentProvider()` را export می‌کند که بر اساس `PAYMENT_PROVIDER` درگاه را انتخاب می‌کند.
- `fake.provider.ts`: `requestPayment` آدرس `/checkout/fake-gateway?authority=...` را برمی‌گرداند. این صفحه دو دکمه دارد، «پرداخت موفق» و «انصراف»، که به `/api/payment/callback?authority=...&status=OK|NOK` هدایت می‌کنند. وقتی `NODE_ENV === "production"` است، درگاه آزمایشی و صفحه‌اش غیرفعال‌اند.
- `zarinpal.provider.ts` فقط یک stub است که خطای «not implemented» می‌دهد، با کامنتی که جای پیاده‌سازی درگاه واقعی را نشان می‌دهد. مبلغ به تومان به درگاه داده می‌شود؛ اگر API درگاه ریال بخواهد، خود provider تبدیل می‌کند.

**روند تسویه‌حساب**

1. action تسویه سفارش را می‌سازد، `requestPayment` را صدا می‌زند، `payment.authority` و `payment.provider` را ذخیره می‌کند و به `redirectUrl` هدایت می‌کند.
2. `/api/payment/callback` سفارش را با `payment.authority` پیدا می‌کند. اگر قبلاً `paid` شده، بدون تأیید دوباره به صفحهٔ نتیجه هدایت می‌کند (idempotent).
3. `verifyPayment` را با مبلغ خودِ سفارش صدا می‌زند (نه از query string).
4. **موفق** ← `markOrderPaid`: `payment.status = "paid"`، `refId`، `paidAt`، وضعیت سفارش `processing`، افزایش `soldCount` هر محصول. **ناموفق** ← `markPaymentFailed`: `payment.status = "failed"`، سفارش `cancelled`، برگشت موجودی.
5. هدایت به `/checkout/result?order=<orderNumber>` که سفارش را از دیتابیس می‌خواند (فقط اگر متعلق به کاربر فعلی باشد) و موفقیت یا شکست را نشان می‌دهد.

## ۱۱. دادهٔ نمونه، اسکریپت‌ها و تست

`npm run seed` باید با یک دستور دیتابیس خالی را به فروشگاهی قابل مرور تبدیل کند. تست‌ها سرویس‌هایی را پوشش می‌دهند که پول و موجودی را تغییر می‌دهند.

**اسکریپت‌های `package.json`**

| اسکریپت | دستور |
| --- | --- |
| `dev` | `next dev --turbopack` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `eslint .` |
| `typecheck` | `tsc --noEmit` |
| `format` | `prettier --write .` |
| `test` | `vitest run` |
| `seed` | `tsx --env-file=.env.local scripts/seed.ts` |
| `db:up` | `docker compose up -d` |

**اسکریپت seed (`scripts/seed.ts`)**

- وقتی `NODE_ENV === "production"` است اجرا نمی‌شود، مگر با `--force`.
- با `--reset` اول مجموعه‌های `products`، `categories`، `carts`، `orders` و `counters` پاک می‌شوند. بدون آن، اسکریپت idempotent است: با `slug` و ایمیل upsert می‌کند.
- ادمین را از `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` می‌سازد و یک مشتری `customer@launchox.local` / `Customer123!` با یک آدرس در تهران.
- ۵ دسته‌بندی: کالای دیجیتال، پوشاک، خانه و آشپزخانه، کتاب، ورزش و سفر.
- ۲۴ محصول (۴ تا ۶ در هر دسته) با عنوان فارسی واقعی، توضیح ۲ تا ۳ جمله‌ای، قیمت بین ۱۵۰٬۰۰۰ تا ۴۵٬۰۰۰٬۰۰۰ تومان (گرد به هزار)، موجودی ۰ تا ۵۰ (دست‌کم ۲ محصول ناموجود)، ۶ محصول ویژه، چند محصول با `compareAtPrice`، ۲ تا ۴ مشخصه برای هر محصول، و تصویر از `https://picsum.photos/seed/<slug>/800/800`.
- در پایان خلاصه‌ای با تعدادها و اطلاعات ورود ادمین چاپ می‌کند.

**تست‌ها (`tests/`، Vitest)**

برای تست سرویس‌ها از `mongodb-memory-server` استفاده کن: برای هر فایل تست یک سرور در حافظه و پاک کردن مجموعه‌ها بین تست‌ها. تست‌های لازم:

- `slug.test.ts`: عنوان فارسی به slug معتبر تبدیل می‌شود؛ تکراری `-2` می‌گیرد.
- `format.test.ts`: `formatPrice` و `normalizeDigits`.
- `validations.test.ts`: اسکیماهای ورود، ثبت‌نام، محصول و آدرس ورودی درست را قبول و ورودی غلط را با پیام فارسی رد می‌کنند.
- `cart.service.test.ts`: افزودن، تغییر تعداد، محدودیت به موجودی، ادغام سبد مهمان با سبد کاربر.
- `order.service.test.ts`: ثبت سفارش موجودی را کم می‌کند؛ سفارش با تعداد بیش از موجودی رد می‌شود و موجودی دست‌نخورده می‌ماند؛ لغو موجودی را برمی‌گرداند؛ تغییر وضعیت غیرمجاز رد می‌شود؛ `expireStaleOrders` فقط سفارش‌های قدیمی پرداخت‌نشده را لغو می‌کند.
- `payment.test.ts`: callback سفارش را یک بار پرداخت‌شده می‌کند و صدا زدن دوباره چیزی را تغییر نمی‌دهد.

**README.md** شامل این موارد باشد: پیش‌نیازها، مراحل راه‌اندازی (`npm install`، کپی `.env.example` به `.env.local`، `npm run db:up`، `npm run seed`، `npm run dev`)، اطلاعات ورود seed، مرور پوشه‌ها، فهرست «Decisions» و نقطه‌های توسعه (درگاه پرداخت، ورود OTP، آپلود تصویر).

## ۱۲. مراحل پیاده‌سازی

در ۱۲ مرحله و به همین ترتیب بساز. هر مرحله وقتی تمام است که شرط ستون آخر برقرار باشد و lint، typecheck، test و build بدون خطا باشند.

| # | مرحله | شرط «انجام شد» |
| --- | --- | --- |
| ۱ | ساخت پروژه با `create-next-app` (TypeScript، Tailwind، ESLint، App Router، `src/`، Turbopack، alias `@/*`). چون `AGENTS.md` در ریشه هست و `create-next-app` پوشهٔ غیرخالی را قبول نمی‌کند، پروژه را در پوشهٔ موقت `.scaffold-tmp` بساز، محتوایش را به ریشه منتقل کن و پوشهٔ موقت را حذف کن. سپس Prettier، اسکریپت‌ها، `.env.example`، `docker-compose.yml` و اسکلت `README.md` | `npm run dev` صفحهٔ پیش‌فرض را نشان می‌دهد؛ `npm run db:up` MongoDB را بالا می‌آورد؛ `AGENTS.md` و `docs/` دست‌نخورده‌اند |
| ۲ | layout ریشه: RTL، وزیرمتن، توکن‌های رنگ، `cn()`، `lib/format.ts`، `lib/slug.ts`، کامپوننت‌های پایه در `components/ui/` | یک صفحهٔ آزمایشی متن فارسی را راست‌به‌چپ با فونت درست نشان می‌دهد؛ تست‌های format و slug پاس می‌شوند |
| ۳ | `lib/env.ts`، `lib/db.ts`، `lib/errors.ts`، `/api/health` | `GET /api/health` با MongoDB روشن `db: "up"` و بدون آن `db: "down"` برمی‌گرداند |
| ۴ | همهٔ مدل‌ها + `Counter`، نوع‌های DTO، اسکیماهای Zod در `validations/` | تست‌های اعتبارسنجی پاس می‌شوند؛ مدل‌ها بدون `any` کامپایل می‌شوند |
| ۵ | اسکریپت seed | `npm run seed -- --reset` خلاصه را چاپ می‌کند؛ اجرای دوباره همان تعدادها را می‌دهد |
| ۶ | احراز هویت: `auth.config.ts`، `auth.ts`، route handler، `proxy.ts`/`middleware.ts`، صفحات ورود و ثبت‌نام، محدودکنندهٔ تلاش | ادمین و مشتری seed وارد و خارج می‌شوند؛ `/account` مهمان را به `/login` می‌برد؛ مشتری روی `/admin` صفحهٔ 404 می‌بیند |
| ۷ | سرویس محصول و دسته‌بندی، layout فروشگاه (هدر، فوتر، کشوی موبایل)، `/`، `/products`، `/products/[slug]`، `/categories/[slug]`، `/search`، `/api/products` | فیلتر، مرتب‌سازی و صفحه‌بندی از طریق URL کار می‌کنند؛ محصول غیرفعال 404 می‌دهد |
| ۸ | سرویس و actionهای سبد، کوکی مهمان، ادغام بعد از ورود، `/cart`، تعداد در هدر | مهمان ۲ محصول اضافه می‌کند، وارد می‌شود و هنوز آن‌ها را در سبد می‌بیند؛ تعداد به موجودی محدود است؛ تست‌های سبد پاس می‌شوند |
| ۹ | سرویس سفارش، interface پرداخت، درگاه و صفحهٔ آزمایشی، `/checkout`، مسیر callback، `/checkout/result` | خرید کامل با درگاه آزمایشی سفارش را `paid` و `processing` می‌کند؛ انصراف سفارش را لغو و موجودی را برمی‌گرداند؛ تست‌های سفارش و پرداخت پاس می‌شوند |
| ۱۰ | صفحات حساب: پروفایل، رمز، آدرس‌ها، فهرست و جزئیات سفارش، لغو توسط مشتری | مشتری با تغییر id در URL نمی‌تواند سفارش مشتری دیگر را ببیند (404) |
| ۱۱ | پنل ادمین: داشبورد، محصولات، دسته‌بندی‌ها، سفارش‌ها، کاربران | ادمین محصولی می‌سازد و آن را در فروشگاه می‌بیند؛ حذف دسته‌ای که محصول دارد خطا می‌دهد؛ تغییر وضعیت غیرمجاز رد می‌شود |
| ۱۲ | تکمیل: `loading.tsx`، حالت‌های خالی، `not-found.tsx`، `error.tsx`، metadata، README نهایی | همهٔ موارد بخش ۱ برقرارند |

**سؤال‌های باز برای مالک پروژه** (منتظرشان نمان؛ از پیش‌فرض‌های بخش ۲ استفاده کن)

- آیا ورود به موبایل + OTP تغییر کند و از کدام سرویس پیامک استفاده شود؟
- کدام درگاه پرداخت اول فعال شود (مثلاً زرین‌پال)؟
- تصاویر محصولات کجا آپلود شوند (مثلاً یک سرویس سازگار با S3 مثل ابر آروان)؟
