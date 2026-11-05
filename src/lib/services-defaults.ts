import type {
  AboutSection,
  SectionTemplate,
} from "@/validations/about-sections";
import type { ManagedPage } from "@/validations/content";
import { prepareAboutPage } from "@/lib/about-page";
export const serviceItems = [
  {
    id: "buying",
    icon: "message",
    title: "مشاوره پیش از خرید",
    text: "از ابعاد آشپزخانه تا نیاز خانواده؛ انتخاب را با شناخت جزئیات شروع کنید.",
    action: "راهنمای انتخاب",
    label: "پیش از خرید",
    tips: [
      "عرض، ارتفاع و عمق محل قرارگیری را اندازه بگیرید و فضای بازشدن در و تهویه را مطابق راهنمای مدل در نظر بگیرید.",
      "ظرفیت، مصرف انرژی و امکانات مدل‌ها را در صفحه محصول و بخش مقایسه بررسی کنید.",
      "برای مشاوره، ابعاد محل نصب، بودجه و مدل‌های موردنظرتان را هنگام تماس آماده داشته باشید.",
    ],
  },
  {
    id: "delivery",
    icon: "package",
    title: "راهنمای تحویل",
    text: "با آماده‌کردن مسیر ورود و بررسی کالا، برای تحویل سفارش آماده باشید.",
    action: "نکات تحویل کالا",
    label: "هنگام تحویل",
    tips: [
      "پیش از تحویل، ابعاد درها، راه‌پله و آسانسور را با ابعاد بسته‌بندی محصول تطبیق دهید.",
      "مشخصات سفارش و وضعیت ظاهری بسته‌بندی را هنگام تحویل بررسی کنید و هر مغایرت یا آسیب را ثبت و به پشتیبانی اعلام کنید.",
      "زمان و شرایط حمل سفارش خود را از پشتیبانی پیگیری کنید؛ شرایط هر سفارش ممکن است متفاوت باشد.",
    ],
  },
  {
    id: "installation",
    icon: "wrench",
    title: "نصب و راه‌اندازی",
    text: "مسیر هماهنگی با خدمات مجاز برند و نکات آماده‌سازی محل نصب را بشناسید.",
    action: "دیدن راهنمای نصب",
    label: "پیش از راه‌اندازی",
    tips: [
      "پیش از بازکردن بسته‌بندی و روشن‌کردن دستگاه، دستورالعمل سازنده و شرایط شرکت گارانتی‌کننده را بررسی کنید.",
      "اگر فعال‌سازی ضمانت به نصب مجاز وابسته است، از طریق اطلاعات درج‌شده روی ضمانت‌نامه با خدمات مجاز همان برند هماهنگ کنید.",
      "فاصله تهویه، شرایط برق و زمان مناسب روشن‌کردن پس از جابه‌جایی را از دفترچه همان مدل یا نصاب مجاز بپرسید.",
    ],
  },
  {
    id: "warranty",
    icon: "shield",
    title: "گارانتی و پشتیبانی",
    text: "شرایط ضمانت محصول و راه مناسب پیگیری پرسش‌ها یا مشکلات را پیدا کنید.",
    action: "راهنمای پیگیری گارانتی",
    label: "پس از خرید",
    tips: [
      "نام شرکت ضمانت‌کننده، مدت و شرایط پوشش را در صفحه محصول و ضمانت‌نامه همان کالا بررسی کنید.",
      "برای پیگیری مشکل فنی، مدل دستگاه، شماره سریال، ضمانت‌نامه و شرح مشکل را برای خدمات مجاز برند آماده کنید.",
      "برای پرسش درباره سفارش یا راهنمایی مسیر پیگیری، با پشتیبانی لانچ‌اوکس تماس بگیرید. نصب و تعمیر تابع شرایط خدمات مجاز برند است.",
    ],
  },
];

export const serviceQuestions = [
  {
    title: "برای انتخاب یخچال مناسب از کجا شروع کنم؟",
    text: "ابعاد محل نصب، تعداد اعضای خانواده و بودجه را مشخص کنید. سپس مشخصات مدل‌ها را در بخش محصولات و مقایسه ببینید؛ برای پرسش‌های بیشتر می‌توانید با پشتیبانی تماس بگیرید.",
  },
  {
    title: "نصب یخچال را چه کسی انجام می‌دهد؟",
    text: "شرایط نصب به برند و شرکت ضمانت‌کننده بستگی دارد. پیش از بازکردن بسته‌بندی، ضمانت‌نامه را بخوانید و در صورت نیاز با خدمات مجاز همان برند هماهنگ کنید.",
  },
  {
    title: "اطلاعات گارانتی محصول را کجا ببینم؟",
    text: "اطلاعات درج‌شده در صفحه همان محصول و ضمانت‌نامه همراه کالا را بررسی کنید. برای ابهام در مشخصات اعلام‌شده می‌توانید از پشتیبانی فروشگاه راهنمایی بگیرید.",
  },
  {
    title: "وضعیت سفارش را چطور پیگیری کنم؟",
    text: "وارد حساب کاربری شوید و از بخش «سفارش‌های من» جزئیات و وضعیت سفارش را ببینید. برای پیگیری تلفنی، شماره سفارش را آماده داشته باشید.",
  },
  {
    title: "اگر کالا آسیب‌دیده یا با سفارش متفاوت بود چه کنم؟",
    text: "آسیب یا مغایرت را ثبت کنید و پیش از نصب یا بازگرداندن کالا با پشتیبانی تماس بگیرید تا وضعیت سفارش و مسیر رسیدگی بررسی شود.",
  },
];

