import "server-only";

import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { toDTO } from "@/lib/model-shared";
import { createUniqueSlug } from "@/lib/slug";
import { Category } from "@/models/category";
import { Product } from "@/models/product";
import type { PaginatedResult, ProductDTO, StoreProductDTO } from "@/types/dto";
import type { ProductInput, ProductQueryInput } from "@/validations/product";

const sortOptions = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  bestselling: { soldCount: -1, createdAt: -1 },
} as const;

function escapedRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function withCategories(records: object[]): Promise<StoreProductDTO[]> {
  const products = records.map((record) => toDTO(record) as ProductDTO);
  const ids = [...new Set(products.map((product) => product.category))];
  const categories = await Category.find({ _id: { $in: ids } }).lean();
  const categoryMap = new Map(
    categories.map((record) => {
      const category = toDTO(record);
      return [
        category.id,
        { id: category.id, name: category.name, slug: category.slug },
      ];
    }),
  );
  return products.flatMap((product) => {
    const category = categoryMap.get(product.category);
    return category ? [{ ...product, category }] : [];
  });
}

type ProductStoreFilter = {
  isActive?: boolean;
  category?: Types.ObjectId;
  $or?: Array<{ title: RegExp } | { description: RegExp }>;
  price?: { $gte?: number; $lte?: number };
  stock?: { $gt: number };
};

function storefrontFilter(input: ProductQueryInput): ProductStoreFilter {
  const filter: ProductStoreFilter = { isActive: true };
  if (input.category) filter.category = new Types.ObjectId(input.category);
  if (input.q) {
    const query = new RegExp(escapedRegex(input.q), "i");
    filter.$or = [{ title: query }, { description: query }];
  }
  if (input.minPrice !== undefined || input.maxPrice !== undefined) {
    filter.price = {};
    if (input.minPrice !== undefined) filter.price.$gte = input.minPrice;
    if (input.maxPrice !== undefined) filter.price.$lte = input.maxPrice;
  }
  if (input.inStock) filter.stock = { $gt: 0 };
  return filter;
}

export async function listProducts(
  input: ProductQueryInput,
): Promise<PaginatedResult<StoreProductDTO>> {
  await connectDB();
  const filter = storefrontFilter(input);
  const [records, total] = await Promise.all([
    Product.find(filter)
      .sort(sortOptions[input.sort])
      .skip((input.page - 1) * input.limit)
      .limit(input.limit)
      .lean(),
    Product.countDocuments(filter),
  ]);
  return {
    items: await withCategories(records),
    page: input.page,
    limit: input.limit,
    total,
    totalPages: Math.ceil(total / input.limit),
  };
}

export async function getProductBySlug(
  slug: string,
): Promise<StoreProductDTO | null> {
  await connectDB();
  const record = await Product.findOne({ slug, isActive: true }).lean();
  return record ? ((await withCategories([record]))[0] ?? null) : null;
}

export async function getFeaturedProducts(
  limit = 6,
): Promise<StoreProductDTO[]> {
  await connectDB();
  const records = await Product.find({ isActive: true, isFeatured: true })
    .sort({ soldCount: -1, createdAt: -1 })
    .limit(limit)
    .lean();
  return withCategories(records);
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string,
  limit = 4,
): Promise<StoreProductDTO[]> {
  await connectDB();
  const records = await Product.find({
    _id: { $ne: productId },
    category: categoryId,
    isActive: true,
  })
    .sort({ isFeatured: -1, soldCount: -1, createdAt: -1 })
    .limit(limit)
    .lean();
  return withCategories(records);
}

async function ensureCategory(category: string) {
  if (!(await Category.exists({ _id: category })))
    throw new AppError("دسته‌بندی پیدا نشد", "NOT_FOUND");
}

export async function createProduct(
  input: ProductInput,
): Promise<StoreProductDTO> {
  await connectDB();
  await ensureCategory(input.category);
  const slug =
    input.slug ??
    (await createUniqueSlug(input.title, (candidate) =>
      Product.exists({ slug: candidate }).then(Boolean),
    ));
  try {
    const product = await Product.create({ ...input, slug });
    return (await withCategories([product.toObject()]))[0];
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    )
      throw new AppError("نامک یا شناسهٔ کالا تکراری است", "CONFLICT");
    throw error;
  }
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<StoreProductDTO> {
  await connectDB();
  await ensureCategory(input.category);
  const slug =
    input.slug ??
    (await createUniqueSlug(input.title, (candidate) =>
      Product.exists({ slug: candidate, _id: { $ne: id } }).then(Boolean),
    ));
  const validationDocument = new Product({ ...input, slug });
  await validationDocument.validate();
  try {
    const product = await Product.findByIdAndUpdate(
      id,
      {
        $set: { ...input, slug },
        $unset: {
          ...(input.sku === undefined ? { sku: 1 } : {}),
          ...(input.compareAtPrice === undefined ? { compareAtPrice: 1 } : {}),
        },
      },
      { returnDocument: "after" },
    )
      .lean()
      .orFail(() => new AppError("محصول پیدا نشد", "NOT_FOUND"));
    return (await withCategories([product]))[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    )
      throw new AppError("نامک یا شناسهٔ کالا تکراری است", "CONFLICT");
    throw error;
  }
}

export async function deleteProduct(id: string): Promise<void> {
  await connectDB();
  const result = await Product.deleteOne({ _id: id });
  if (!result.deletedCount) throw new AppError("محصول پیدا نشد", "NOT_FOUND");
}

export async function listProductsAdmin(
  input: ProductQueryInput,
): Promise<PaginatedResult<StoreProductDTO>> {
  await connectDB();
  const filter = storefrontFilter(input);
  delete filter.isActive;
  const [records, total] = await Promise.all([
    Product.find(filter)
      .sort(sortOptions[input.sort])
      .skip((input.page - 1) * input.limit)
      .limit(input.limit)
      .lean(),
    Product.countDocuments(filter),
  ]);
  return {
    items: await withCategories(records),
    page: input.page,
    limit: input.limit,
    total,
    totalPages: Math.ceil(total / input.limit),
  };
}

export async function getProductAdmin(
  id: string,
): Promise<StoreProductDTO | null> {
  await connectDB();
  const record = await Product.findById(id).lean();
  return record ? ((await withCategories([record]))[0] ?? null) : null;
}
export async function getProductCategoryOptions() {
  await connectDB();
  const records = await Category.find().sort({ order: 1, name: 1 }).lean();
  return records.map((record) => {
    const dto = toDTO(record);
    return { id: dto.id, name: dto.name };
  });
}
export async function setProductActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  await connectDB();
  const result = await Product.updateOne({ _id: id }, { $set: { isActive } });
  if (!result.matchedCount) throw new AppError("محصول پیدا نشد", "NOT_FOUND");
}
