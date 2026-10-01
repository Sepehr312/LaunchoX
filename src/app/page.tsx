import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-12 bg-white px-4 py-20 text-start sm:px-16 dark:bg-black">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="نشان نکست‌جی‌اس"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col gap-6">
          <h1 className="text-3xl leading-relaxed font-semibold">
            لانچ‌اوکس آمادهٔ شروع است
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            برای شروع، فایل <code dir="ltr">src/app/page.tsx</code> را ویرایش
            کنید. این صفحهٔ آغازین پروژه است.
          </p>
        </div>
        <div className="flex w-full flex-col gap-4 sm:flex-row">
          <a
            className="rounded-full bg-foreground px-6 py-3 text-center text-background"
            href="https://nextjs.org/learn"
          >
            آموزش نکست‌جی‌اس
          </a>
          <a
            className="rounded-full border border-zinc-300 px-6 py-3 text-center dark:border-zinc-700"
            href="https://nextjs.org/docs"
          >
            مستندات
          </a>
        </div>
      </main>
    </div>
  );
}
