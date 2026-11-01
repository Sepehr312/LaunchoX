import { NextResponse } from "next/server";
import connectDB from "@/lib/db"; // آدرس فایل اتصال به دیتابیس شما (مطمئن شوید مسیرش درست است)
import PageContent from "@/models/page-content";
import { getServerSession } from "next-auth"; // برای بررسی لاگین ادمین (بسته به پروژه شما)
// اگر سیستم احراز هویت شما فرق دارد، این خط را بعدا با توجه به پروژه خودتان تنظیم می‌کنیم

// ۱. متد GET: برای خواندن محتوای صفحه
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    await connectDB();
    
    // پیدا کردن صفحه بر اساس آدرس (مثلا about-us)
    const page = await PageContent.findOne({ slug: params.slug });

    if (!page) {
      return NextResponse.json(
        { error: "صفحه مورد نظر یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error("Error fetching page:", error);
    return NextResponse.json(
      { error: "خطا در دریافت اطلاعات از سرور" },
      { status: 500 }
    );
  }
}

// ۲. متد PUT: برای ویرایش و ذخیره محتوای صفحه (از طریق پنل مدیریت)
export async function PUT(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    // --- بخش امنیت (اختیاری): بررسی اینکه آیا کاربر ادمین لاگین کرده است یا خیر ---
    // در اینجا باید چک کنید که آیا این درخواست از سمت ادمین می‌آید یا خیر. 
    // فعلا برای سادگی کار، آن را کامنت می‌کنیم تا اول تست کنید، بعدا امنیت را اضافه می‌کنیم.

    await connectDB();
    
    const body = await request.json();
    const { title, content, sections } = body;

    // آپدیت کردن صفحه در دیتابیس (اگر نبود، بسازد)
    const updatedPage = await PageContent.findOneAndUpdate(
      { slug: params.slug },
      { 
        $set: { 
          title, 
          content, 
          sections: sections || [] 
        } 
      },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json(
      { message: "صفحه با موفقیت آپدیت شد", page: updatedPage },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error updating page:", error);
    return NextResponse.json(
      { error: "خطا در ذخیره اطلاعات" },
      { status: 500 }
    );
  }
}
