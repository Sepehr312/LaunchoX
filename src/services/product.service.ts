import "server-only";
import { withImageReferences } from "@/services/image-lifecycle.service";

import { Types, type PipelineStage } from "mongoose";
import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { toDTO } from "@/lib/model-shared";
import { createUniqueSlug } from "@/lib/slug";
import { Category } from "@/models/category";
import { Product } from "@/models/product";
import { Brand } from "@/models/brand";
import { brandIdSchema } from "@/validations/brand";
import { getStoreBrandBySlug } from "@/services/brand.service";
import { parseProductQuery, type StoreSearchParams } from "@/lib/product-query";
import type {
  PaginatedResult,
  ProductDTO,
  StoreProductDTO,
  ProductFilterOptionsDTO,
  CompareProductDTO,
} from "@/types/dto";
import type { ProductInput, ProductQueryInput } from "@/validations/product";
import { compareIdsSchema, compareSearchSchema } from "@/validations/compare";

const comparisonFields =
  "title slug price compareAtPrice stock sku images category brand attributes createdAt updatedAt";

export async function getComparisonProducts(
  input: unknown,
): Promise<CompareProductDTO[]> {
  const ids = compareIdsSchema.parse(input);
  if (!ids.length) return [];
  await connectDB();
  const records = await Product.find({
    _id: { $in: ids },
    isActive: true,
  })
    .select(comparisonFields)
    .lean();
  const products = await withCategories(records);
  return ids.flatMap((id) => products.filter((product) => product.id === id));
}

export async function searchComparisonProducts(
  input: unknown,
): Promise<{ items: CompareProductDTO[]; totalPages: number }> {
  const { q, page } = compareSearchSchema.parse(input);
  await connectDB();
  const pattern = new RegExp(escapedRegex(q), "i");
  const brands = q
    ? await Brand.find({ name: pattern, isActive: true }).select("_id").lean()
    : [];
  const filter = {
    isActive: true,
    ...(q
      ? {
          $or: [
            { title: pattern },
            { brand: { $in: brands.map((brand) => brand._id) } },
            { attributes: { $elemMatch: { key: "برند", value: pattern } } },
          ],
        }
      : {}),
  };
  const [records, total] = await Promise.all([
    Product.find(filter)
      .select(comparisonFields)
      .sort({ createdAt: -1, _id: 1 })
      .skip((page - 1) * 12)
      .limit(12)
      .lean(),
    Product.countDocuments(filter),
  ]);
  return {
    items: await withCategories(records),
    totalPages: Math.ceil(total / 12),
  };
}

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
  const brandIds = records.flatMap((record) =>
    "brand" in record && record.brand ? [String(record.brand)] : [],
  );
  const brands = await Brand.find({ _id: { $in: brandIds } })
    .select("name")
    .lean();
  const brandNames = new Map(
    brands.map((brand) => [String(brand._id), brand.name]),
  );
  const categoryMap = new Map(
    categories.map((record) => {
      const category = toDTO(record);
      return [
        category.id,
        { id: category.id, name: category.name, slug: category.slug },
      ];
    }),
  );
  return products.flatMap((product, index) => {
    const record = records[index];
    const name =
      "brand" in record ? brandNames.get(String(record.brand)) : undefined;
    if (name) {
      product.attributes = [
        ...product.attributes.filter((attribute) => attribute.key !== "برند"),
        {
          key: "برند",
          value: name,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        },
      ];
    }
    const category = categoryMap.get(product.category);
    return category ? [{ ...product, category }] : [];
  });
}

