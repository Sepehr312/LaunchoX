import type {
  AboutSection,
  SectionTemplate,
} from "@/validations/about-sections";
import type { ManagedPage } from "@/validations/content";

export const aboutSectionPresets: Record<SectionTemplate, AboutSection> = {
  introduction: {
    id: "about-introduction",
    template: "introduction",
    isActive: true,
    eyebrow: "درباره لانچ‌اوکس",
    title: "سرمایی مطمئن،",
    titleAccent: "انتخابی هوشمندانه",
    description:
      "یخچال، بخشی از زندگی هر روز ماست. در لانچ‌اوکس کمک می‌کنیم با شناخت نیاز خانه و دیدن جزئیات، انتخابی آگاهانه و متناسب با زندگی‌تان داشته باشید.",
    imageUrl: "/images/preview/categories/french-door.png",
    imageAlt: "یخچال نقره‌ای فرنچ دور با کشوی فریزر",
    imagePosition: "end",
    captionTitle: "انتخابی برای خانه شما",
    captionDescription: "زیبایی در کنار کارایی",
    note: "نگاهی روشن به انتخاب، با توجه به جزئیات",
    button: { enabled: true, label: "مشاهده محصولات", href: "/products" },
    secondaryButton: {
      enabled: true,
      label: "با ما آشنا شوید",
      href: "#about-story",
    },
  },
  story: {
    id: "about-story",
    template: "story",
    isActive: true,
    eyebrow: "از یک نیاز ساده شروع می‌کنیم",
    title: "داستان ما",
    description:
      "پیدا کردن یخچال مناسب، میان نام مدل‌ها و فهرست بلند ویژگی‌ها، همیشه ساده نیست. نگاه لانچ‌اوکس از همین نیاز شکل می‌گیرد: ساده‌تر کردن مسیر انتخاب، بدون گم‌شدن در جزئیات.\n\nمی‌خواهیم محصولات را با اطلاعات روشن ببینید، تفاوت‌ها را بهتر بشناسید و پیش از خرید، به نیاز واقعی خانه‌تان فکر کنید؛ از فضای نصب تا ظرفیت و مصرف انرژی.\n\nبرای ما، خرید آگاهانه یعنی انتخابی که دلیلش را می‌دانید و با سبک زندگی شما هماهنگ است.",
    imageUrl: "/images/arctic-showroom-light.webp",
    imageAlt: "نمای یخچال در فضایی روشن با چشم‌انداز کوهستان یخی",
    imagePosition: "end",
  },
  values: {
    id: "about-values",
    template: "values",
    isActive: true,
    imageUrl: "",
    eyebrow: "همراه مسیر انتخاب شما",
    title: "چرا ما را انتخاب کنید؟",
    description: "چیزهایی که در یک انتخاب سنجیده برای ما اهمیت دارند.",
    items: [
      {
        id: "guidance",
        icon: "compass",
        isActive: true,
        title: "راهنمایی برای انتخاب بهتر",
        description:
          "انتخاب از نیاز شما شروع می‌شود؛ از فضای آشپزخانه تا عادت خرید و نگهداری مواد غذایی.",
      },
      {
        id: "variety",
        icon: "layers",
        isActive: true,
        title: "تنوع محصولات و برندها",
        description:
          "مدل‌ها و برندهای مختلف را ببینید و گزینه‌ای متناسب با سلیقه، فضا و بودجه‌تان پیدا کنید.",
      },
      {
        id: "information",
        icon: "check",
        isActive: true,
        title: "اطلاعات شفاف و قابل‌مقایسه",
        description:
          "مشخصات درج‌شده در صفحه هر محصول را بررسی کنید تا تفاوت مدل‌ها برایتان روشن‌تر شود.",
      },
      {
        id: "support",
        icon: "headphones",
        isActive: true,
        title: "اهمیت ارتباط و پشتیبانی مشتری",
        description:
          "پرسش‌های شما بخشی از مسیر انتخاب‌اند. راه‌های ارتباط با فروشگاه همیشه در دسترس شماست.",
      },
    ],
  },
  steps: {
    id: "about-steps",
    template: "steps",
    isActive: true,
    imageUrl: "",
    eyebrow: "تعهد ما به انتخاب بهتر",
    title: "انتخاب خوب،\nاز شناخت جزئیات شروع می‌شود.",
    description:
      "ظاهر، شروع آشنایی با یک یخچال است. ابعاد، ظرفیت، مصرف انرژی و فناوری سرمایش کمک می‌کنند ببینید کدام مدل برای خانه شما مناسب‌تر است. پیش از تصمیم، مشخصات هر محصول را با دقت بخوانید.",
    panelTitle: "پیش از انتخاب، به این‌ها توجه کنید",
    panelNote: "ملاک بررسی، مشخصات درج‌شده برای همان محصول است.",
    button: {
      enabled: true,
      label: "بررسی محصولات و مشخصات",
      href: "/products",
    },
    items: [
      {
        id: "capacity",
        icon: "ruler",
        isActive: true,
        title: "ابعاد و ظرفیت",
        description: "متناسب با فضای خانه و نیاز خانواده",
      },
      {
        id: "energy",
        icon: "leaf",
        isActive: true,
        title: "مصرف انرژی",
        description: "توجه به برچسب انرژی و مصرف روزمره",
      },
      {
        id: "technology",
        icon: "volume",
        isActive: true,
        title: "صدا و فناوری سرمایش",
        description: "بررسی ویژگی‌های درج‌شده برای هر مدل",
      },
    ],
  },
  faq: {
    id: "about-faq",
    template: "faq",
    isActive: true,
    imageUrl: "",
    openFirst: true,
    eyebrow: "پاسخ پرسش‌های شما",
    title: "پرسش‌های متداول",
    description: "برای انتخابی آگاهانه‌تر، پاسخ پرسش‌های رایج را بخوانید.",
    items: [
      {
        id: "choosing",
        title: "چگونه یخچال مناسب خانه‌مان را انتخاب کنیم؟",
        description:
          "ابتدا فضای آشپزخانه و نیاز خانواده را در نظر بگیرید؛ سپس ظرفیت، مصرف انرژی و مشخصات مدل‌ها را مقایسه کنید.",
        icon: "info",
        isActive: true,
      },
    ],
  },
  contact: {
    id: "about-contact",
    template: "contact",
    isActive: true,
    imageUrl: "",
    eyebrow: "قدم بعدی، انتخاب شماست",
    title: "برای انتخاب یخچال مناسب آماده‌اید؟",
    description:
      "مدل‌ها را ببینید، جزئیات را بررسی کنید و اگر پرسشی دارید، با ما در ارتباط باشید.",
    button: { enabled: true, label: "مشاهده محصولات", href: "/products" },
    secondaryButton: {
      enabled: true,
      label: "تماس با ما",
      href: "#footer-contact-title",
    },
    contact: {
      useStore: true,
      phone: "",
      email: "",
      address: "",
      showPhone: true,
      showEmail: true,
      showAddress: true,
    },
  },
};

export const defaultAboutPage: ManagedPage = {
  title: "درباره ما",
  content: "با نگاه لانچ‌اوکس به انتخاب آگاهانه آشنا شوید.",
  isActive: true,
  layout: "sections",
  questions: [],
  sections: ["introduction", "story", "values", "steps", "contact"].map(
    (type) => aboutSectionPresets[type as SectionTemplate],
  ),
};
