import { OrderDelivery } from "@/components/customer/OrderDelivery";
import { OrderProgress } from "@/components/customer/OrderProgress";
import { PasswordGuidance } from "@/components/customer/PasswordGuidance";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthForm } from "@/components/auth/AuthForm";
import { OrderBadge } from "@/components/customer/OrderBadge";
import { CustomerEmpty } from "@/components/customer/CustomerEmpty";
import { CartForm } from "@/components/store/CartForm";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import type { AddressDTO, OrderDTO } from "@/types/dto";
vi.mock("@/actions/auth.actions", () => ({
  loginAction: vi.fn(),
  registerAction: vi.fn(),
  requireUser: async () => ({ id: "user-1", name: "مشتری نمونه" }),
  logoutAction: vi.fn(),
}));
vi.mock("@/actions/cart.actions", () => ({
  addCartAction: vi.fn(),
  updateCartAction: vi.fn(),
  removeCartAction: vi.fn(),
}));
vi.mock("@/actions/checkout.actions", () => ({
  checkoutAction: vi.fn(),
  addCheckoutAddressAction: vi.fn(),
}));
const address: AddressDTO = {
  id: "address-1",
  title: "خانه",
  recipientName: "مشتری نمونه",
  mobile: "09123456789",
  province: "تهران",
  city: "تهران",
  addressLine: "خیابان نمونه، پلاک ۱۲، واحد ۲",
  postalCode: "1234567890",
  isDefault: true,
  createdAt: "2026-10-13T00:00:00Z",
  updatedAt: "2026-10-13T00:00:00Z",
};
describe("customer forms and purchase states", () => {
  it("keeps login and registration fields distinct and passwords private", () => {
    const login = renderToStaticMarkup(
      <AuthForm mode="login" callbackUrl="/account" />,
    );
    expect(login).toContain('type="password"');
    expect(login).toContain('autoComplete="current-password"');
    expect(login).toContain('name="callbackUrl"');
    expect(login).toContain("ایمیل را تا بسته‌شدن این تب نگه دار");
    expect(login).not.toContain('name="confirmPassword"');
    const register = renderToStaticMarkup(
      <AuthForm mode="register" callbackUrl="/checkout" />,
    );
    for (const name of ["name", "email", "password", "confirmPassword"])
      expect(register).toContain(`name="${name}"`);
    expect(register).toContain("حداقل ۸ کاراکتر");
    expect(register).not.toContain('name="role"');
    expect(
      renderToStaticMarkup(
        <AuthForm
          mode="login"
          callbackUrl="/"
          initialError="ایمیل یا رمز عبور اشتباه است"
        />,
      ),
    ).toContain('role="alert"');
  });
  it("renders payment and delivery statuses with distinct semantic colors", () => {
    for (const status of ["paid", "delivered"] as const)
      expect(
        renderToStaticMarkup(
          <OrderBadge status={status} payment={status === "paid"} />,
        ),
      ).toContain("text-success");
    for (const status of ["failed", "cancelled"] as const)
      expect(
        renderToStaticMarkup(
          <OrderBadge status={status} payment={status === "failed"} />,
        ),
      ).toContain("text-danger");
    expect(renderToStaticMarkup(<OrderBadge status="shipped" />)).toContain(
      "text-primary",
    );
    expect(renderToStaticMarkup(<OrderBadge status="pending" />)).toContain(
      "در انتظار پرداخت",
    );
  });
  it("submits only the selected next quantity and enforces both UI boundaries", () => {
    const minimum = renderToStaticMarkup(
      <CartForm product="sample" stock={4} quantity={1} mode="update" />,
    );
    expect(minimum).toMatch(/value="0" disabled="" aria-label="کاهش تعداد"/);
    expect(minimum).toContain('value="2" aria-label="افزایش تعداد"');
    const maximum = renderToStaticMarkup(
      <CartForm product="sample" stock={50} quantity={10} mode="update" />,
    );
    expect(maximum).toMatch(/value="11" disabled="" aria-label="افزایش تعداد"/);
    expect(maximum).not.toContain('type="hidden" name="quantity"');
  });
  it("blocks checkout without an address and hides addition at five addresses", () => {
    const empty = renderToStaticMarkup(<CheckoutForm addresses={[]} />);
    expect(empty).toContain("هنوز آدرسی ندارید");
    expect(empty).toMatch(/type="submit"[^>]*disabled=""/);
    const full = renderToStaticMarkup(
      <CheckoutForm
        addresses={Array.from({ length: 5 }, (_, index) => ({
          ...address,
          id: `address-${index}`,
          isDefault: index === 0,
        }))}
      />,
    );
    expect(full).not.toContain("افزودن آدرس جدید");
    expect(full).toContain('type="radio"');
    expect(full).toContain('name="note"');
  });
  it("gives empty states a useful return action", () => {
    const html = renderToStaticMarkup(
      <CustomerEmpty
        title="سفارش ندارید"
        description="سفارش‌ها اینجا نمایش داده می‌شوند"
        href="/products"
        label="مشاهدهٔ محصولات"
      />,
    );
    expect(html).toContain('href="/products"');
    expect(html).toContain("سفارش ندارید");
  });
});