type ProductStoreFilter = {
  isActive?: boolean;
  category?: Types.ObjectId;
  brand?: Types.ObjectId | { $in: Types.ObjectId[] };
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

export async function getProductFilterOptions(
  brandId?: string,
): Promise<ProductFilterOptionsDTO> {
  await connectDB();
  const scope = {
    isActive: true,
    ...(brandId
      ? { brand: new Types.ObjectId(brandIdSchema.parse(brandId)) }
      : {}),
  };
  const [result] = await Product.aggregate<{
    attributes: { _id: string; values: string[] }[];
    price: { max: number }[];
  }>([
    { $match: scope },
    {
      $facet: {
        attributes: [
          { $unwind: "$attributes" },
          {
            $match: {
              $or: [
                { "attributes.key": "رده انرژی" },
                { "attributes.key": "برند", brand: null },
              ],
            },
          },
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
  const linkedIds = await Product.distinct("brand", scope);
  const brands = await Brand.find({ _id: { $in: linkedIds }, isActive: true })
    .select("name")
    .lean();
  return {
    brands: brandId
      ? []
      : [
          ...new Set([...brands.map((brand) => brand.name), ...values("برند")]),
        ].sort((a, b) => a.localeCompare(b, "fa")),
    energies: values("رده انرژی"),
    maxPrice: result?.price[0]?.max ?? 0,
  };
}

export async function listProducts(
  input: ProductQueryInput,
  scopeBrandId?: string,
): Promise<PaginatedResult<StoreProductDTO>> {
  await connectDB();
  const filter = storefrontFilter(input);
  if (scopeBrandId) {
    filter.brand = new Types.ObjectId(brandIdSchema.parse(scopeBrandId));
  } else if (input.brandSlug) {
    const brand = await Brand.findOne({ slug: input.brandSlug, isActive: true })
      .select("_id")
      .lean();
    filter.brand = brand ? brand._id : { $in: [] };
  }
  if (!scopeBrandId && input.brands?.length)
    await applyBrandNames(filter, input.brands);
  const { records, total } = await queryProductRecords(input, filter);
  return {
    items: await withCategories(records),
    page: input.page,
    limit: input.limit,
    total,
    totalPages: Math.ceil(total / input.limit),
  };
}

async function applyBrandNames(filter: ProductStoreFilter, names: string[]) {
  const brands = await Brand.find({ name: { $in: names }, isActive: true })
    .select("_id")
    .lean();
  filter.$and = [
    ...(filter.$and ?? []),
    {
      $or: [
        { brand: { $in: brands.map((brand) => brand._id) } },
        {
          brand: null,
          attributes: { $elemMatch: { key: "برند", value: { $in: names } } },
        },
      ],
    },
  ];
}

export async function listBrandProducts(
  slug: unknown,
  values: StoreSearchParams,
) {
  const brand = await getStoreBrandBySlug(slug);
  if (!brand) throw new AppError("برند پیدا نشد", "NOT_FOUND");
  const parsed = parseProductQuery({
    ...values,
    brandSlug: undefined,
    brands: undefined,
  });
  if (!parsed.success)
    throw new AppError(
      parsed.error.issues[0]?.message ?? "ورودی معتبر نیست",
      "VALIDATION",
    );
  return listProducts(parsed.data, brand.id);
}

export async function getBrandCategories(brandId: string) {
  await connectDB();
  const ids = await Product.distinct("category", {
    brand: brandIdSchema.parse(brandId),
    isActive: true,
  });
  const categories = await Category.find({ _id: { $in: ids }, isActive: true })
    .sort({ order: 1, name: 1 })
    .lean();
  return categories.map((category) => toDTO(category));
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

async function ensureBrand(
  brand: string | null | undefined,
  productId?: string,
) {
  if (!brand) return;
  const id = brandIdSchema.parse(brand);
  const record = await Brand.findById(id).select("isActive").lean();
  if (!record) throw new AppError("برند پیدا نشد", "NOT_FOUND");
  if (
    !record.isActive &&
    !(productId && (await Product.exists({ _id: productId, brand: id })))
  )
    throw new AppError(
      "برند غیرفعال برای اتصال جدید قابل انتخاب نیست",
      "VALIDATION",
    );
}

export async function createProduct(
  input: ProductInput & { brand?: string | null },
): Promise<StoreProductDTO> {
  await connectDB();
  await ensureCategory(input.category);
  await ensureBrand(input.brand);
  const slug =
    input.slug ??
    (await createUniqueSlug(input.title, (candidate) =>
      Product.exists({ slug: candidate }).then(Boolean),
    ));
  try {
    const product = await withImageReferences(input.images, (session) =>
      new Product({ ...input, slug, brand: input.brand || undefined }).save({
        session,
      }),
    );
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
  input: ProductInput & { brand?: string | null },
): Promise<StoreProductDTO> {
  await connectDB();
  await ensureCategory(input.category);
  await ensureBrand(input.brand, id);
  const slug =
    input.slug ??
    (await createUniqueSlug(input.title, (candidate) =>
      Product.exists({ slug: candidate, _id: { $ne: id } }).then(Boolean),
    ));
  const validationDocument = new Product({ ...input, slug });
  await validationDocument.validate();
  try {
    const product = await withImageReferences(input.images, (session) =>
      Product.findByIdAndUpdate(
        id,
        {
          $set: { ...input, slug },
          $unset: {
            ...(input.sku === undefined ? { sku: 1 } : {}),
            ...(input.compareAtPrice === undefined
              ? { compareAtPrice: 1 }
              : {}),
          },
        },
        { session, returnDocument: "after" },
      )
        .lean()
        .orFail(() => new AppError("محصول پیدا نشد", "NOT_FOUND")),
    );
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
  if (input.brands?.length) await applyBrandNames(filter, input.brands);
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
): Promise<(StoreProductDTO & { brand?: string }) | null> {
  await connectDB();
  const record = await Product.findById(id).lean();
  const product = record ? (await withCategories([record]))[0] : null;
  return product && record
    ? { ...product, brand: record.brand ? String(record.brand) : undefined }
    : null;
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