const button = (label: string, href: string) => ({
  enabled: true,
  label,
  href,
});
export const servicesTemplates: {
  type: SectionTemplate;
  title: string;
  description: string;
}[] = [
  {
    type: "introduction",
    title: "معرفی خدمات",
    description: "معرفی، تصویر و دسترسی به خدمات",
  },
  {
    type: "values",
    title: "کارت‌های خدمات",
    description: "خدمات و لینک راهنمای هر خدمت",
  },
  {
    type: "story",
    title: "پیگیری سفارش",
    description: "دعوت به پیگیری سفارش و ارتباط با پشتیبانی",
  },
  {
    type: "steps",
    title: "راهنمای خدمات",
    description: "راهنمای بازشوندهٔ خرید، تحویل، نصب و ضمانت",
  },
  { type: "faq", title: "پرسش‌های پرتکرار", description: "پرسش و پاسخ خدمات" },
  {
    type: "contact",
    title: "ارتباط با پشتیبانی",
    description: "تلفن، ایمیل و اطلاعات پشتیبانی",
  },
];
const sections: AboutSection[] = [
  {
    id: "services-introduction",
    template: "introduction",
    title: "از انتخاب تا پشتیبانی،",
    titleAccent: "کنار شما هستیم.",
    eyebrow: "همراه شما، در هر قدم",
    description:
      "یک انتخاب خوب، با خیال آسوده کامل می‌شود. راهنمای خرید، تحویل و خدمات محصول را اینجا پیدا کنید و هر جا پرسشی داشتید، با ما در ارتباط باشید.",
    imageUrl: "/images/preview/categories/side-by-side.png",
    imageAlt: "یخچال ساید بای ساید لانچ‌اوکس",
    imagePosition: "end",
    note: "راهنمایی روشن، متناسب با محصول و سفارش شما",
    captionTitle: "همراهی پس از انتخاب",
    captionDescription: "راهنمای تحویل، نصب و ضمانت",
    button: button("تماس با پشتیبانی", "#support-contact"),
    secondaryButton: button("خدمات را ببینید", "#our-services"),
  },
  {
    id: "our-services",
    template: "values",
    title: "برای هر مرحله، یک راه روشن",
    eyebrow: "چطور می‌توانیم کمک کنیم؟",
    description: "",
    imageUrl: "",
    items: serviceItems.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.text,
      icon: s.icon as "message" | "package" | "wrench" | "shield",
      label: s.label,
      isActive: true,
      button: button(s.action, `#guide-${s.id}`),
    })),
  },
  {
    id: "order-support",
    template: "story",
    title: "برای سفارش قبلی کمک می‌خواهید؟",
    eyebrow: "قبلاً از ما خرید کرده‌اید؟",
    description:
      "وضعیت و جزئیات سفارش را در حساب خود ببینید یا برای راهنمایی با ما تماس بگیرید.",
    imageUrl: "",
    button: button("سفارش‌های من", "/account/orders"),
    secondaryButton: button("ارتباط با پشتیبانی", "#support-contact"),
  },
  {
    id: "services-guides",
    template: "steps",
    title: "راهنمای قدم بعدی شما",
    eyebrow: "جزئیات کوچک، آرامش بیشتر",
    description:
      "بخش مرتبط با نیازتان را باز کنید؛ نکات مهم هر مرحله را یک‌جا آورده‌ایم.",
    imageUrl: "",
    button: button("مقایسه مدل‌های یخچال", "/compare"),
    items: serviceItems.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.tips.join("\n"),
      icon: s.icon as "message" | "package" | "wrench" | "shield",
      isActive: true,
    })),
  },
  {
    id: "services-faq",
    template: "faq",
    title: "پرسش‌های پرتکرار",
    eyebrow: "شاید پرسش شما هم باشد",
    description: "",
    imageUrl: "",
    openFirst: false,
    items: serviceQuestions.map((q, i) => ({
      id: `service-question-${i}`,
      title: q.title,
      description: q.text,
      icon: "info",
      isActive: true,
    })),
  },
  {
    id: "support-contact",
    template: "contact",
    title: "هنوز پرسشی دارید؟ با ما در ارتباط باشید.",
    eyebrow: "یک گفت‌وگو تا قدم بعدی",
    description:
      "برای پیگیری سریع‌تر، شماره سفارش و مدل محصول را آماده داشته باشید.",
    imageUrl: "",
    contact: {
      useStore: true,
      phone: "",
      email: "",
      address: "",
      showPhone: true,
      showEmail: true,
      showAddress: false,
    },
  },
];
export const defaultServicesPage: ManagedPage = {
  title: "خدمات و پشتیبانی",
  content: "همراه شما برای انتخاب و خریدی آگاهانه.",
  isActive: true,
  layout: "sections",
  sections,
  questions: [],
};
export function prepareServicesPage(page: ManagedPage) {
  const prepared = prepareAboutPage(page);
  if (page.layout === "sections") return prepared;
  const usedIds = new Set(prepared.sections.map((section) => section.id));
  let introId = "legacy-services-intro";
  while (usedIds.has(introId)) introId += "-intro";
  return {
    ...prepared,
    sections: [
      {
        id: introId,
        template: "introduction" as const,
        title: page.title,
        description: page.content,
        imageUrl: "",
        isActive: true,
      },
      ...prepared.sections,
    ],
  };
}
export function createServicesSection(template: SectionTemplate): AboutSection {
  const section = structuredClone(
    sections.find((s) => s.template === template)!,
  );
  section.id = crypto.randomUUID();
  if (section.items)
    section.items = section.items.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    }));
  return section;
}
