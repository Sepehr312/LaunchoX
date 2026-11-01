import mongoose, { Schema, Document, Model } from "mongoose";

// تعریف ساختار تایپ‌اسکریپت برای محتوای صفحه
export interface IPageContent extends Document {
  slug: string; // شناسه صفحه (مثلا: "about-us" برای درباره ما و "services" برای خدمات)
  title: string; // عنوان صفحه
  content: string; // متن اصلی صفحه
  sections: Array<{
    title: string;
    description: string;
    imageUrl?: string;
  }>; // برای بخش‌های مختلف صفحه مثل کارت‌ها
  isActive: boolean; // فعال یا غیرفعال بودن صفحه
  createdAt: Date;
  updatedAt: Date;
}

// تعریف اسکیمای مونگو دی‌بی
const pageContentSchema = new Schema<IPageContent>(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    sections: [
      {
        title: { type: String, required: true },
        description: { type: String, required: true },
        imageUrl: { type: String },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true } // این گزینه خودکار زمان ساخت و آپدیت را ثبت می‌کند
);

// جلوگیری از خطای ساخت مجدد مدل هنگام رفرش شدن (مخصوص Next.js)
const PageContent: Model<IPageContent> =
  mongoose.models.PageContent || mongoose.model<IPageContent>("PageContent", pageContentSchema);

export default PageContent;
