import type { StoreProductDTO } from "@/types/dto";

const timestamp = "2026-10-13T00:00:00.000Z";
const attributes = [
  { key: "مدل", value: "LX-S600" },
  { key: "ظرفیت", value: "600 لیتر" },
  { key: "رتبه انرژی", value: "A++" },
  { key: "سیستم سرمایش", value: "بدون برفک" },
  { key: "رنگ", value: "نقره‌ای" },
  { key: "نوع محصول", value: "ساید بای ساید" },
].map((attribute) => ({
  ...attribute,
  createdAt: timestamp,
  updatedAt: timestamp,
}));

export const mockProduct: StoreProductDTO = {
  id: "preview-side-by-side",
  title: "یخچال فریزر ساید بای ساید",
  slug: "preview-side-by-side",
  description:
    "فضایی منظم برای مواد غذایی و انتخابی هماهنگ با آشپزخانه‌های امروزی. این یخچال ساید بای ساید با ظرفیت جادار، فضای یخچال و فریزر را کنار هم در دسترس قرار می‌دهد. بدنه نقره‌ای و خطوط ساده، ظاهر آرام و مدرنی به فضای آشپزخانه می‌بخشند.",
  price: 112600000,
  compareAtPrice: 128000000,
  stock: 3,
  images: ["/images/preview/categories/side-by-side.png"],
  category: {
    id: "preview-category",
    name: "ساید بای ساید",
    slug: "side-by-side",
  },
  attributes,
  isActive: true,
  isFeatured: false,
  soldCount: 0,
  createdAt: timestamp,
  updatedAt: timestamp,
};

// These fixtures demonstrate presentation; they do not identify database products.
export const previewDetails = {
  brand: "لانچ‌اوکس",
  model: "LX-S600",
  discountPercent: 12,
  colors: [
    { id: "silver", label: "نقره‌ای", swatch: "#b9c2cb" },
    { id: "white", label: "سفید", swatch: "#ffffff" },
    { id: "graphite", label: "گرافیتی", swatch: "#475569" },
  ],
};

// Detail views reuse the same asset; no alternate model is presented as this product.
export const galleryViews = [
  { label: "نمای کامل", scale: 1, position: "50% 50%" },
  { label: "جزئیات آب‌سردکن", scale: 2.2, position: "75% 38%" },
  { label: "جزئیات بدنه و دستگیره", scale: 1.7, position: "40% 30%" },
];

export const specifications = [
  {
    title: "مشخصات کلی",
    rows: [
      ["برند", "لانچ‌اوکس"],
      ["مدل", "LX-S600"],
      ["نوع", "یخچال فریزر ساید بای ساید"],
      ["رنگ‌های نمونه", "نقره‌ای، سفید، گرافیتی"],
    ],
  },
  {
    title: "گنجایش و ابعاد",
    rows: [
      ["گنجایش کل", "600 لیتر"],
      ["گنجایش یخچال", "390 لیتر"],
      ["گنجایش فریزر", "210 لیتر"],
      ["ارتفاع", "179 سانتی‌متر"],
      ["عرض", "91 سانتی‌متر"],
      ["عمق", "73 سانتی‌متر"],
    ],
  },
  {
    title: "فناوری و امکانات",
    rows: [
      ["رده مصرف انرژی", "A++"],
      ["کمپرسور", "اینورتر"],
      ["سیستم سرمایش", "بدون برفک، گردش هوای چندگانه"],
      ["آب‌سردکن", "دارد"],
      ["تعداد طبقات یخچال", "4 طبقه شیشه‌ای"],
      ["روشنایی داخلی", "ال‌ای‌دی"],
      ["میزان صدا", "39 دسی‌بل"],
      ["گارانتی نمونه", "24 ماه خدمات لانچ‌اوکس"],
    ],
  },
];

