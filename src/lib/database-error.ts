export function databaseActionError(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return;
  if (
    "code" in error &&
    error.code === 20 &&
    "message" in error &&
    typeof error.message === "string" &&
    /transaction numbers/i.test(error.message)
  )
    return "تنظیمات دیتابیس برای ذخیره‌سازی آماده نیست؛ MongoDB باید به‌صورت Replica Set اجرا شود. راهنمای راه‌اندازی دیتابیس را بررسی کنید.";
}
