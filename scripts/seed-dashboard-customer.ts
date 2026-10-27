import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import mongoose from "mongoose";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { Product } from "@/models/product";
import { registerUser, authenticateUser } from "@/services/auth.service";
import { addAddress, manageAddress } from "@/services/user.service";
import { addToCart } from "@/services/cart.service";
import {
  attachOrderPayment,
  createOrderFromCart,
  getCustomerDashboardOrders,
  markOrderPaid,
  updateOrderStatus,
} from "@/services/order.service";

const credentialsPath = resolve(
  import.meta.dirname,
  "../tmp/dashboard-customer.json",
);
const credentialsSchema = z.object({
  email: z.literal("dashboard.customer@launchox.local"),
  password: z.string().min(8),
});

async function main() {
  if (getEnv().NODE_ENV !== "development")
    throw new Error("Dashboard fixtures require development mode.");
  await connectDB();
  await Promise.all([User.init(), Product.init()]);
  const products = await Product.find({ isActive: true, stock: { $gte: 8 } })
    .sort({ stock: -1 })
    .limit(3)
    .lean();
  if (!products.length)
    throw new Error(
      "An active catalog product with at least eight units is required.",
    );
  let credentials: z.infer<typeof credentialsSchema>;
  try {
    credentials = credentialsSchema.parse(
      JSON.parse(await readFile(credentialsPath, "utf8")),
    );
  } catch (error: unknown) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
    credentials = {
      email: "dashboard.customer@launchox.local",
      password: `Dx9!${randomBytes(12).toString("hex")}`,
    };
    if (await User.exists({ email: credentials.email }))
      throw new Error(
        "Preview account exists; restore its local credentials file rather than resetting its password.",
      );
    await mkdir(dirname(credentialsPath), { recursive: true });
    await writeFile(credentialsPath, JSON.stringify(credentials, null, 2), {
      flag: "wx",
    });
  }
  let user = await authenticateUser(credentials);
  if (!user) {
    if (await User.exists({ email: credentials.email }))
      throw new Error(
        "Preview credentials do not match; no account was changed.",
      );
    await registerUser({ ...credentials, name: "سپهر احمدی" });
    user = await authenticateUser(credentials);
  }
  if (!user || user.role !== "customer")
    throw new Error("A dedicated customer account is required.");
  const stored = await User.findOne({ _id: user.id, role: "customer" })
    .lean()
    .orFail();
  if (!stored.addresses.length) {
    const addresses = await addAddress(user.id, {
      title: "خانه",
      recipientName: "سپهر احمدی",
      mobile: "09123456789",
      province: "تهران",
      city: "تهران",
      postalCode: "1234567890",
      addressLine: "خیابان ولیعصر، کوچهٔ بهار، پلاک ۲۴، واحد ۳",
      isDefault: false,
    });
    await manageAddress(user.id, "default", addresses[0].id);
  }
  const customer = await User.findOne({ _id: user.id, role: "customer" })
    .lean()
    .orFail();
  const summary = await getCustomerDashboardOrders(user.id);
  // Resume from the persisted count; never reset an existing account or catalog.
  for (let index = summary.total; index < 8; index++) {
    const product = products[index % products.length];
    await addToCart(
      { user: user.id },
      { product: String(product._id), quantity: 1 },
    );
    const order = await createOrderFromCart(user.id, {
      addressId: String(customer.addresses[0]._id),
      note: "سفارش آزمایشی برای بررسی داشبورد مشتری",
    });
    await attachOrderPayment(order.id, randomUUID(), "fake");
    await markOrderPaid(order.id, `dashboard-demo-${randomUUID()}`);
    if (index !== 6)
      await updateOrderStatus({ id: order.id, status: "shipped" }, user.id);
    if (index < 6)
      await updateOrderStatus({ id: order.id, status: "delivered" }, user.id);
  }
  const result = await getCustomerDashboardOrders(user.id);
  console.log(
    JSON.stringify({
      email: credentials.email,
      credentialsFile: "tmp/dashboard-customer.json",
      total: result.total,
      counts: result.counts,
      latest: result.latest?.orderNumber,
    }),
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Dashboard seed failed.",
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
