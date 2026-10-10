import type { ReactNode } from "react";

type LoadingView =
  | "home"
  | "catalog"
  | "product"
  | "list"
  | "form"
  | "detail"
  | "dashboard"
  | "payment";

function Block({ className = "" }: { className?: string }) {
  return <div className={`loading-skeleton ${className}`} />;
}

function Panel({ form = false }: { form?: boolean }) {
  return (
    <div className="loading-panel grid min-w-0 gap-5">
      <Block className="h-6 w-2/3" />
      {Array.from({ length: form ? 4 : 3 }, (_, index) => (
        <Block key={index} className={form ? "h-12" : "h-5"} />
      ))}
      {form && <Block className="h-12 w-1/2" />}
    </div>
  );
}

function Products() {
  return (
    <div className="product-grid">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="loading-panel grid gap-5">
          <Block className="h-64" />
          <Block className="h-6" />
          <Block className="h-5 w-2/3" />
          <Block className="h-12" />
        </div>
      ))}
    </div>
  );
}

export function PageLoading({
  title,
  view,
  shell = false,
  admin = false,
}: {
  title: string;
  view: LoadingView;
  shell?: boolean;
  admin?: boolean;
}) {
  let content: ReactNode;
  switch (view) {
    case "home":
      content = (
        <>
          <Block className="h-80 sm:h-[32rem]" />
          <div className="category-grid">
            {Array.from({ length: 3 }, (_, index) => (
              <Panel key={index} />
            ))}
          </div>
          <Products />
        </>
      );
      break;
    case "catalog":
      content = (
        <>
          <Block className="h-32" />
          <div className="grid items-start gap-7 lg:grid-cols-[280px_minmax(0,1fr)]">
            <Panel form />
            <Products />
          </div>
        </>
      );
      break;
    case "product":
      content = (
        <>
          <div className="product-detail-grid">
            <Block className="h-96 sm:h-[32rem]" />
            <Panel form />
          </div>
          <Panel />
          <Products />
        </>
      );
      break;
    case "dashboard":
      content = (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Panel key={index} />
            ))}
          </div>
          <Panel />
          <Panel />
        </>
      );
      break;
    case "list":
      content = admin ? (
        <div className="loading-panel grid gap-5">
          <Block className="h-8 w-1/2" />
          <Block className="h-12" />
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="grid grid-cols-2 gap-4 border-b border-border pb-4 sm:grid-cols-4"
            >
              {Array.from({ length: 4 }, (_, cell) => (
                <Block key={cell} className="h-6" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="loading-panel grid gap-3 sm:grid-cols-4"
            >
              {Array.from({ length: 4 }, (_, cell) => (
                <Block key={cell} className="h-6" />
              ))}
            </div>
          ))}
        </div>
      );
      break;
    case "payment":
      content = (
        <div className="mx-auto w-full max-w-2xl">
          <Panel form />
        </div>
      );
      break;
    default:
      content = (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Panel form={view === "form"} />
          <Panel form={view === "form"} />
        </div>
      );
  }
  return (
    <div
      dir="rtl"
      aria-busy="true"
      className={`${shell ? "store-shell w-full py-8 sm:py-12" : "min-w-0"} ${admin ? "loading-admin" : ""}`}
    >
      <p role="status" className="mb-6 text-sm text-muted">
        {title}
      </p>
      <div aria-hidden="true" className="grid min-w-0 gap-8">
        {content}
      </div>
    </div>
  );
}
