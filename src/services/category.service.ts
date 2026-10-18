import "server-only";

import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { toDTO } from "@/lib/model-shared";
import { createUniqueSlug } from "@/lib/slug";
import { Category } from "@/models/category";
import { Product } from "@/models/product";
import type {
  CategoryDTO,
  CategoryTreeDTO,
  StoreCategoryDTO,
} from "@/types/dto";
import type { CategoryInput } from "@/validations/category";

function asCategoryDTO(record: object): CategoryDTO {
  return toDTO(record) as CategoryDTO;
}

async function ensureParent(parent?: string, currentId?: string) {
  if (!parent) return;
  if (parent === currentId)
    throw new AppError("دسته‌بندی نمی‌تواند والد خودش باشد", "VALIDATION");
  const parentCategory = await Category.findOne({
    _id: parent,
  })
    .lean()
    .orFail(() => new AppError("دسته‌بندی والد پیدا نشد", "NOT_FOUND"));
  if (parentCategory.parent)
    throw new AppError(
      "دسته‌بندی فقط می‌تواند یک سطح زیرمجموعه داشته باشد",
      "VALIDATION",
    );
  if (currentId && (await Category.exists({ parent: currentId })))
    throw new AppError(
      "دسته‌بندی دارای زیردسته نمی‌تواند والد داشته باشد",
      "VALIDATION",
    );
}

export async function listCategoriesAdmin(): Promise<CategoryDTO[]> {
  await connectDB();
  return (await Category.find().sort({ order: 1, name: 1 }).lean()).map(
    asCategoryDTO,
  );
}

export async function getCategoryAdmin(
  id: string,
): Promise<CategoryDTO | null> {
  await connectDB();
  const record = await Category.findById(id).lean();
  return record ? asCategoryDTO(record) : null;
}

export async function listCategories(): Promise<CategoryDTO[]> {
  await connectDB();
  const records = await Category.find({ isActive: true })
    .sort({ order: 1, name: 1 })
    .lean();
  return records.map(asCategoryDTO);
}

export async function listStoreCategories(): Promise<StoreCategoryDTO[]> {
  const categories = await listCategories();
  const counts = await Product.aggregate<{
    _id: Types.ObjectId;
    count: number;
  }>([
    {
      $match: {
        isActive: true,
        category: {
          $in: categories.map((category) => new Types.ObjectId(category.id)),
        },
      },
    },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  const countById = new Map(
    counts.map((item) => [String(item._id), item.count]),
  );
  return categories.map((category) => ({
    ...category,
    productCount: countById.get(category.id) ?? 0,
  }));
}

export async function getCategoryTree(): Promise<CategoryTreeDTO[]> {
  const categories = await listCategories();
  const children = new Map<string, CategoryTreeDTO[]>();
  for (const category of categories) {
    if (!category.parent) continue;
    const siblings = children.get(category.parent) ?? [];
    siblings.push({ ...category, children: [] });
    children.set(category.parent, siblings);
  }
  return categories
    .filter((category) => !category.parent)
    .map((category) => ({
      ...category,
      children: children.get(category.id) ?? [],
    }));
}

export async function getCategoryBySlug(
  slug: string,
): Promise<CategoryDTO | null> {
  await connectDB();
  const record = await Category.findOne({ slug, isActive: true }).lean();
  return record ? asCategoryDTO(record) : null;
}

export async function createCategory(
  input: CategoryInput,
): Promise<CategoryDTO> {
  await connectDB();
  await ensureParent(input.parent);
  const slug =
    input.slug ??
    (await createUniqueSlug(input.name, (candidate) =>
      Category.exists({ slug: candidate }).then(Boolean),
    ));
  try {
    const category = await Category.create({ ...input, slug });
    return asCategoryDTO(category.toObject());
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    )
      throw new AppError("نام یا نامک دسته‌بندی تکراری است", "CONFLICT");
    throw error;
  }
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
): Promise<CategoryDTO> {
  await connectDB();
  await ensureParent(input.parent, id);
  const slug =
    input.slug ??
    (await createUniqueSlug(input.name, (candidate) =>
      Category.exists({ slug: candidate, _id: { $ne: id } }).then(Boolean),
    ));
  try {
    const category = await Category.findByIdAndUpdate(
      id,
      {
        $set: { ...input, slug },
        $unset: Object.fromEntries(
          (["parent", "description", "image"] as const)
            .filter((field) => input[field] === undefined)
            .map((field) => [field, 1]),
        ),
      },
      { returnDocument: "after", runValidators: true },
    )
      .lean()
      .orFail(() => new AppError("دسته‌بندی پیدا نشد", "NOT_FOUND"));
    return asCategoryDTO(category);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    )
      throw new AppError("نام یا نامک دسته‌بندی تکراری است", "CONFLICT");
    throw error;
  }
}

export async function deleteCategory(id: string): Promise<void> {
  await connectDB();
  const categoryId = new Types.ObjectId(id);
  const [child, product] = await Promise.all([
    Category.exists({ parent: categoryId }),
    // Aggregation preserves legacy string references instead of casting them to ObjectId.
    Product.aggregate<{ _id: Types.ObjectId }>([
      { $match: { category: { $in: [categoryId, id] } } },
      { $limit: 1 },
      { $project: { _id: 1 } },
    ]).then((products) => products.length > 0),
  ]);
  if (child || product)
    throw new AppError(
      "دسته‌بندی دارای محصول یا زیردسته قابل حذف نیست",
      "CONFLICT",
    );
  const result = await Category.deleteOne({ _id: categoryId });
  if (!result.deletedCount)
    throw new AppError("دسته‌بندی پیدا نشد", "NOT_FOUND");
}
