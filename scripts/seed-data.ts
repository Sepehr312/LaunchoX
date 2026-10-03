interface SeedProduct {
  title: string;
  price: number;
  brand: string;
  capacity: string;
  energy: string;
  technology: string;
}

interface SeedCategory {
  name: string;
  slug: string;
  description: string;
  image: string;
  products: SeedProduct[];
}

export const seedCategories: SeedCategory[] = [
  {
    name: "یخچال سایدبای‌ساید",
    slug: "digital",
    description:
      "فضای جادار، دسترسی سریع و طراحی یکپارچه برای آشپزخانه‌های مدرن",
    image: "/images/products/side-by-side.png",
    products: [
      {
        title: "یخچال سایدبای‌ساید آتلانتیس X900",
        price: 44500000,
        brand: "آتلانتیس",
        capacity: "۶۳۵ لیتر",
        energy: "+A",
        technology: "گردش هوای چندگانه",
      },
      {
        title: "یخچال سایدبای‌ساید نوردیک S780",
        price: 41800000,
        brand: "نوردیک",
        capacity: "۶۱۰ لیتر",
        energy: "++A",
        technology: "سرمایش فلزی",
      },
      {
        title: "یخچال سایدبای‌ساید فروستیا Pro",
        price: 39900000,
        brand: "فروستیا",
        capacity: "۵۹۰ لیتر",
        energy: "+A",
        technology: "بدون برفک",
      },
      {
        title: "یخچال سایدبای‌ساید وینتر C720",
        price: 37200000,
        brand: "وینتر",
        capacity: "۵۶۰ لیتر",
        energy: "++A",
        technology: "کمپرسور اینورتر",
      },
      {
        title: "یخچال سایدبای‌ساید پولار S680",
        price: 35400000,
        brand: "پولار",
        capacity: "۵۳۰ لیتر",
        energy: "+A",
        technology: "آب‌سردکن هوشمند",
      },
    ],
  },
  {
    name: "یخچال در فرانسوی",
    slug: "clothing",
    description: "چیدمان منعطف و دسترسی راحت به مواد تازه در طراحی چهاردر",
    image: "/images/products/french-door.png",
    products: [
      {
        title: "یخچال چهاردر آیس‌لند F880",
        price: 43900000,
        brand: "آیس‌لند",
        capacity: "۶۲۰ لیتر",
        energy: "++A",
        technology: "محفظه صفر درجه",
      },
      {
        title: "یخچال فرنچ‌دور نوردیک F760",
        price: 42500000,
        brand: "نوردیک",
        capacity: "۵۸۰ لیتر",
        energy: "+A",
        technology: "درِ دسترسی سریع",
      },
      {
        title: "یخچال چهاردر کریستال Q700",
        price: 39700000,
        brand: "کریستال",
        capacity: "۵۵۰ لیتر",
        energy: "++A",
        technology: "کنترل رطوبت",
      },
      {
        title: "یخچال فرنچ‌دور آرکتیک F650",
        price: 36800000,
        brand: "آرکتیک",
        capacity: "۵۲۰ لیتر",
        energy: "+A",
        technology: "سرمایش سریع",
      },
      {
        title: "یخچال چهاردر سیلور F600",
        price: 34100000,
        brand: "سیلور",
        capacity: "۴۸۰ لیتر",
        energy: "+A",
        technology: "بدون برفک",
      },
    ],
  },
  {
    name: "یخچال فریزر بالا و پایین",
    slug: "home-kitchen",
    description: "مدل‌های کاربردی و کم‌مصرف برای استفادهٔ روزمرهٔ خانواده",
    image: "/images/products/fridge-freezer.png",
    products: [
      {
        title: "یخچال فریزر پایین وینتر B540",
        price: 28500000,
        brand: "وینتر",
        capacity: "۴۲۰ لیتر",
        energy: "++A",
        technology: "کمپرسور اینورتر",
      },
      {
        title: "یخچال فریزر پایین پولار B500",
        price: 26200000,
        brand: "پولار",
        capacity: "۳۹۰ لیتر",
        energy: "+A",
        technology: "گردش هوای چندگانه",
      },
      {
        title: "یخچال فریزر بالا کریستال T480",
        price: 23800000,
        brand: "کریستال",
        capacity: "۳۶۰ لیتر",
        energy: "++A",
        technology: "فیلتر بوگیر",
      },
      {
        title: "یخچال فریزر بالا آرکتیک T420",
        price: 21500000,
        brand: "آرکتیک",
        capacity: "۳۳۰ لیتر",
        energy: "+A",
        technology: "انجماد سریع",
      },
      {
        title: "یخچال فریزر کمبی نوردیک C460",
        price: 24900000,
        brand: "نوردیک",
        capacity: "۳۵۰ لیتر",
        energy: "++A",
        technology: "محفظه تازه‌مان",
      },
    ],
  },
  {
    name: "یخچال کم‌جا و هتلی",
    slug: "books",
    description: "سرمایش کارآمد برای دفتر کار، اتاق و فضاهای محدود",
    image: "/images/products/compact.png",
    products: [
      {
        title: "یخچال هتلی مینی‌فراست M90",
        price: 6900000,
        brand: "مینی‌فراست",
        capacity: "۹۰ لیتر",
        energy: "+A",
        technology: "عملکرد کم‌صدا",
      },
      {
        title: "یخچال کم‌جا پولار C120",
        price: 8400000,
        brand: "پولار",
        capacity: "۱۲۰ لیتر",
        energy: "++A",
        technology: "یخدان مجزا",
      },
      {
        title: "یخچال اداری نوردیک O150",
        price: 9700000,
        brand: "نوردیک",
        capacity: "۱۵۰ لیتر",
        energy: "+A",
        technology: "ترموستات دقیق",
      },
      {
        title: "یخچال مینی بار کریستال M70",
        price: 5600000,
        brand: "کریستال",
        capacity: "۷۰ لیتر",
        energy: "+A",
        technology: "درب شیشه‌ای",
      },
      {
        title: "یخچال زیرکانتری آیس‌لند U140",
        price: 11200000,
        brand: "آیس‌لند",
        capacity: "۱۴۰ لیتر",
        energy: "++A",
        technology: "سرمایش یکنواخت",
      },
    ],
  },
  {
    name: "سرمایش فروشگاهی",
    slug: "sports-travel",
    description: "تجهیزات سرمایشی مقاوم و دقیق برای فروشگاه و محیط حرفه‌ای",
    image: "/images/products/commercial.png",
    products: [
      {
        title: "یخچال ویترینی ایستاده گلس‌کول ۶۰",
        price: 29800000,
        brand: "گلس‌کول",
        capacity: "۵۰۰ لیتر",
        energy: "B",
        technology: "درب ضدبخار",
      },
      {
        title: "فریزر صندوقی فروستیا C400",
        price: 21400000,
        brand: "فروستیا",
        capacity: "۴۰۰ لیتر",
        energy: "+A",
        technology: "انجماد عمیق",
      },
      {
        title: "یخچال فروشگاهی دو در پولار V800",
        price: 43500000,
        brand: "پولار",
        capacity: "۸۰۰ لیتر",
        energy: "B",
        technology: "کنترل دیجیتال",
      },
      {
        title: "فریزر ایستاده نوردیک F600",
        price: 38900000,
        brand: "نوردیک",
        capacity: "۶۰۰ لیتر",
        energy: "+A",
        technology: "بدون برفک",
      },
    ],
  },
];
