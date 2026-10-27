"use client";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-xl font-bold">دریافت اطلاعات حساب ممکن نشد</h1>
      <p className="my-5">لطفاً دوباره تلاش کنید.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-primary px-6 py-3 text-white"
      >
        تلاش دوباره
      </button>
    </main>
  );
}
