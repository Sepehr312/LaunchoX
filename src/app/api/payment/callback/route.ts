import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { paymentCallbackSchema } from "@/validations/order";
import { completePayment } from "@/services/payment/payment.service";

export async function GET(request: Request) {
  const parsed = paymentCallbackSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "اطلاعات پرداخت معتبر نیست" },
      { status: 400 },
    );
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "ابتدا وارد حساب شوید" },
      { status: 401 },
    );
  try {
    const order = await completePayment(user.id, parsed.data);
    revalidatePath("/", "layout");
    return NextResponse.redirect(
      new URL(`/checkout/result?order=${order.orderNumber}`, request.url),
      303,
    );
  } catch (error: unknown) {
    if (error instanceof AppError)
      return NextResponse.json(
        { error: error.message },
        {
          status: {
            NOT_FOUND: 404,
            FORBIDDEN: 403,
            CONFLICT: 409,
            VALIDATION: 400,
            OUT_OF_STOCK: 409,
          }[error.code],
        },
      );
    console.error("Payment callback failed", error);
    return NextResponse.json(
      { error: "خطایی رخ داد، دوباره تلاش کنید" },
      { status: 500 },
    );
  }
}