vi.mock("@/lib/env", () => ({
  getEnv: () => ({ NEXT_PUBLIC_SITE_NAME: "لانچ‌اوکس" }),
}));
vi.mock("@/actions/account.actions", () => ({ accountAction: vi.fn() }));
vi.mock("@/services/user.service", () => ({
  getProfile: async () => ({
    name: "مشتری نمونه",
    email: "customer@example.com",
    mobile: "09123456789",
  }),
  getCheckoutAddresses: async () => [address],
}));
const viewState = vi.hoisted(() => ({ paid: false, failed: false }));
function sampleOrder(): OrderDTO {
  const timestamp = "2026-10-13T00:00:00Z";
  return {
    id: "012345678901234567890123",
    user: "user-1",
    orderNumber: "LX-100001",
    createdAt: timestamp,
    updatedAt: timestamp,
    items: [
      {
        product: "product-1",
        slug: "sample",
        title: "یخچال نمونه",
        image: "/images/placeholder.png",
        price: 1000000,
        quantity: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    subtotal: 1000000,
    shippingFee: 0,
    total: 1000000,
    shippingAddress: address,
    status: viewState.failed
      ? "cancelled"
      : viewState.paid
        ? "processing"
        : "pending",
    payment: {
      status: viewState.failed ? "failed" : viewState.paid ? "paid" : "unpaid",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    statusHistory: [
      {
        status: "pending",
        changedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
}
vi.mock("@/services/order.service", () => ({
  getOrderByNumberForUser: async () => sampleOrder(),
  getOrderForUser: async () => sampleOrder(),
  listOrdersForUser: async () => ({
    items: [sampleOrder()],
    page: 1,
    totalPages: 1,
  }),
}));
describe("customer page composition", () => {
  it("renders profile, address management and order details with their existing actions", async () => {
    const { default: Profile } = await import("@/app/(shop)/account/page");
    const profile = renderToStaticMarkup(await Profile());
    expect(profile).toContain("ایمیل حساب (غیرقابل ویرایش)");
    expect(profile).toContain('name="currentPassword"');
    const { default: Addresses } =
      await import("@/app/(shop)/account/addresses/page");
    const addresses = renderToStaticMarkup(await Addresses());
    expect(addresses).toContain("ویرایش آدرس");
    expect(addresses).toContain("حذف آدرس");
    expect(addresses).toContain("پیش‌فرض");
    const { default: Orders } =
      await import("@/app/(shop)/account/orders/page");
    const list = renderToStaticMarkup(
      await Orders({ searchParams: Promise.resolve({}) }),
    );
    expect(list).toContain("زمان تحویل پس از پرداخت موفق مشخص می‌شود");
    expect(list).not.toContain("حدود ۱ هفته");
    const { default: Details } =
      await import("@/app/(shop)/account/orders/[id]/page");
    const details = renderToStaticMarkup(
      await Details({
        params: Promise.resolve({ id: "012345678901234567890123" }),
      }),
    );
    expect(details).toContain("تاریخچهٔ سفارش");
    expect(details).toContain("لغو سفارش");
    expect(details).toContain("نشانی ارسال");
  });
  it("renders all payment outcomes and links to the actual owned order", async () => {
    const { default: Result } =
      await import("@/app/(shop)/checkout/result/page");
    for (const [paid, failed, message, tone] of [
      [true, false, "پرداخت با موفقیت انجام شد", "text-success"],
      [false, true, "پرداخت انجام نشد", "text-danger"],
      [false, false, "سفارش در انتظار پرداخت است", "pending"],
    ] as const) {
      viewState.paid = paid;
      viewState.failed = failed;
      const html = renderToStaticMarkup(
        await Result({ searchParams: Promise.resolve({ order: "LX-100001" }) }),
      );
      expect(html).toContain(message);
      expect(html).toContain(tone);
      expect(html).toContain('href="/account/orders/012345678901234567890123"');
      expect(html).toContain("شمارهٔ سفارش");
    }
  });
});

describe("customer interaction cues", () => {
  it("marks only the actual order stage current and does not progress cancelled orders", () => {
    const shipped = renderToStaticMarkup(<OrderProgress status="shipped" />);
    expect(shipped.match(/aria-current="step"/g)).toHaveLength(1);
    expect(shipped.match(/data-complete="true"/g)).toHaveLength(2);
    expect(shipped).toMatch(/aria-current="step"[^]*?ارسال/);
    const cancelled = renderToStaticMarkup(
      <OrderProgress status="cancelled" />,
    );
    expect(cancelled).toContain("این سفارش لغو شده است");
    expect(cancelled).not.toContain('aria-current="step"');
  });
  it("gives live password cues for matching, mismatching and oversized passwords", () => {
    const valid = renderToStaticMarkup(
      <PasswordGuidance password="Customer123!" confirmation="Customer123!" />,
    );
    expect(valid.match(/text-success/g)).toHaveLength(4);
    const mismatch = renderToStaticMarkup(
      <PasswordGuidance password="Customer123!" confirmation="different" />,
    );
    expect(mismatch.match(/text-success/g)).toHaveLength(3);
    const long = "A1".repeat(40);
    const oversized = renderToStaticMarkup(
      <PasswordGuidance password={long} confirmation={long} />,
    );
    expect(oversized.match(/text-success/g)).toHaveLength(3);
    const empty = renderToStaticMarkup(
      <PasswordGuidance password="" confirmation="" />,
    );
    expect(empty).not.toContain("text-success");
  });
});

describe("order delivery messages", () => {
  it.each(["unpaid", "failed", "refunded"] as const)(
    "does not estimate delivery for %s payments",
    (paymentStatus) => {
      const html = renderToStaticMarkup(
        <OrderDelivery status="pending" paymentStatus={paymentStatus} />,
      );
      expect(html).toContain("پس از پرداخت موفق");
      expect(html).not.toContain("هفته");
    },
  );
  it.each(["pending", "processing", "shipped"] as const)(
    "estimates delivery for paid %s orders",
    (status) => {
      expect(
        renderToStaticMarkup(
          <OrderDelivery status={status} paymentStatus="paid" />,
        ),
      ).toContain("حدود ۱ هفته");
    },
  );
  it("shows terminal states without an estimate", () => {
    expect(
      renderToStaticMarkup(
        <OrderDelivery status="delivered" paymentStatus="paid" />,
      ),
    ).toContain("تحویل داده شده");
    for (const paymentStatus of [
      "paid",
      "unpaid",
      "failed",
      "refunded",
    ] as const) {
      const html = renderToStaticMarkup(
        <OrderDelivery status="cancelled" paymentStatus={paymentStatus} />,
      );
      expect(html).toContain("لغو شده");
      expect(html).not.toContain("هفته");
    }
  });
});