export const mockReviews = [
  {
    id: "review-1",
    name: "مریم احمدی",
    title: "جادار و مناسب خانواده",
    rating: 5,
    date: "2026-09-29",
    buyer: true,
    text: "تقسیم‌بندی فضای داخلی خیلی کاربردی است. بطری‌ها و ظرف‌های بزرگ به‌راحتی جا می‌شوند و دسترسی به مواد غذایی ساده است.",
    helpful: 12,
  },
  {
    id: "review-2",
    name: "علی رضایی",
    title: "طراحی ساده و عملکرد آرام",
    rating: 4,
    date: "2026-10-05",
    buyer: true,
    text: "ظاهر نقره‌ای با آشپزخانه هماهنگ است. صدای کارکرد کم است؛ فقط قبل از انتخاب، عرض محل نصب را دقیق اندازه بگیرید.",
    helpful: 8,
  },
  {
    id: "review-3",
    name: "نگار کریمی",
    title: "فضای فریزر می‌توانست بیشتر باشد",
    rating: 3,
    date: "2026-10-10",
    buyer: false,
    text: "برای استفاده روزمره مناسب است، اما اگر مواد غذایی زیادی منجمد می‌کنید بهتر است ظرفیت فریزر را با نیازتان مقایسه کنید.",
    helpful: 3,
  },
];

export const mockQuestions = [
  {
    question: "برای نصب، چقدر فضای خالی اطراف یخچال لازم است؟",
    answer:
      "در این نمونه، حداقل 5 سانتی‌متر فاصله در اطراف در نظر گرفته شده است. در خرید واقعی، راهنمای نصب همان مدل ملاک است.",
  },
  {
    question: "آیا انتخاب رنگ، تصویر محصول را تغییر می‌دهد؟",
    answer:
      "رنگ‌ها صرفاً برای بررسی تعامل این پیش‌نمایش هستند. دارایی موجود فقط نمای نقره‌ای را نشان می‌دهد و تصویر با تغییر رنگ عوض نمی‌شود.",
  },
];

// Static catalog seed snapshot from scripts/seed-data.ts and seed-runner.ts.
// Preview IDs keep these fixtures separate from database-backed cart operations.
export const relatedProducts: StoreProductDTO[] = [
  {
    slug: "digital-3",
    title: "یخچال سایدبای‌ساید فروستیا Pro",
    image: "side-by-side",
    price: 39900000,
    stock: 12,
  },
  {
    slug: "clothing-1",
    title: "یخچال چهاردر آیس‌لند F880",
    image: "french-door",
    price: 43900000,
    stock: 15,
  },
  {
    slug: "home-kitchen-1",
    title: "یخچال فریزر پایین وینتر B540",
    image: "bottom-freezer",
    price: 28500000,
    stock: 20,
  },
  {
    slug: "digital-4",
    title: "یخچال سایدبای‌ساید وینتر C720",
    image: "side-by-side",
    price: 37200000,
    stock: 13,
  },
  {
    slug: "digital-5",
    title: "یخچال سایدبای‌ساید پولار S680",
    image: "side-by-side",
    price: 35400000,
    compareAtPrice: 36900000,
    stock: 14,
  },
  {
    slug: "clothing-4",
    title: "یخچال فرنچ‌دور آرکتیک F650",
    image: "french-door",
    price: 36800000,
    compareAtPrice: 38300000,
    stock: 18,
  },
  {
    slug: "home-kitchen-3",
    title: "یخچال فریزر بالا کریستال T480",
    image: "top-freezer",
    price: 23800000,
    compareAtPrice: 25300000,
    stock: 22,
  },
  {
    slug: "clothing-3",
    title: "یخچال چهاردر کریستال Q700",
    image: "french-door",
    price: 39700000,
    stock: 17,
  },
  {
    slug: "home-kitchen-2",
    title: "یخچال فریزر پایین پولار B500",
    image: "bottom-freezer",
    price: 26200000,
    stock: 21,
  },
].map((item) => ({
  ...mockProduct,
  id: `preview-related-${item.slug}`,
  slug: `preview-related-${item.slug}`,
  title: item.title,
  price: item.price,
  compareAtPrice: item.compareAtPrice,
  stock: item.stock,
  images: [`/images/preview/categories/${item.image}.png`],
  attributes: [],
}));
