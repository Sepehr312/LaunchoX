import "server-only";

import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { toDTO } from "@/lib/model-shared";
import { createUniqueSlug } from "@/lib/slug";
import { Brand } from "@/models/brand";
import { Product } from "@/models/product";
import type { BrandDTO } from "@/types/dto";
import {
  brandIdSchema,
  createBrandSchema,
  updateBrandSchema,
} from "@/validations/brand";

function rethrowBrandError(error: unknown): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  )
    throw new AppError("نام یا نامک برند تکراری است", "CONFLICT");
  throw error;
}

export async function listBrands(): Promise<BrandDTO[]> {
  await connectDB();
  const brands = await Brand.find().sort({ order: 1, name: 1 }).lean();
  return brands.map((brand) => toDTO(brand));
}

export async function getBrand(rawId: unknown): Promise<BrandDTO | null> {
  const id = brandIdSchema.parse(rawId);
  await connectDB();
  const brand = await Brand.findById(id).lean();
  return brand ? toDTO(brand) : null;
}

export async function createBrand(rawInput: unknown): Promise<BrandDTO> {
  const input = createBrandSchema.parse(rawInput);
  await connectDB();
  const slug =
    input.slug ??
    (await createUniqueSlug(input.name, (candidate) =>
      Brand.exists({ slug: candidate }).then(Boolean),
    ));
  try {
    const brand = await Brand.create({ ...input, slug });
    return toDTO(brand.toObject());
  } catch (error: unknown) {
    rethrowBrandError(error);
  }
}

export async function updateBrand(
  rawId: unknown,
  rawInput: unknown,
): Promise<BrandDTO> {
  const id = brandIdSchema.parse(rawId);
  const input = updateBrandSchema.parse(rawInput);
  await connectDB();
  const slug =
    input.slug ??
    (await createUniqueSlug(input.name, (candidate) =>
      Brand.exists({ slug: candidate, _id: { $ne: id } }).then(Boolean),
    ));
  const optionalFields = ["logo", "description", "country", "website"] as const;
  try {
    const brand = await Brand.findByIdAndUpdate(
      id,
      {
        $set: Object.fromEntries(
          Object.entries({ ...input, slug }).filter(
            ([, value]) => value !== undefined,
          ),
        ),
        $unset: Object.fromEntries(
          optionalFields
            .filter((field) => input[field] === undefined)
            .map((field) => [field, 1]),
        ),
      },
      { returnDocument: "after", runValidators: true },
    )
      .lean()
      .orFail(() => new AppError("برند پیدا نشد", "NOT_FOUND"));
    return toDTO(brand);
  } catch (error: unknown) {
    rethrowBrandError(error);
  }
}

export async function deleteBrand(rawId: unknown): Promise<void> {
  const id = brandIdSchema.parse(rawId);
  await connectDB();
  if (await Product.exists({ brand: id }))
    throw new AppError(
      "برند دارای محصول قابل حذف نیست؛ می‌توانید آن را غیرفعال کنید",
      "CONFLICT",
    );
  const result = await Brand.deleteOne({ _id: id });
  if (!result.deletedCount) throw new AppError("برند پیدا نشد", "NOT_FOUND");
}
