import { hash, compare } from "bcryptjs";
import type { Types } from "mongoose";
import { z } from "zod";
import type { Env } from "@/lib/env";
import { User } from "@/models/user";
import { AdminOwnership } from "@/models/admin-ownership";
import { Category } from "@/models/category";
import { Product } from "@/models/product";
import { Cart } from "@/models/cart";
import { Order } from "@/models/order";
import { Counter } from "@/models/counter";
import { Brand } from "@/models/brand";
import { createBrandSchema } from "@/validations/brand";
import { createUniqueSlug } from "@/lib/slug";
import { seedCategories } from "./seed-data";
import { getCatalogProductImage } from "./catalog-images";
import { syncCatalogCategories } from "./sync-catalog-categories";

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
    Brand.init(),
  ]);
  if (options.reset) {
    await Promise.all([
      Product.deleteMany({}),
      Category.deleteMany({}),
      Cart.deleteMany({}),
      Order.deleteMany({}),
      Counter.deleteMany({}),
      Brand.deleteMany({}),
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
    const ownership = await AdminOwnership.findById("store-owner").lean();
    // Catalog maintenance must not reset the owner's credentials or access.
    if (existing && String(ownership?.owner) === String(existing._id)) continue;
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
  const brandIds = new Map<string, Types.ObjectId>();
  const brandNames = [
    ...new Set(
      seedCategories.flatMap((group) =>
        group.products.map((product) => product.brand),
      ),
    ),
  ];
  for (const [order, name] of brandNames.entries()) {
    const existing = await Brand.findOne({ name }).lean();
    if (existing) {
      brandIds.set(name, existing._id);
      continue;
    }
    const slug = await createUniqueSlug(name, (candidate) =>
      Brand.exists({ slug: candidate }).then(Boolean),
    );
    const input = createBrandSchema.parse({
      name,
      slug,
      description: `برند نمونهٔ ${name} برای تست فروشگاه`,
      order,
      isFeatured: order < 3,
    });
    const brand = await Brand.create(input);
    brandIds.set(name, brand._id);
  }
  let index = 0;
  for (const [order, group] of seedCategories.entries()) {
    const category = await Category.findOneAndUpdate(
      { slug: group.slug },
      {
        $set: {
          name: group.name,
          description: group.description,
          image: group.image,
          order,
          isActive: true,
        },
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    ).orFail();
    for (const [position, product] of group.products.entries()) {
      const slug = `${group.slug}-${position + 1}`;
      const data = {
        title: product.title,
        slug,
        description: `${product.title} با طراحی دقیق و سرمایش پایدار برای استفادهٔ روزمره ساخته شده است. مشخصات فنی این مدل امکان مقایسه و انتخاب مطمئن‌تر را فراهم می‌کند.`,
        price: product.price,
        stock: index < 2 ? 0 : 10 + index,
        sku: `LX-COLD-${String(index + 1).padStart(3, "0")}`,
        images: [
          getCatalogProductImage(group.slug, product.title) ?? group.image,
        ],
        category: category._id,
        brand: brandIds.get(product.brand),
        attributes: [
          { key: "ظرفیت", value: product.capacity },
          { key: "رده انرژی", value: product.energy },
          { key: "فناوری", value: product.technology },
        ],
        isActive: true,
        isFeatured: index < 6,
        ...(index % 4 === 0 ? { compareAtPrice: product.price + 1500000 } : {}),
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
  await syncCatalogCategories();
  const [users, categories, products, carts, orders, counters, brands] =
    await Promise.all([
      User.countDocuments(),
      Category.countDocuments(),
      Product.countDocuments(),
      Cart.countDocuments(),
      Order.countDocuments(),
      Counter.countDocuments(),
      Brand.countDocuments(),
    ]);
  return { users, categories, products, carts, orders, counters, brands };
}
