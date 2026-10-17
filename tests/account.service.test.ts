import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { compare, hash } from "bcryptjs";
import { User } from "@/models/user";
import { Product } from "@/models/product";
import { fixture, checkoutInput } from "./order-fixture";
import { addressInput } from "./fixtures";
import {
  getProfile,
  updateProfile,
  changePassword,
  addAddress,
  manageAddress,
  getCheckoutAddresses,
} from "@/services/user.service";
import {
  createOrderFromCart,
  getOrderForUser,
  listOrdersForUser,
  cancelOrder,
  markOrderPaid,
} from "@/services/order.service";
it("updates only the owner profile and never exposes or accepts credentials/roles", async () => {
  const profile = await updateProfile(fixture.user, {
    name: "نام جدید",
    mobile: "۰۹۱۲۳۴۵۶۷۸۹",
    role: "admin",
    passwordHash: "bad",
  });
  expect(profile.name).toBe("نام جدید");
  expect(profile.role).toBe("customer");
  expect(profile.mobile).toBe("09123456789");
  expect(profile).not.toHaveProperty("passwordHash");
  await updateProfile(fixture.user, { name: "نام جدید", mobile: "" });
  expect(await getProfile(fixture.user)).not.toHaveProperty("mobile");
});
it("requires the current password and validates confirmation before hashing", async () => {
  await User.updateOne(
    { _id: fixture.user },
    { passwordHash: await hash("Current123!", 12) },
  );
  await expect(
    changePassword(fixture.user, {
      currentPassword: "wrong",
      password: "Changed123!",
      confirmPassword: "Changed123!",
    }),
  ).rejects.toMatchObject({ code: "VALIDATION" });
  await expect(
    changePassword(fixture.user, {
      currentPassword: "Current123!",
      password: "Changed123!",
      confirmPassword: "different",
    }),
  ).rejects.toThrow();
  await changePassword(fixture.user, {
    currentPassword: "Current123!",
    password: "Changed123!",
    confirmPassword: "Changed123!",
  });
  const user = await User.findById(fixture.user).select("+passwordHash").lean();
  expect(await compare("Changed123!", user!.passwordHash)).toBe(true);
}, 20000);
it("enforces address ownership, limit and a single default under concurrent changes", async () => {
  await addAddress(fixture.user, addressInput);
  let addresses = await getCheckoutAddresses(fixture.user);
  const second = addresses[1].id;
  for (const operation of ["edit", "delete", "default"] as const)
    await expect(
      manageAddress(fixture.other, operation, second, addressInput),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await manageAddress(fixture.user, "edit", second, {
    ...addressInput,
    province: "فارس",
    city: "شیراز",
  });
  await Promise.all([
    manageAddress(fixture.user, "default", second),
    manageAddress(fixture.user, "default", fixture.address),
  ]);
  addresses = await getCheckoutAddresses(fixture.user);
  expect(addresses.filter((a) => a.isDefault)).toHaveLength(1);
  expect(addresses[0].isDefault).toBe(true);
  expect(addresses.find((address) => address.id === second)?.city).toBe(
    "شیراز",
  );
  await Promise.all(
    Array.from({ length: 3 }, () => addAddress(fixture.user, addressInput)),
  );
  await expect(addAddress(fixture.user, addressInput)).rejects.toMatchObject({
    code: "CONFLICT",
  });
  await manageAddress(fixture.user, "delete", second);
  expect(await getCheckoutAddresses(fixture.user)).toHaveLength(4);
});
it("puts the selected default first in address reads and mutation results without reordering the others", async () => {
  const firstAdd = await addAddress(fixture.user, {
    ...addressInput,
    title: "دوم",
  });
  const secondId = firstAdd.find((address) => address.title === "دوم")!.id;
  await addAddress(fixture.user, { ...addressInput, title: "سوم" });
  const updated = await manageAddress(fixture.user, "default", secondId);
  expect(updated.map((address) => address.title)).toEqual([
    "دوم",
    "خانه",
    "سوم",
  ]);
  expect(
    (await getCheckoutAddresses(fixture.user)).map((address) => address.id),
  ).toEqual(updated.map((address) => address.id));
  const added = await addAddress(fixture.user, {
    ...addressInput,
    title: "چهارم",
  });
  expect(added.map((address) => address.title)).toEqual([
    "دوم",
    "خانه",
    "سوم",
    "چهارم",
  ]);
  expect(added.filter((address) => address.isDefault)).toHaveLength(1);
});
it("hides foreign orders and prevents foreign cancellation without changing stock", async () => {
  const order = await createOrderFromCart(fixture.user, checkoutInput());
  await expect(getOrderForUser(fixture.other, order.id)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  expect((await listOrdersForUser(fixture.other)).items).toHaveLength(0);
  await expect(cancelOrder(fixture.other, order.id)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  expect((await Product.findById(fixture.first).lean())!.stock).toBe(3);
  await cancelOrder(fixture.user, order.id);
  expect((await Product.findById(fixture.first).lean())!.stock).toBe(5);
  await expect(cancelOrder(fixture.user, order.id)).rejects.toThrow();
  expect((await Product.findById(fixture.first).lean())!.stock).toBe(5);
});
it("does not allow a customer to cancel a processing order", async () => {
  const order = await createOrderFromCart(fixture.user, checkoutInput());
  await markOrderPaid(order.id, "ref-stage10");
  await expect(cancelOrder(fixture.user, order.id)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  expect((await getOrderForUser(fixture.user, order.id)).status).toBe(
    "processing",
  );
});
