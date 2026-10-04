import "server-only";
import { compare, hash } from "bcryptjs";
import { profileSchema, changePasswordSchema } from "@/validations/account";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { toDTO } from "@/lib/model-shared";
import { User } from "@/models/user";
import { objectIdSchema } from "@/validations/common";
import { addressSchema } from "@/validations/address";
import type { AddressDTO } from "@/types/dto";

export async function getCheckoutAddresses(
  userId: string,
): Promise<AddressDTO[]> {
  await connectDB();
  const user = await User.findOne({
    _id: objectIdSchema.parse(userId),
    isActive: true,
  })
    .select("addresses")
    .lean();
  if (!user) throw new AppError("کاربر پیدا نشد", "NOT_FOUND");
  return user.addresses.map((address) => toDTO(address));
}

export async function addAddress(
  userId: string,
  input: unknown,
): Promise<AddressDTO[]> {
  const user = objectIdSchema.parse(userId);
  const data = addressSchema.parse(input);
  await connectDB();
  const id = new Types.ObjectId();
  // Checkout additions never replace the existing default address.
  const updated = await User.findOneAndUpdate(
    { _id: user, isActive: true, $expr: { $lt: [{ $size: "$addresses" }, 5] } },
    { $push: { addresses: { ...data, _id: id, isDefault: false } } },
    { returnDocument: "after", runValidators: true },
  )
    .select("addresses")
    .lean();
  if (!updated)
    throw new AppError(
      "افزودن آدرس ممکن نیست؛ حداکثر ۵ آدرس مجاز است",
      "CONFLICT",
    );
  return updated.addresses.map((address) => toDTO(address));
}

export async function getProfile(userId: string) {
  await connectDB();
  const user = await User.findOne({
    _id: objectIdSchema.parse(userId),
    isActive: true,
  }).lean();
  if (!user) throw new AppError("کاربر پیدا نشد", "NOT_FOUND");
  return toDTO(user);
}
export async function updateProfile(userId: string, input: unknown) {
  const data = profileSchema.parse(input);
  await connectDB();
  try {
    const user = await User.findOneAndUpdate(
      { _id: objectIdSchema.parse(userId), isActive: true },
      {
        $set: {
          name: data.name,
          ...(data.mobile ? { mobile: data.mobile } : {}),
        },
        ...(!data.mobile ? { $unset: { mobile: 1 } } : {}),
      },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!user) throw new AppError("کاربر پیدا نشد", "NOT_FOUND");
    return toDTO(user);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === 11000)
      throw new AppError("این شمارهٔ موبایل قبلاً ثبت شده است", "CONFLICT");
    throw error;
  }
}
export async function changePassword(userId: string, input: unknown) {
  const data = changePasswordSchema.parse(input);
  await connectDB();
  const user = await User.findOne({
    _id: objectIdSchema.parse(userId),
    isActive: true,
  })
    .select("+passwordHash")
    .lean();
  if (!user || !(await compare(data.currentPassword, user.passwordHash)))
    throw new AppError("رمز عبور فعلی صحیح نیست", "VALIDATION");
  const result = await User.updateOne(
    { _id: user._id, isActive: true, passwordHash: user.passwordHash },
    { $set: { passwordHash: await hash(data.password, 12) } },
  );
  if (!result.modifiedCount)
    throw new AppError("رمز تغییر کرده است؛ دوباره تلاش کنید", "CONFLICT");
}
export async function manageAddress(
  userId: string,
  operation: "edit" | "delete" | "default",
  id: string,
  input: unknown = {},
) {
  const owner = objectIdSchema.parse(userId);
  const addressId = objectIdSchema.parse(id);
  await connectDB();
  const filter = { _id: owner, isActive: true, "addresses._id": addressId };
  let updated;
  if (operation === "delete") {
    updated = await User.findOneAndUpdate(
      filter,
      { $pull: { addresses: { _id: addressId } } },
      { returnDocument: "after" },
    ).lean();
  } else if (operation === "default") {
    // One atomic pipeline prevents concurrent requests from creating two defaults.
    updated = await User.findOneAndUpdate(
      filter,
      [
        {
          $set: {
            addresses: {
              $map: {
                input: "$addresses",
                as: "address",
                in: {
                  $mergeObjects: [
                    "$$address",
                    {
                      isDefault: {
                        $eq: ["$$address._id", new Types.ObjectId(addressId)],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      ],
      { returnDocument: "after", updatePipeline: true },
    ).lean();
  } else {
    const { isDefault: _isDefault, ...data } = addressSchema.parse(input);
    void _isDefault;
    const fields = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [`addresses.$.${key}`, value]),
    );
    updated = await User.findOneAndUpdate(
      filter,
      { $set: fields },
      { returnDocument: "after", runValidators: true },
    ).lean();
  }
  if (!updated) throw new AppError("آدرس پیدا نشد", "NOT_FOUND");
  return toDTO(updated).addresses;
}
