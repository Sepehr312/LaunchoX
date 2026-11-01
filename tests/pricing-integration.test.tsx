import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { fixture, checkoutInput } from "./order-fixture";
import { Product } from "@/models/product";
import { Category } from "@/models/category";
import { Cart } from "@/models/cart";
import { Order } from "@/models/order";
import {
  getProductBySlug,
  getComparisonProducts,
  listProducts,
} from "@/services/product.service";
import { getCart, addToCart } from "@/services/cart.service";
import { createOrderFromCart, getOrderForUser } from "@/services/order.service";
import {
  startCheckout,
  completePayment,
} from "@/services/payment/payment.service";
import { fakeProvider } from "@/services/payment/fake.provider";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductDetails } from "@/components/store/ProductDetails";
import { CompareProductHeader } from "@/components/store/compare/CompareProductHeader";
import { formatPrice } from "@/lib/format";
import { productQuerySchema } from "@/validations/product";

vi.mock("@/actions/cart.actions", () => ({
  addCartAction: vi.fn(),
  updateCartAction: vi.fn(),
  removeCartAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => vi.restoreAllMocks());

async function setupPricing() {
  await Category.deleteMany({});
  const product = await Product.findById(fixture.first).lean().orFail();
  await Category.create({
    _id: product.category,
    name: "دسته آزمون",
    slug: "pricing-category",
  });
  await Product.updateOne(
    { _id: fixture.first },
    { price: 35400000, compareAtPrice: 36900000 },
  );
  return (await getProductBySlug("first"))!;
}

it("renders the same server prices and percent in both card variants, details and comparison", async () => {
  const product = await setupPricing();
  const comparison = (await getComparisonProducts([product.id]))[0];
  expect(comparison.pricing).toEqual(product.pricing);
  expect(
    (await listProducts(productQuerySchema.parse({}))).items.find(
      (item) => item.id === product.id,
    )?.pricing,
  ).toEqual(product.pricing);
  const views = [
    renderToStaticMarkup(<ProductCard product={product} />),
    renderToStaticMarkup(<ProductCard product={product} variant="compact" />),
    renderToStaticMarkup(
      <ProductDetails
        product={product}
        relatedProducts={[]}
        initialQuantity={0}
      />,
    ),
    renderToStaticMarkup(
      <CompareProductHeader
        products={[comparison]}
        onRemove={() => {}}
        onPick={() => {}}
        fixture={false}
      />,
    ),
  ];
  for (const html of views) {
    expect(html).toContain(formatPrice(product.price));
    expect(html).toContain(formatPrice(product.compareAtPrice!));
    expect(html).toMatch(/(?:۴٪|٪۴)/);
    expect(html).not.toMatch(/NaN|Infinity/);
  }
  await Product.updateOne(
    { _id: fixture.first },
    { $unset: { compareAtPrice: 1 } },
  );
  const plain = (await getProductBySlug("first"))!;
  for (const variant of ["default", "compact"] as const) {
    const html = renderToStaticMarkup(
      <ProductCard product={plain} variant={variant} />,
    );
    expect(html).not.toContain("<del>");
    expect(html).not.toContain("تخفیف");
  }
});

it("refreshes cart prices, ignores forged input and preserves the checkout snapshot through payment", async () => {
  await Product.updateOne(
    { _id: fixture.first },
    { price: 75000, compareAtPrice: 100000 },
  );
  await addToCart(
    { user: fixture.user },
    { product: fixture.first, quantity: 1, price: 1, total: 1 },
  );
  const before = await getCart({ user: fixture.user });
  expect(before.items[0].product.price).toBe(75000);
  await Product.updateOne({ _id: fixture.first }, { price: 80000 });
  const current = await getCart({ user: fixture.user });
  const request = vi.spyOn(fakeProvider, "requestPayment");
  const payment = await startCheckout(fixture.user, {
    ...checkoutInput(),
    price: 1,
    total: 1,
    items: [{ price: 1 }],
  });
  const order = (await Order.findOne().lean())!;
  expect(order.items[0].price).toBe(80000);
  expect(order.subtotal).toBe(current.subtotal);
  expect(order.total).toBe(current.total);
  expect(request.mock.calls[0][0].amount).toBe(order.total);
  await Product.updateOne(
    { _id: fixture.first },
    { price: 2, compareAtPrice: 3 },
  );
  const verify = vi.spyOn(fakeProvider, "verifyPayment");
  await completePayment(fixture.user, {
    authority: payment.authority,
    status: "OK",
    amount: "1",
  });
  expect(verify.mock.calls[0][0].amount).toBe(order.total);
  expect(
    (await getOrderForUser(fixture.user, String(order._id))).items[0].price,
  ).toBe(80000);
});

it.each([-1, 0.5, Number.MAX_SAFE_INTEGER + 1])(
  "rolls back invalid stored selling price %s without losing the cart",
  async (price) => {
    await Product.collection.updateOne(
      { _id: (await Product.findById(fixture.first).orFail())._id },
      { $set: { price } },
    );
    await expect(getCart({ user: fixture.user })).rejects.toThrow();
    await expect(
      createOrderFromCart(fixture.user, checkoutInput()),
    ).rejects.toThrow();
    expect((await Product.findById(fixture.first).lean())?.stock).toBe(5);
    expect(await Order.countDocuments()).toBe(0);
    const cart = await Cart.findOne({ user: fixture.user }).lean();
    expect(cart?.items).toHaveLength(2);
    expect(cart?.checkoutToken).toBeUndefined();
  },
);

it("rolls back line and subtotal overflow for both cart preview and checkout", async () => {
  await Product.updateOne(
    { _id: fixture.first },
    { price: Number.MAX_SAFE_INTEGER },
  );
  await expect(getCart({ user: fixture.user })).rejects.toMatchObject({
    code: "VALIDATION",
  });
  await expect(
    createOrderFromCart(fixture.user, checkoutInput()),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  expect(await Order.countDocuments()).toBe(0);
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(5);
  await Cart.updateOne(
    { user: fixture.user },
    { $set: { "items.0.quantity": 1 } },
  );
  await Product.updateOne({ _id: fixture.second }, { price: 1 });
  await expect(getCart({ user: fixture.user })).rejects.toMatchObject({
    code: "VALIDATION",
  });
  await expect(
    createOrderFromCart(fixture.user, checkoutInput()),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  expect(await Order.countDocuments()).toBe(0);
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(5);
  expect((await Product.findById(fixture.second).lean())?.stock).toBe(5);
});

it("rejects a corrupted stored quantity above the ten-unit cap before reservation", async () => {
  await Product.updateOne({ _id: fixture.first }, { stock: 100 });
  await Cart.updateOne(
    { user: fixture.user },
    { $set: { "items.0.quantity": 11 } },
  );
  await expect(
    createOrderFromCart(fixture.user, checkoutInput()),
  ).rejects.toThrow();
  expect((await Product.findById(fixture.first).lean())?.stock).toBe(100);
  expect(await Order.countDocuments()).toBe(0);
});
