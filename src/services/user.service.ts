import "server-only";
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
