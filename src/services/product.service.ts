import "server-only";

import { Types, type PipelineStage } from "mongoose";
import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { toDTO } from "@/lib/model-shared";
import { createUniqueSlug } from "@/lib/slug";
import { Category } from "@/models/category";
import { Product } from "@/models/product";
import type {
  PaginatedResult,
  ProductDTO,
  StoreProductDTO,
  ProductFilterOptionsDTO,
} from "@/types/dto";
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
  $and?: object[];
  $expr?: object;
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
  const attributes: object[] = [];
  if (input.brands?.length)
    attributes.push({
      attributes: { $elemMatch: { key: "برند", value: { $in: input.brands } } },
    });
  if (input.energies?.length)
    attributes.push({
      attributes: {
        $elemMatch: { key: "رده انرژی", value: { $in: input.energies } },
      },
    });
  if (attributes.length) filter.$and = attributes;
  if (input.discounted)
    filter.$expr = {
      $and: [
        { $gt: ["$compareAtPrice", "$price"] },
        { $gt: ["$compareAtPrice", 0] },
      ],
    };
  return filter;
}

function capacityExpression() {
  const digitPairs = [..."۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩"].map((digit, index) => [
    digit,
    String(index % 10),
  ]);
  return {
    $let: {
      vars: {
        attribute: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$attributes",
                as: "attribute",
                cond: { $eq: ["$$attribute.key", "ظرفیت"] },
              },
            },
            0,
          ],
        },
      },
      in: {
        $let: {
          vars: {
            number: {
              $regexFind: {
                input: {
                  $reduce: {
                    input: [...digitPairs, ["٬", ""], [",", ""]],
                    initialValue: { $ifNull: ["$$attribute.value", ""] },
                    in: {
                      $replaceAll: {
                        input: "$$value",
                        find: { $arrayElemAt: ["$$this", 0] },
                        replacement: { $arrayElemAt: ["$$this", 1] },
                      },
                    },
                  },
                },
                regex: "^\\s*[0-9]+(?:\\.[0-9]+)?",
              },
            },
          },
          in: {
            $convert: {
              input: "$$number.match",
              to: "double",
              onError: null,
              onNull: null,
            },
          },
        },
      },
    },
  };
}

async function queryProductRecords(
  input: ProductQueryInput,
  filter: ProductStoreFilter,
) {
  if (
    input.sort !== "discount" &&
    (!input.capacity || input.capacity === "all")
  ) {
    const [records, total] = await Promise.all([
      Product.find(filter)
        .sort({ ...sortOptions[input.sort], _id: 1 })
        .skip((input.page - 1) * input.limit)
        .limit(input.limit)
        .lean(),
      Product.countDocuments(filter),
    ]);
    return { records, total };
  }
  const pipeline: PipelineStage[] = [{ $match: filter }];
  if (input.capacity && input.capacity !== "all") {
    pipeline.push({ $set: { _catalogCapacity: capacityExpression() } });
    const range =
      input.capacity === "small"
        ? { $gte: 0, $lt: 400 }
        : input.capacity === "medium"
          ? { $gte: 400, $lte: 600 }
          : { $gt: 600 };
    pipeline.push({ $match: { _catalogCapacity: range } });
  }
  if (input.sort === "discount") {
    pipeline.push({
      $set: {
        _catalogDiscount: {
          $cond: [
            {
              $and: [
                { $gt: ["$compareAtPrice", "$price"] },
                { $gt: ["$compareAtPrice", 0] },
              ],
            },
            { $subtract: [1, { $divide: ["$price", "$compareAtPrice"] }] },
            0,
          ],
        },
      },
    });
  }
  pipeline.push({
    $facet: {
      items: [
        {
          $sort:
            input.sort === "discount"
              ? { _catalogDiscount: -1, createdAt: -1, _id: 1 }
              : { ...sortOptions[input.sort], _id: 1 },
        },
        { $skip: (input.page - 1) * input.limit },
        { $limit: input.limit },
        { $unset: ["_catalogCapacity", "_catalogDiscount"] },
      ],
      total: [{ $count: "count" }],
    },
  });
  const [result] = await Product.aggregate<{
    items: object[];
    total: { count: number }[];
  }>(pipeline);
  return { records: result?.items ?? [], total: result?.total[0]?.count ?? 0 };
}

export async function getProductFilterOptions(): Promise<ProductFilterOptionsDTO> {
  await connectDB();
  const [result] = await Product.aggregate<{
    attributes: { _id: string; values: string[] }[];
    price: { max: number }[];
  }>([
    { $match: { isActive: true } },
    {
      $facet: {
        attributes: [
          { $unwind: "$attributes" },
          { $match: { "attributes.key": { $in: ["برند", "رده انرژی"] } } },
          {
            $group: {
              _id: "$attributes.key",
              values: { $addToSet: "$attributes.value" },
            },
          },
        ],
        price: [{ $group: { _id: null, max: { $max: "$price" } } }],
      },
    },
  ]);
  const values = (key: string) =>
    (
      result?.attributes.find((attribute) => attribute._id === key)?.values ??
      []
    )
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "fa"));
  return {
    brands: values("برند"),
    energies: values("رده انرژی"),
    maxPrice: result?.price[0]?.max ?? 0,
  };
}

export async function listProducts(
  input: ProductQueryInput,
): Promise<PaginatedResult<StoreProductDTO>> {
  await connectDB();
  const filter = storefrontFilter(input);
  const { records, total } = await queryProductRecords(input, filter);
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
  const { records, total } = await queryProductRecords(input, filter);
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
