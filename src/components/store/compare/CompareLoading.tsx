export default function CompareLoading() {
  return (
    <main
      className="mx-auto w-full max-w-7xl px-4 py-12"
      aria-busy="true"
      aria-label="در حال بارگذاری مقایسه محصولات"
    >
      <div className="loading-skeleton mb-8 h-20 w-2/3" />
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((id) => (
          <div key={id} className="loading-skeleton h-96" />
        ))}
      </div>
      <div className="loading-skeleton mt-8 h-64" />
    </main>
  );
}
