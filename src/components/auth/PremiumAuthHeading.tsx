const signupDescription =
  "با ساخت حساب، خرید و پیگیری سفارش‌ها آسان‌تر می‌شود.";

export function PremiumAuthHeading({ register }: { register: boolean }) {
  return (
    <>
      <h1 className="mt-8 text-2xl font-bold">
        {register ? "ایجاد حساب کاربری" : "ورود به حساب کاربری"}
      </h1>
      <p className="mt-3 mb-8 text-sm leading-7 text-muted">
        {register ? (
          signupDescription
        ) : (
          <span className="grid">
            {/* Reserve the same intrinsic width as the approved signup heading. */}
            <span
              aria-hidden="true"
              className="invisible col-start-1 row-start-1 h-0 select-none"
            >
              {signupDescription}
            </span>
            <span className="col-start-1 row-start-1">
              خوش آمدید! برای ادامه خرید وارد حساب خود شوید.
            </span>
          </span>
        )}
      </p>
    </>
  );
}
