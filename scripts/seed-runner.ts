import { hash, compare } from "bcryptjs";
import { z } from "zod";
import type { Env } from "@/lib/env";
import { User } from "@/models/user";
import { Category } from "@/models/category";
import { Product } from "@/models/product";
import { Cart } from "@/models/cart";
import { Order } from "@/models/order";
import { Counter } from "@/models/counter";
import { seedCategories } from "./seed-data";

export function parseSeedOptions(args: string[], env: Env) {
  const flags = z.array(z.enum(["--reset", "--force"])).parse(args);
  if (env.NODE_ENV === "production" && !flags.includes("--force")) {
    throw new Error("Production seed requires --force.");
  }
  const credentials = z
    .object({
      email: z
        .email()
        .trim()
        .toLowerCase()
        .refine((email) => email !== "customer@launchox.local"),
      password: z
        .string()
        .min(8)
        .refine((password) => Buffer.byteLength(password, "utf8") <= 72),
    })
    .safeParse({
      email: env.SEED_ADMIN_EMAIL,
      password: env.SEED_ADMIN_PASSWORD,
    });
  if (!credentials.success)
    throw new Error(
      "Valid SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (8 characters to 72 bytes) are required; admin email must differ from customer email.",
    );
  return { reset: flags.includes("--reset"), ...credentials.data };
}

export async function seedDatabase(
  options: ReturnType<typeof parseSeedOptions>,
) {
  await Promise.all([
    User.init(),
    Category.init(),
    Product.init(),
    Cart.init(),
    Order.init(),
    Counter.init(),
  ]);
  if (options.reset) {
    await Promise.all([
      Product.deleteMany({}),
      Category.deleteMany({}),
      Cart.deleteMany({}),
      Order.deleteMany({}),
      Counter.deleteMany({}),
    ]);
  }
  const accounts = [
    {
      email: options.email,
      password: options.password,
      name: "مدیر فروشگاه",
      role: "admin" as const,
    },
    {
      email: "customer@launchox.local",
      password: "Customer123!",
      name: "مشتری نمونه",
      role: "customer" as const,
    },
  ];
  for (const account of accounts) {
    const existing = await User.findOne({ email: account.email }).select(
      "+passwordHash",
    );
    const passwordHash =
      existing && (await compare(account.password, existing.passwordHash))
        ? existing.passwordHash
        : await hash(account.password, 12);
    await User.updateOne(
      { email: account.email },
      {
        $set: {
          name: account.name,
          role: account.role,
          passwordHash,
          isActive: true,
        },
        $setOnInsert: {
          email: account.email,
          addresses:
            account.role === "customer"
              ? [
                  {
                    title: "خانه",
                    recipientName: account.name,
                    mobile: "09123456789",
                    province: "تهران",
                    city: "تهران",
                    postalCode: "1234567890",
                    addressLine: "خیابان آزادی، پلاک ۱۲",
                    isDefault: true,
                  },
                ]
              : [],
        },
      },
      { upsert: true, runValidators: true },
    );
  }
  let index = 0;
  for (const [order, group] of seedCategories.entries()) {
    const category = await Category.findOneAndUpdate(
      { slug: group.slug },
      { $set: { name: group.name, order, isActive: true } },
      { upsert: true, returnDocument: "after", runValidators: true },
    ).orFail();
    for (const [position, title] of group.titles.entries()) {
      const slug = `${group.slug}-${position + 1}`;
      const data = {
        title,
        slug,
        description: `${title} گزینه‌ای کاربردی برای ${group.use} است. این محصول با کیفیت مناسب برای استفادهٔ روزمره عرضه می‌شود.`,
        price: group.prices[position],
        stock: index < 2 ? 0 : 10 + index,
        images: [`https://picsum.photos/seed/${slug}/800/800`],
        category: category._id,
        attributes: [
          { key: "جنس", value: group.material },
          { key: "کاربرد", value: group.use },
        ],
        isActive: true,
        isFeatured: index < 6,
        ...(index % 4 === 0
          ? { compareAtPrice: group.prices[position] + 100000 }
          : {}),
      };
      // Document validation checks compareAtPrice against price, unlike update validators.
      await new Product(data).validate();
      await Product.updateOne(
        { slug },
        { $set: data, $setOnInsert: { soldCount: 0 } },
        { upsert: true, runValidators: false },
      );
      index++;
    }
  }
  const [users, categories, products, carts, orders, counters] =
    await Promise.all([
      User.countDocuments(),
      Category.countDocuments(),
      Product.countDocuments(),
      Cart.countDocuments(),
      Order.countDocuments(),
      Counter.countDocuments(),
    ]);
  return { users, categories, products, carts, orders, counters };
}
