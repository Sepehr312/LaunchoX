export default function ShopLoading() {
  return (
    <main
      className="store-shell flex min-h-[60vh] items-center justify-center py-16"
      aria-live="polite"
    >
      <div className="loading-mark">
        <span />
        <p>در حال آماده‌سازی نمایشگاه...</p>
      </div>
    </main>
  );
}
