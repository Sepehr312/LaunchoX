# LaunchoX UI Direction

## هدف

ظاهر نهایی فروشگاه باید شبیه تصاویر مرجع داخل این پوشه باشد:

- `docs/references/home-light.png`
- `docs/references/home-dark.png`

این تصاویر مرجع اصلی طراحی UI پروژه هستند.

## هویت بصری

فروشگاه تخصصی یخچال و لوازم سرمایشی با حس:

- Arctic / Ice
- Premium
- Modern
- High-tech
- Cold
- Clean
- Refrigerator showroom

ظاهر سایت نباید شبیه Bootstrap، داشبورد عمومی یا قالب آماده فروشگاهی باشد.

## Light Mode

- سفید یخی
- آبی بسیار روشن
- cyan سرد
- شیشه نیمه‌شفاف
- نقره‌ای
- سرمه‌ای برای متن
- پس‌زمینه‌های برفی و یخی

## Dark Mode

- سرمه‌ای بسیار تیره
- آبی یخی
- cyan
- شیشه دودی
- borderهای آبی سرد
- glow بسیار کنترل‌شده
- کنتراست بالا روی محصولات

## طراحی صفحات

### Hero

Hero باید بزرگ و تصویری باشد.

- تصویر یخچال بزرگ
- فضای یخی / کوهستان سرد
- عنوان بزرگ فارسی
- متن کوتاه
- CTA اصلی
- CTA ثانویه
- ادغام هدر با Hero

### Header

- RTL
- شفاف / glass
- سبک و مینیمال
- search
- account
- cart
- navigation
- در حالت dark با شیشه تیره

### Cards

کارت‌ها نباید ظاهر generic داشته باشند.

- glass surface
- border ظریف
- shadow سرد
- radius متوسط
- محصول مرکز توجه
- اطلاعات فنی داخل mini spec cards
- قیمت واضح
- discount badge
- favorite
- add-to-cart

### Feature Strip

مانند تصاویر مرجع:

- ارسال سریع
- مصرف انرژی
- عملکرد کم‌صدا
- کنترل هوشمند
- گارانتی

با آیکون‌های خطی و طراحی شیشه‌ای.

## Product Section

کارت محصول شامل:

- تصویر بزرگ یخچال
- برند
- نام محصول
- مشخصات مهم
- ظرفیت
- رتبه انرژی
- فناوری اصلی
- قیمت قبلی
- قیمت فعلی
- تخفیف
- افزودن به سبد
- علاقه‌مندی

## Design Rules

- از Bootstrap-style UI اجتناب شود.
- gradient فقط ظریف و سرد باشد.
- از cyan/blue بیش از حد استفاده نشود.
- بیشتر سطح UI سفید یخی / glass / dark navy باشد.
- عکس محصول مهم‌ترین عنصر بصری باشد.
- backdrop blur فقط در قسمت‌های مناسب استفاده شود.
- spacing زیاد و لوکس باشد.
- RTL از ابتدا در تمام کامپوننت‌ها رعایت شود.
- Light و Dark هر دو باید طراحی واقعی داشته باشند، نه صرفاً invert رنگ‌ها.
- responsive design الزامی است.

## Visual priority

1. Product
2. Hero imagery
3. Typography
4. Glass surfaces
5. Cold lighting/accent
6. Supporting UI

## Reference priority

اگر بین یک UI عمومی و تصاویر مرجع تعارض وجود داشت، تصاویر مرجع مبنای طراحی بصری هستند؛ مگر اینکه با نیازهای عملکردی SPEC تعارض داشته باشند.